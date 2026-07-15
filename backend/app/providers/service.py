from __future__ import annotations

import json
from datetime import UTC, datetime
from uuid import uuid4

import httpx
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.audit.schemas import AuditEventCreate
from app.audit.service import AuditService
from app.core.request_context import get_request_context
from app.db.models import LLMInteraction, LLMProvider, OpenAPISpec, Run, SettingsEntry
from collections.abc import AsyncIterator

from app.plugins.base import ExecutionContext, ExecutionResult, NormalizedPayload
from app.plugins.service import PluginService
from app.providers.schemas import ProviderCreate, ProviderModelPreviewRequest, ProviderRead, ProviderUpdate

KIND_TO_PLUGIN = {
    'openai_compatible': 'openai_compatible',
    'generic_openapi': 'generic_openapi',
    'mock': 'mock_provider',
}

SEED_PROVIDERS = [
    {
        'id': 'prv_demo_mock',
        'name': 'demo-mock',
        'plugin_id': 'mock_provider',
        'provider_kind': 'mock',
        'base_url': None,
        'default_model': 'mock-echo-v1',
        'auth_type': None,
        'secret_alias': None,
        'capabilities_json': json.dumps({
            'streaming': False,
            'json_mode': True,
            'usage_metrics': True,
            'conversation_state': False,
            'tools': False,
        }),
        'enabled': 1,
    },
    {
        'id': 'prv_ollama_local',
        'name': 'ollama-local',
        'plugin_id': 'openai_compatible',
        'provider_kind': 'openai_compatible',
        'base_url': 'http://localhost:11434/v1',
        'default_model': 'llama3.2:3b',
        'auth_type': None,
        'secret_alias': None,
        'capabilities_json': json.dumps({
            'streaming': True,
            'json_mode': True,
            'usage_metrics': True,
            'conversation_state': False,
            'tools': False,
        }),
        'enabled': 1,
    },
    {
        'id': 'prv_atlascloud',
        'name': 'atlascloud',
        'plugin_id': 'openai_compatible',
        'provider_kind': 'openai_compatible',
        'base_url': 'https://api.atlascloud.ai/v1',
        'default_model': 'qwen/qwen3.5-flash',
        'auth_type': 'bearer',
        'secret_alias': 'ATLASCLOUD_API_KEY',
        'capabilities_json': json.dumps({
            'streaming': True,
            'json_mode': True,
            'usage_metrics': True,
            'conversation_state': False,
            'tools': False,
        }),
        'enabled': 1,
    },
]


class ProviderService:
    def __init__(self, db: Session, plugin_service: PluginService):
        self.db = db
        self.plugin_service = plugin_service
        self.audit = AuditService(db)

    def seed_defaults(self) -> None:
        seeded_any = False
        for seed in SEED_PROVIDERS:
            row = self.db.get(LLMProvider, seed['id'])
            if row is not None:
                continue
            row = LLMProvider(
                id=seed['id'],
                name=seed['name'],
                plugin_id=seed['plugin_id'],
                provider_kind=seed['provider_kind'],
                base_url=seed['base_url'],
                default_model=seed['default_model'],
                auth_type=seed['auth_type'],
                secret_alias=seed['secret_alias'],
                capabilities_json=seed['capabilities_json'],
                enabled=seed['enabled'],
            )
            self.db.add(row)
            seeded_any = True
            self.audit.record(AuditEventCreate(
                action='provider.seeded',
                entity_type='provider',
                entity_id=row.id,
                after={'name': row.name, 'plugin_id': row.plugin_id, 'provider_kind': row.provider_kind},
                source='system',
            ))
        if seeded_any:
            self.db.commit()

    def list(self) -> list[ProviderRead]:
        rows = self.db.scalars(select(LLMProvider).order_by(LLMProvider.name)).all()
        return [self._to_read(row) for row in rows]

    def get(self, provider_id: str) -> ProviderRead:
        row = self.db.get(LLMProvider, provider_id)
        if row is None:
            raise HTTPException(status_code=404, detail='Provider not found')
        return self._to_read(row)

    def create(self, payload: ProviderCreate) -> ProviderRead:
        plugin_id = KIND_TO_PLUGIN.get(payload.kind, payload.kind)
        provider = LLMProvider(
            id=f'prv_{uuid4().hex}',
            name=payload.name,
            plugin_id=plugin_id,
            provider_kind=payload.kind,
            base_url=payload.base_url,
            default_model=payload.default_model,
            spec_id=payload.spec_id,
            operation_id=payload.operation_id,
            invoke_method=payload.invoke_method,
            invoke_path=payload.invoke_path,
            auth_type=payload.auth_strategy.type if payload.auth_strategy else None,
            secret_alias=payload.auth_strategy.secret_alias if payload.auth_strategy else None,
            request_template_json=json.dumps(payload.request_template) if payload.request_template is not None else None,
            response_extractors_json=json.dumps(payload.response_extractors) if payload.response_extractors is not None else None,
            capabilities_json=json.dumps(payload.capabilities or {}),
        )
        self.db.add(provider)
        self.db.flush()
        if payload.secret_value and provider.secret_alias:
            self._save_secret(provider.secret_alias, payload.secret_value)
        self.db.commit()
        self.db.refresh(provider)
        self.audit.record(AuditEventCreate(
            action='provider.created',
            entity_type='provider',
            entity_id=provider.id,
            after=self._to_read(provider).model_dump(),
        ))
        return self._to_read(provider)

    def update(self, provider_id: str, payload: ProviderUpdate) -> ProviderRead:
        row = self.db.get(LLMProvider, provider_id)
        if row is None:
            raise HTTPException(status_code=404, detail='Provider not found')
        before = self._to_read(row).model_dump()
        supplied_fields = payload.model_fields_set

        scalar_fields = ['name', 'default_model', 'base_url', 'spec_id', 'invoke_method', 'invoke_path', 'operation_id']
        for field in scalar_fields:
            if field in supplied_fields:
                setattr(row, field, getattr(payload, field))

        if 'kind' in supplied_fields:
            row.provider_kind = payload.kind or row.provider_kind
            row.plugin_id = KIND_TO_PLUGIN.get(row.provider_kind, row.provider_kind)

        if 'enabled' in supplied_fields:
            row.enabled = 1 if payload.enabled else 0

        prior_secret_alias = row.secret_alias

        if 'auth_strategy' in supplied_fields:
            if payload.auth_strategy is None:
                row.auth_type = None
                row.secret_alias = None
            else:
                row.auth_type = payload.auth_strategy.type
                row.secret_alias = payload.auth_strategy.secret_alias

        if 'secret_value' in supplied_fields:
            if not row.secret_alias:
                raise HTTPException(status_code=400, detail='Set a secret alias before saving a token')
            if payload.secret_value:
                self._save_secret(row.secret_alias, payload.secret_value)

        if 'clear_saved_secret' in supplied_fields and payload.clear_saved_secret and row.secret_alias:
            self._delete_secret(row.secret_alias)

        if prior_secret_alias and prior_secret_alias != row.secret_alias:
            self._move_secret(prior_secret_alias, row.secret_alias)

        if 'request_template' in supplied_fields:
            row.request_template_json = json.dumps(payload.request_template) if payload.request_template is not None else None

        if 'response_extractors' in supplied_fields:
            row.response_extractors_json = json.dumps(payload.response_extractors) if payload.response_extractors is not None else None

        if 'capabilities' in supplied_fields:
            row.capabilities_json = json.dumps(payload.capabilities) if payload.capabilities is not None else '{}'

        row.updated_at = datetime.now(UTC).isoformat()
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        self.audit.record(AuditEventCreate(
            action='provider.updated',
            entity_type='provider',
            entity_id=row.id,
            before=before,
            after=self._to_read(row).model_dump(),
        ))
        return self._to_read(row)

    def delete(self, provider_id: str) -> dict[str, bool]:
        row = self.db.get(LLMProvider, provider_id)
        if row is None:
            raise HTTPException(status_code=404, detail='Provider not found')
        before = self._to_read(row).model_dump()
        self.db.delete(row)
        self.db.commit()
        self.audit.record(AuditEventCreate(
            action='provider.deleted',
            entity_type='provider',
            entity_id=provider_id,
            before=before,
        ))
        return {'ok': True}

    async def test(self, provider_id: str) -> dict:
        row = self.db.get(LLMProvider, provider_id)
        if row is None:
            raise HTTPException(status_code=404, detail='Provider not found')
        run = Run(
            id=f'run_{uuid4().hex}',
            run_type='provider_test',
            source='ui',
            status='running',
            provider_id=row.id,
            summary=f'Testing provider {row.name}',
            started_at=datetime.now(UTC).isoformat(),
        )
        self.db.add(run)
        self.db.commit()
        plugin = self.plugin_service.instantiate(row.plugin_id, config=self._provider_config(row))
        result = await plugin.healthcheck()
        row.last_tested_at = datetime.now(UTC).isoformat()
        row.last_test_result_json = json.dumps(result)
        run.status = 'success' if result.get('ok', False) else 'failed'
        run.finished_at = datetime.now(UTC).isoformat()
        run.summary = result.get('message') or run.summary
        self.db.add_all([row, run])
        self.db.commit()
        audit_row = self.audit.record(AuditEventCreate(
            action='provider.tested',
            entity_type='provider',
            entity_id=row.id,
            status='success' if result.get('ok', False) else 'failed',
            after=result,
            run_id=run.id,
        ))
        result['audit_id'] = audit_row.id
        result['run_id'] = run.id
        return result

    async def list_models(self, provider_id: str) -> dict:
        row = self.db.get(LLMProvider, provider_id)
        if row is None:
            raise HTTPException(status_code=404, detail='Provider not found')
        return await self._list_models_from_config(provider_id, self._provider_config(row), row.plugin_id, row.base_url)

    async def preview_models(self, payload: ProviderModelPreviewRequest) -> dict:
        plugin_id = KIND_TO_PLUGIN.get(payload.kind, payload.kind)
        auth = None
        if payload.auth_strategy:
            auth = payload.auth_strategy.model_dump(exclude_none=True)
            if payload.secret_value:
                auth['secret_value'] = payload.secret_value
        config = {
            'kind': payload.kind,
            'base_url': payload.base_url,
            'auth_strategy': auth,
        }
        return await self._list_models_from_config('draft', config, plugin_id, payload.base_url)

    async def _list_models_from_config(self, provider_id: str, config: dict, plugin_id: str, base_url: str | None) -> dict:
        if plugin_id != 'openai_compatible':
            return {
                'ok': False,
                'provider_id': provider_id,
                'models': [],
                'source': 'unsupported',
                'message': 'Model listing is currently supported for OpenAI-compatible providers only.',
            }

        auth = config.get('auth_strategy') or {}
        secret_value = auth.get('secret_value')
        headers = {'Content-Type': 'application/json'}
        if auth.get('type') == 'bearer' and secret_value:
            headers['Authorization'] = f'Bearer {secret_value}'
        elif auth.get('type') == 'custom_header' and secret_value:
            headers[auth.get('header_name') or 'X-API-Key'] = secret_value

        if not base_url:
            return {
                'ok': False,
                'provider_id': provider_id,
                'models': [],
                'source': 'config',
                'message': 'Provider base URL is not configured.',
            }

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.get(f"{base_url.rstrip('/')}/models", headers=headers)
            raw = response.json() if response.headers.get('content-type', '').startswith('application/json') else {'text': response.text}
            if not response.is_success:
                message = self._model_list_error_message(response.status_code, raw, response.text)
                return {
                    'ok': False,
                    'provider_id': provider_id,
                    'models': [],
                    'source': 'remote',
                    'message': message,
                }
            models = self._extract_model_ids(raw)
            return {
                'ok': True,
                'provider_id': provider_id,
                'models': models,
                'source': 'remote',
                'message': f'Loaded {len(models)} models.',
            }
        except Exception as exc:  # noqa: BLE001
            return {
                'ok': False,
                'provider_id': provider_id,
                'models': [],
                'source': 'exception',
                'message': str(exc),
            }

    async def invoke_stream(self, provider_id: str, request_payload: dict) -> AsyncIterator[dict]:
        row = self.db.get(LLMProvider, provider_id)
        if row is None:
            raise HTTPException(status_code=404, detail='Provider not found')
        requested_run_id = request_payload.get('run_id')
        run = self.db.get(Run, requested_run_id) if requested_run_id else None
        merged_metadata = {'model': request_payload.get('model') or row.default_model}
        if run is not None and run.metadata_json:
            try:
                merged_metadata = {**json.loads(run.metadata_json), **merged_metadata}
            except Exception:
                pass
        if run is None:
            run = Run(
                id=requested_run_id or f'run_{uuid4().hex}',
                run_type='provider_invoke',
                source='ui',
                status='running',
                provider_id=row.id,
                summary=f'Invoking provider {row.name}',
                started_at=datetime.now(UTC).isoformat(),
                metadata_json=json.dumps(merged_metadata),
            )
        else:
            run.provider_id = row.id
            run.status = 'running'
            run.summary = f'Invoking provider {row.name}'
            run.metadata_json = json.dumps(merged_metadata)
            if not run.started_at:
                run.started_at = datetime.now(UTC).isoformat()
        self.db.add(run)
        self.db.commit()
        plugin = self.plugin_service.instantiate(row.plugin_id, config=self._provider_config(row))
        context = get_request_context()
        execution_context = ExecutionContext(
            actor=context.actor,
            source=context.source,
            correlation_id=context.correlation_id,
            request_id=context.request_id,
            run_id=run.id,
        )
        accumulated_result: ExecutionResult | None = None
        async for event in plugin.invoke_stream(request_payload, execution_context):
            if event.get('event') == 'done' and isinstance(event.get('result'), ExecutionResult):
                accumulated_result = event['result']
            yield {**event, 'run_id': run.id}
        if accumulated_result is None:
            run.status = 'failed'
            run.summary = 'Streaming provider did not return a final result'
            run.error_text = 'missing_stream_result'
            run.finished_at = datetime.now(UTC).isoformat()
            self.db.add(run)
            self.db.commit()
            return
        result = accumulated_result
        run.status = 'success' if result.status == 'success' else 'failed'
        run.summary = result.summary
        run.error_text = result.error
        run.finished_at = datetime.now(UTC).isoformat()
        interaction = LLMInteraction(
            id=f'llm_{uuid4().hex}',
            run_id=run.id,
            provider_id=row.id,
            model_name=request_payload.get('model') or row.default_model,
            request_json=json.dumps(self._sanitize_request_payload(request_payload)),
            response_json=json.dumps(self._sanitize_response_payload(result)),
            prompt_tokens=result.metrics.get('prompt_tokens'),
            completion_tokens=result.metrics.get('completion_tokens'),
            total_tokens=result.metrics.get('total_tokens'),
            latency_ms=result.metrics.get('latency_ms'),
            finish_reason=(result.raw or {}).get('finish_reason') or result.metrics.get('finish_reason'),
        )
        self.db.add_all([run, interaction])
        self.db.commit()
        audit_row = self.audit.record(AuditEventCreate(
            action='llm.invoked',
            entity_type='provider',
            entity_id=row.id,
            status='success' if result.status == 'success' else 'failed',
            metadata={'summary': result.summary, 'streaming': True},
            after=self._sanitize_response_payload(result),
            run_id=run.id,
        ))
        yield {
            'event': 'finalized',
            'summary': result.summary,
            'status': result.status,
            'payload': {
                'type': result.payload.type if result.payload else 'text_bundle',
                'title': result.payload.title if result.payload else 'LLM output',
                'items': result.payload.items if result.payload else [],
                'metadata': result.payload.metadata if result.payload else {},
            },
            'raw': result.raw or {},
            'metrics': result.metrics,
            'warnings': result.warnings,
            'audit_id': audit_row.id,
            'run_id': run.id,
        }

    async def invoke(self, provider_id: str, request_payload: dict) -> dict:
        row = self.db.get(LLMProvider, provider_id)
        if row is None:
            raise HTTPException(status_code=404, detail='Provider not found')
        requested_run_id = request_payload.get('run_id')
        run = self.db.get(Run, requested_run_id) if requested_run_id else None
        merged_metadata = {'model': request_payload.get('model') or row.default_model}
        if run is not None and run.metadata_json:
            try:
                merged_metadata = {**json.loads(run.metadata_json), **merged_metadata}
            except Exception:  # noqa: BLE001
                pass
        if run is None:
            run = Run(
                id=requested_run_id or f'run_{uuid4().hex}',
                run_type='provider_invoke',
                source='ui',
                status='running',
                provider_id=row.id,
                summary=f'Invoking provider {row.name}',
                started_at=datetime.now(UTC).isoformat(),
                metadata_json=json.dumps(merged_metadata),
            )
        else:
            run.provider_id = row.id
            run.status = 'running'
            run.summary = f'Invoking provider {row.name}'
            run.metadata_json = json.dumps(merged_metadata)
            if not run.started_at:
                run.started_at = datetime.now(UTC).isoformat()
        self.db.add(run)
        self.db.commit()
        plugin = self.plugin_service.instantiate(row.plugin_id, config=self._provider_config(row))
        context = get_request_context()
        execution_context = ExecutionContext(
            actor=context.actor,
            source=context.source,
            correlation_id=context.correlation_id,
            request_id=context.request_id,
            run_id=run.id,
        )
        result: ExecutionResult = await plugin.invoke(request_payload, execution_context)
        run.status = 'success' if result.status == 'success' else 'failed'
        run.summary = result.summary
        run.error_text = result.error
        run.finished_at = datetime.now(UTC).isoformat()
        interaction = LLMInteraction(
            id=f'llm_{uuid4().hex}',
            run_id=run.id,
            provider_id=row.id,
            model_name=request_payload.get('model') or row.default_model,
            request_json=json.dumps(self._sanitize_request_payload(request_payload)),
            response_json=json.dumps(self._sanitize_response_payload(result)),
            prompt_tokens=result.metrics.get('prompt_tokens'),
            completion_tokens=result.metrics.get('completion_tokens'),
            total_tokens=result.metrics.get('total_tokens'),
            latency_ms=result.metrics.get('latency_ms'),
            finish_reason=(result.raw or {}).get('finish_reason') or result.metrics.get('finish_reason'),
        )
        self.db.add_all([run, interaction])
        self.db.commit()
        audit_row = self.audit.record(AuditEventCreate(
            action='llm.invoked',
            entity_type='provider',
            entity_id=row.id,
            status='success' if result.status == 'success' else 'failed',
            metadata={'summary': result.summary},
            after=self._sanitize_response_payload(result),
            run_id=run.id,
        ))
        payload = result.payload or NormalizedPayload(type='text_bundle', title='LLM output', items=[])
        return {
            'summary': result.summary,
            'status': result.status,
            'payload': {
                'type': payload.type,
                'title': payload.title,
                'items': payload.items,
                'metadata': payload.metadata,
            },
            'raw': result.raw or {},
            'metrics': result.metrics,
            'warnings': result.warnings,
            'audit_id': audit_row.id,
            'run_id': run.id,
        }

    @staticmethod
    def _extract_model_ids(raw: object) -> list[str]:
        if not isinstance(raw, dict):
            return []
        data = raw.get('data')
        if not isinstance(data, list):
            return []
        models: list[str] = []
        for item in data:
            if isinstance(item, dict):
                model_id = item.get('id')
                if isinstance(model_id, str) and model_id:
                    models.append(model_id)
        return sorted(set(models))

    @staticmethod
    def _model_list_error_message(status_code: int, raw: object, fallback_text: str) -> str:
        if isinstance(raw, dict):
            error = raw.get('error')
            if isinstance(error, dict):
                message = error.get('message') or error.get('code') or error.get('type')
                if message:
                    return f'Failed to load models (HTTP {status_code}): {message}'
            message = raw.get('message') or raw.get('detail')
            if isinstance(message, str) and message:
                return f'Failed to load models (HTTP {status_code}): {message}'
        trimmed = (fallback_text or '').strip()[:300]
        return f'Failed to load models (HTTP {status_code})' + (f': {trimmed}' if trimmed else '')

    @staticmethod
    def _sanitize_request_payload(request_payload: dict) -> dict:
        sanitized = {
            'model': request_payload.get('model'),
            'run_id': request_payload.get('run_id'),
            'has_messages': bool(request_payload.get('messages')),
            'message_count': len(request_payload.get('messages') or []),
            'input_length': len(str(request_payload.get('input') or '')) if request_payload.get('input') is not None else 0,
            'has_system_prompt': bool(request_payload.get('system_prompt')),
            'variable_keys': sorted((request_payload.get('variables') or {}).keys()) if isinstance(request_payload.get('variables'), dict) else [],
            'payload_keys': sorted((request_payload.get('payload') or {}).keys()) if isinstance(request_payload.get('payload'), dict) else [],
            'max_output_tokens': request_payload.get('max_output_tokens'),
        }
        return sanitized

    @staticmethod
    def _sanitize_response_payload(result: ExecutionResult) -> dict:
        raw = result.raw if isinstance(result.raw, dict) else {}
        return {
            'status': result.status,
            'summary': result.summary,
            'error': result.error,
            'warnings': result.warnings,
            'metrics': result.metrics,
            'raw_keys': sorted(raw.keys()) if isinstance(raw, dict) else [],
            'has_usage': bool(raw.get('usage')) if isinstance(raw, dict) else False,
            'text_length': sum(len(str(item.get('text') or '')) for item in (result.payload.items if result.payload else []) if isinstance(item, dict)),
        }

    def _provider_config(self, row: LLMProvider) -> dict:
        spec_context = self._spec_context(row)
        return {
            'id': row.id,
            'name': row.name,
            'kind': row.provider_kind,
            'base_url': row.base_url,
            'default_model': row.default_model,
            'spec_id': row.spec_id,
            'operation_id': row.operation_id,
            'invoke_method': row.invoke_method,
            'invoke_path': row.invoke_path,
            'auth_strategy': {
                'type': row.auth_type,
                'secret_alias': row.secret_alias,
                'secret_value': self._resolve_secret_value(row.secret_alias),
            } if row.auth_type else None,
            'request_template': json.loads(row.request_template_json) if row.request_template_json else None,
            'response_extractors': json.loads(row.response_extractors_json) if row.response_extractors_json else None,
            'capabilities': json.loads(row.capabilities_json or '{}'),
            'spec_context': spec_context,
        }

    def _spec_context(self, row: LLMProvider) -> dict | None:
        if not row.spec_id:
            return None
        spec = self.db.get(OpenAPISpec, row.spec_id)
        if spec is None:
            return None
        operations = json.loads(spec.operations_json or '[]')
        operation = None
        if row.operation_id:
            operation = next((item for item in operations if item.get('operation_id') == row.operation_id), None)
        parsed = json.loads(spec.parsed_json or '{}') if spec.parsed_json else {}
        return {
            'spec_id': spec.id,
            'spec_name': spec.name,
            'security_schemes': json.loads(spec.security_schemes_json or '{}'),
            'global_security': parsed.get('security'),
            'operation_security': operation.get('security') if operation else None,
        }

    @staticmethod
    def _secret_setting_key(secret_alias: str) -> str:
        return f'secrets.{secret_alias}'

    def _resolve_secret_value(self, secret_alias: str | None) -> str | None:
        if not secret_alias:
            return None
        row = self.db.get(SettingsEntry, self._secret_setting_key(secret_alias))
        if row is not None:
            try:
                value = json.loads(row.value_json)
                if isinstance(value, str) and value:
                    return value
            except Exception:  # noqa: BLE001
                pass
        return None

    def _save_secret(self, secret_alias: str, secret_value: str) -> None:
        row = self.db.get(SettingsEntry, self._secret_setting_key(secret_alias)) or SettingsEntry(key=self._secret_setting_key(secret_alias))
        row.value_json = json.dumps(secret_value)
        self.db.add(row)

    def _delete_secret(self, secret_alias: str | None) -> None:
        if not secret_alias:
            return
        row = self.db.get(SettingsEntry, self._secret_setting_key(secret_alias))
        if row is not None:
            self.db.delete(row)

    def _move_secret(self, old_alias: str | None, new_alias: str | None) -> None:
        if not old_alias or old_alias == new_alias:
            return
        existing_value = self._resolve_secret_value(old_alias)
        self._delete_secret(old_alias)
        if existing_value and new_alias:
            self._save_secret(new_alias, existing_value)

    def _to_read(self, row: LLMProvider) -> ProviderRead:
        auth = None
        if row.auth_type:
            auth = {
                'type': row.auth_type,
                'secret_alias': row.secret_alias,
                'secret_configured': bool(self._resolve_secret_value(row.secret_alias)) if row.secret_alias else False,
            }
        return ProviderRead(
            id=row.id,
            name=row.name,
            kind=row.provider_kind,
            plugin_id=row.plugin_id,
            base_url=row.base_url,
            default_model=row.default_model,
            enabled=bool(row.enabled),
            spec_id=row.spec_id,
            operation_id=row.operation_id,
            invoke_method=row.invoke_method,
            invoke_path=row.invoke_path,
            auth_strategy=auth,
            capabilities=json.loads(row.capabilities_json or '{}'),
            request_template=json.loads(row.request_template_json) if row.request_template_json else None,
            response_extractors=json.loads(row.response_extractors_json) if row.response_extractors_json else None,
            last_tested_at=row.last_tested_at,
            last_test_result=json.loads(row.last_test_result_json) if row.last_test_result_json else None,
        )
