from __future__ import annotations

import json
from datetime import UTC, datetime
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.audit.schemas import AuditEventCreate
from app.audit.service import AuditService
from app.core.request_context import get_request_context
from app.db.models import LLMInteraction, LLMProvider, Run
from app.plugins.base import ExecutionContext, ExecutionResult, NormalizedPayload
from app.plugins.service import PluginService
from app.providers.schemas import ProviderCreate, ProviderRead, ProviderUpdate

KIND_TO_PLUGIN = {
    'openai_compatible': 'openai_compatible',
    'generic_openapi': 'generic_openapi',
}


class ProviderService:
    def __init__(self, db: Session, plugin_service: PluginService):
        self.db = db
        self.plugin_service = plugin_service
        self.audit = AuditService(db)

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
        for field in ['name', 'default_model', 'base_url', 'invoke_method', 'invoke_path', 'operation_id']:
            value = getattr(payload, field)
            if value is not None:
                setattr(row, field, value)
        if payload.enabled is not None:
            row.enabled = 1 if payload.enabled else 0
        if payload.auth_strategy is not None:
            row.auth_type = payload.auth_strategy.type
            row.secret_alias = payload.auth_strategy.secret_alias
        if payload.request_template is not None:
            row.request_template_json = json.dumps(payload.request_template)
        if payload.response_extractors is not None:
            row.response_extractors_json = json.dumps(payload.response_extractors)
        if payload.capabilities is not None:
            row.capabilities_json = json.dumps(payload.capabilities)
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

    async def invoke(self, provider_id: str, request_payload: dict) -> dict:
        row = self.db.get(LLMProvider, provider_id)
        if row is None:
            raise HTTPException(status_code=404, detail='Provider not found')
        requested_run_id = request_payload.get('run_id')
        run = self.db.get(Run, requested_run_id) if requested_run_id else None
        if run is None:
            run = Run(
                id=requested_run_id or f'run_{uuid4().hex}',
                run_type='provider_invoke',
                source='ui',
                status='running',
                provider_id=row.id,
                summary=f'Invoking provider {row.name}',
                started_at=datetime.now(UTC).isoformat(),
                metadata_json=json.dumps({'model': request_payload.get('model') or row.default_model}),
            )
        else:
            run.provider_id = row.id
            run.status = 'running'
            run.summary = f'Invoking provider {row.name}'
            run.metadata_json = json.dumps({'model': request_payload.get('model') or row.default_model})
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
            request_json=json.dumps(request_payload),
            response_json=json.dumps(result.raw or {}),
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
            after=result.raw or {},
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
    def _provider_config(row: LLMProvider) -> dict:
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
            } if row.auth_type else None,
            'request_template': json.loads(row.request_template_json) if row.request_template_json else None,
            'response_extractors': json.loads(row.response_extractors_json) if row.response_extractors_json else None,
            'capabilities': json.loads(row.capabilities_json or '{}'),
        }

    @staticmethod
    def _to_read(row: LLMProvider) -> ProviderRead:
        auth = None
        if row.auth_type:
            auth = {'type': row.auth_type, 'secret_alias': row.secret_alias}
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
