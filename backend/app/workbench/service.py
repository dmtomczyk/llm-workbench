from __future__ import annotations

import json
from collections.abc import AsyncIterator
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException
from jinja2 import Environment
from sqlalchemy.orm import Session

from app.audit.schemas import AuditEventCreate
from app.audit.service import AuditService
from app.db.models import DatasetVersion, Run, RunStep
from app.providers.service import ProviderService
from app.templates.service import TemplateService
from app.workbench.schemas import WorkbenchRunRequest, WorkbenchRunStatusResponse, WorkbenchRunStepRead


class WorkbenchService:
    def __init__(self, db: Session, provider_service: ProviderService):
        self.db = db
        self.provider_service = provider_service
        self.audit = AuditService(db)
        self.template_service = TemplateService(db)
        self.env = Environment(autoescape=False)
        self.env.filters['tojson'] = lambda value, indent=None: json.dumps(value, indent=indent, ensure_ascii=False)

    async def run(self, payload: WorkbenchRunRequest) -> dict:
        run, template = self._create_run(payload)
        try:
            normalized_payload = self._load_dataset_payload(payload.dataset_id)
            rendered = self._render_prompt(payload, template, normalized_payload)
            self._record_step(
                run.id,
                step_index=1,
                step_type='render',
                step_name='render_prompt',
                status='success',
                output=self._safe_prompt_preview(rendered),
                started_at=run.started_at,
            )
            provider_result = await self._invoke_provider(run.id, payload, rendered, normalized_payload)
            self._record_step(
                run.id,
                step_index=2,
                step_type='llm',
                step_name='invoke_provider',
                status='success' if provider_result['status'] == 'success' else 'failed',
                input_data={'system_prompt': rendered['system_prompt'], 'user_prompt': rendered['user_prompt']},
                output=provider_result,
                error_text=None if provider_result['status'] == 'success' else provider_result.get('summary'),
            )
            audit_id = self._finish_run(run.id, provider_result)
            return {
                'ok': True,
                'run_id': run.id,
                'audit_id': audit_id,
                'rendered_prompt': rendered,
                'provider_result': provider_result,
            }
        except HTTPException as exc:
            self._fail_run(run.id, exc.detail)
            raise
        except Exception as exc:  # noqa: BLE001
            self._fail_run(run.id, str(exc))
            raise HTTPException(status_code=500, detail=str(exc)) from exc

    async def stream_run(self, payload: WorkbenchRunRequest) -> AsyncIterator[str]:
        run, template = self._create_run(payload)
        yield self._sse('run_started', {'run_id': run.id, 'status': 'running'})
        try:
            self._set_run_summary(run.id, 'Loading dataset')
            yield self._sse('stage', {'run_id': run.id, 'stage': 'dataset', 'status': 'running', 'message': 'Loading dataset'})
            normalized_payload = self._load_dataset_payload(payload.dataset_id)
            yield self._sse('stage', {'run_id': run.id, 'stage': 'dataset', 'status': 'success', 'message': 'Dataset loaded'})

            self._set_run_summary(run.id, 'Rendering prompt')
            yield self._sse('stage', {'run_id': run.id, 'stage': 'render', 'status': 'running', 'message': 'Rendering prompt'})
            rendered = self._render_prompt(payload, template, normalized_payload)
            self._record_step(
                run.id,
                step_index=1,
                step_type='render',
                step_name='render_prompt',
                status='success',
                output=self._safe_prompt_preview(rendered),
                started_at=run.started_at,
            )
            yield self._sse('rendered', {'run_id': run.id, 'rendered_prompt': rendered})
            yield self._sse('stage', {'run_id': run.id, 'stage': 'render', 'status': 'success', 'message': 'Prompt rendered'})

            self._set_run_summary(run.id, 'Invoking provider')
            yield self._sse('stage', {'run_id': run.id, 'stage': 'provider', 'status': 'running', 'message': 'Invoking provider'})
            provider_result = await self._invoke_provider(run.id, payload, rendered, normalized_payload)
            self._record_step(
                run.id,
                step_index=2,
                step_type='llm',
                step_name='invoke_provider',
                status='success' if provider_result['status'] == 'success' else 'failed',
                input_data={'system_prompt': rendered['system_prompt'], 'user_prompt': rendered['user_prompt']},
                output=provider_result,
                error_text=None if provider_result['status'] == 'success' else provider_result.get('summary'),
            )
            yield self._sse('stage', {
                'run_id': run.id,
                'stage': 'provider',
                'status': 'success' if provider_result['status'] == 'success' else 'failed',
                'message': provider_result.get('summary'),
            })

            audit_id = self._finish_run(run.id, provider_result)
            yield self._sse('finished', {
                'ok': True,
                'run_id': run.id,
                'audit_id': audit_id,
                'rendered_prompt': rendered,
                'provider_result': provider_result,
            })
        except HTTPException as exc:
            self._fail_run(run.id, exc.detail)
            yield self._sse('error', {'run_id': run.id, 'message': str(exc.detail), 'detail': exc.detail})
        except Exception as exc:  # noqa: BLE001
            self._fail_run(run.id, str(exc))
            yield self._sse('error', {'run_id': run.id, 'message': str(exc)})

    def get_run_status(self, run_id: str) -> WorkbenchRunStatusResponse:
        run = self.db.get(Run, run_id)
        if run is None:
            raise HTTPException(status_code=404, detail='Run not found')
        steps = self.db.query(RunStep).filter(RunStep.run_id == run_id).order_by(RunStep.step_index.asc()).all()
        rendered_prompt = None
        provider_result = None
        for step in steps:
            output = json.loads(step.output_json) if step.output_json else None
            if step.step_name == 'render_prompt' and isinstance(output, dict):
                rendered_prompt = output
            if step.step_name == 'invoke_provider' and isinstance(output, dict):
                provider_result = output
        return WorkbenchRunStatusResponse(
            ok=True,
            run=self._run_to_dict(run),
            steps=[self._step_to_read(step) for step in steps],
            rendered_prompt=rendered_prompt,
            provider_result=provider_result,
        )

    def _create_run(self, payload: WorkbenchRunRequest) -> tuple[Run, object]:
        template = self.template_service.get(payload.template_id) if payload.template_id else self.template_service.get_by_slug(payload.template_slug or 'weekly_engineering_summary')
        run = Run(
            id=f'run_{uuid4().hex}',
            run_type='manual_workbench',
            source='ui',
            status='running',
            dataset_id=payload.dataset_id,
            provider_id=payload.provider_id,
            summary=f'Workbench run for dataset {payload.dataset_id}',
            started_at=datetime.now(UTC).isoformat(),
            metadata_json=json.dumps({'template_id': template.id, 'template_slug': template.slug, 'model': payload.model}),
        )
        self.db.add(run)
        self.db.commit()
        self.audit.record(AuditEventCreate(action='workbench.run_started', entity_type='run', entity_id=run.id, run_id=run.id, after={'dataset_id': payload.dataset_id, 'provider_id': payload.provider_id, 'template_id': template.id}))
        return run, template

    def _load_dataset_payload(self, dataset_id: str) -> dict:
        version = self.db.query(DatasetVersion).filter(DatasetVersion.dataset_id == dataset_id).order_by(DatasetVersion.version_no.desc()).first()
        if version is None or not version.normalized_payload_path:
            raise HTTPException(status_code=404, detail='Dataset version not found')
        return json.loads(Path(version.normalized_payload_path).read_text(encoding='utf-8'))

    def _render_prompt(self, payload: WorkbenchRunRequest, template: object, normalized_payload: dict) -> dict:
        rendered_system = payload.system_prompt_override if payload.system_prompt_override is not None else template.system_prompt
        rendered_user = payload.user_prompt_override if payload.user_prompt_override is not None else self.env.from_string(template.user_prompt_template).render(payload=normalized_payload, vars={**template.default_vars, **payload.variables})
        return {'system_prompt': rendered_system, 'user_prompt': rendered_user}

    async def _invoke_provider(self, run_id: str, payload: WorkbenchRunRequest, rendered: dict, normalized_payload: dict) -> dict:
        return await self.provider_service.invoke(payload.provider_id, {
            'run_id': run_id,
            'model': payload.model,
            'system_prompt': rendered['system_prompt'],
            'input': rendered['user_prompt'],
            'payload': normalized_payload,
            'variables': payload.variables,
        })

    @staticmethod
    def _safe_prompt_preview(rendered: dict[str, str | None]) -> dict:
        user_prompt = rendered.get('user_prompt') or ''
        system_prompt = rendered.get('system_prompt') or ''
        return {
            'has_system_prompt': bool(system_prompt),
            'system_prompt_length': len(system_prompt),
            'user_prompt_length': len(user_prompt),
            'user_prompt_preview': user_prompt[:500],
        }

    @staticmethod
    def _safe_provider_result(provider_result: dict) -> dict:
        payload = provider_result.get('payload') or {}
        items = payload.get('items') or []
        text_length = 0
        if isinstance(items, list):
            for item in items:
                if isinstance(item, dict):
                    text_length += len(str(item.get('text') or ''))
        return {
            'status': provider_result.get('status'),
            'summary': provider_result.get('summary'),
            'metrics': provider_result.get('metrics'),
            'warnings': provider_result.get('warnings'),
            'raw_keys': sorted((provider_result.get('raw') or {}).keys()) if isinstance(provider_result.get('raw'), dict) else [],
            'text_length': text_length,
        }

    def _record_step(
        self,
        run_id: str,
        *,
        step_index: int,
        step_type: str,
        step_name: str,
        status: str,
        input_data: dict | None = None,
        output: dict | None = None,
        error_text: str | None = None,
        started_at: str | None = None,
    ) -> None:
        now = datetime.now(UTC).isoformat()
        step = RunStep(
            id=f'rst_{uuid4().hex}',
            run_id=run_id,
            step_index=step_index,
            step_type=step_type,
            step_name=step_name,
            status=status,
            input_json=json.dumps(input_data) if input_data is not None else None,
            output_json=json.dumps(output) if output is not None else None,
            error_text=error_text,
            started_at=started_at or now,
            finished_at=now,
        )
        self.db.add(step)
        self.db.commit()

    def _set_run_summary(self, run_id: str, summary: str) -> None:
        run = self.db.get(Run, run_id)
        if run is None:
            return
        run.summary = summary
        self.db.add(run)
        self.db.commit()

    def _finish_run(self, run_id: str, provider_result: dict) -> str | None:
        run = self.db.get(Run, run_id)
        if run is None:
            return None
        run.status = 'success' if provider_result['status'] == 'success' else 'failed'
        run.summary = provider_result.get('summary')
        run.finished_at = datetime.now(UTC).isoformat()
        self.db.add(run)
        self.db.commit()
        audit = self.audit.record(AuditEventCreate(action='workbench.run_finished', entity_type='run', entity_id=run.id, run_id=run.id, status=run.status, after={'provider_result_status': provider_result['status']}))
        return audit.id

    def _fail_run(self, run_id: str, detail: object) -> None:
        run = self.db.get(Run, run_id)
        if run is None:
            return
        run.status = 'failed'
        run.error_text = str(detail)
        run.summary = str(detail)
        run.finished_at = datetime.now(UTC).isoformat()
        self.db.add(run)
        self.db.commit()
        self.audit.record(AuditEventCreate(action='workbench.run_finished', entity_type='run', entity_id=run.id, run_id=run.id, status='failed', message=str(detail)))

    @staticmethod
    def _run_to_dict(run: Run) -> dict:
        return {
            'id': run.id,
            'run_type': run.run_type,
            'source': run.source,
            'status': run.status,
            'dataset_id': run.dataset_id,
            'provider_id': run.provider_id,
            'summary': run.summary,
            'metadata': json.loads(run.metadata_json or '{}'),
            'error_text': run.error_text,
            'started_at': run.started_at,
            'finished_at': run.finished_at,
            'created_at': run.created_at,
        }

    @staticmethod
    def _step_to_read(step: RunStep) -> WorkbenchRunStepRead:
        return WorkbenchRunStepRead(
            id=step.id,
            step_index=step.step_index,
            step_type=step.step_type,
            step_name=step.step_name,
            status=step.status,
            input_json=json.loads(step.input_json) if step.input_json else None,
            output_json=json.loads(step.output_json) if step.output_json else None,
            metadata=json.loads(step.metadata_json or '{}'),
            error_text=step.error_text,
            started_at=step.started_at,
            finished_at=step.finished_at,
            created_at=step.created_at,
        )

    @staticmethod
    def _sse(event: str, data: dict) -> str:
        return f'event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n'
