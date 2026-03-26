from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException
from jinja2 import Environment
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.audit.schemas import AuditEventCreate
from app.audit.service import AuditService
from app.db.models import DatasetVersion, Run, RunStep, Workflow
from app.providers.service import ProviderService
from app.templates.service import TemplateService
from app.workflows.schemas import (
    WorkflowCreate,
    WorkflowRead,
    WorkflowRunRequest,
    WorkflowRunResponse,
    WorkflowRunStatusResponse,
    WorkflowRunStepRead,
    WorkflowUpdate,
)


class WorkflowService:
    def __init__(self, db: Session, provider_service: ProviderService):
        self.db = db
        self.provider_service = provider_service
        self.audit = AuditService(db)
        self.template_service = TemplateService(db)
        self.env = Environment(autoescape=False)
        self.env.filters['tojson'] = lambda value, indent=None: json.dumps(value, indent=indent, ensure_ascii=False)

    def list(self) -> list[WorkflowRead]:
        rows = self.db.scalars(select(Workflow).order_by(Workflow.name)).all()
        return [self._to_read(row) for row in rows]

    def get(self, workflow_id: str) -> WorkflowRead:
        row = self.db.get(Workflow, workflow_id)
        if row is None:
            raise HTTPException(status_code=404, detail='Workflow not found')
        return self._to_read(row)

    def create(self, payload: WorkflowCreate) -> WorkflowRead:
        self._validate_definition(payload.definition)
        row = Workflow(
            id=f'wf_{uuid4().hex}',
            slug=payload.slug,
            name=payload.name,
            description=payload.description,
            definition_json=json.dumps(payload.definition),
            enabled=1 if payload.enabled else 0,
            version_no=1,
        )
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        self.audit.record(AuditEventCreate(action='workflow.created', entity_type='workflow', entity_id=row.id, after=self._to_read(row).model_dump()))
        return self._to_read(row)

    def update(self, workflow_id: str, payload: WorkflowUpdate) -> WorkflowRead:
        row = self.db.get(Workflow, workflow_id)
        if row is None:
            raise HTTPException(status_code=404, detail='Workflow not found')
        before = self._to_read(row).model_dump()
        if payload.definition is not None:
            self._validate_definition(payload.definition)
            row.definition_json = json.dumps(payload.definition)
            row.version_no += 1
        for field in ['slug', 'name', 'description']:
            value = getattr(payload, field)
            if value is not None:
                setattr(row, field, value)
        if payload.enabled is not None:
            row.enabled = 1 if payload.enabled else 0
        row.updated_at = datetime.now(UTC).isoformat()
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        self.audit.record(AuditEventCreate(action='workflow.updated', entity_type='workflow', entity_id=row.id, before=before, after=self._to_read(row).model_dump()))
        return self._to_read(row)

    def delete(self, workflow_id: str) -> dict[str, bool]:
        row = self.db.get(Workflow, workflow_id)
        if row is None:
            raise HTTPException(status_code=404, detail='Workflow not found')
        before = self._to_read(row).model_dump()
        self.db.delete(row)
        self.db.commit()
        self.audit.record(AuditEventCreate(action='workflow.deleted', entity_type='workflow', entity_id=workflow_id, before=before))
        return {'ok': True}

    async def run(self, workflow_id: str, payload: WorkflowRunRequest, source: str = 'ui', job_id: str | None = None) -> WorkflowRunResponse:
        workflow = self.db.get(Workflow, workflow_id)
        if workflow is None:
            raise HTTPException(status_code=404, detail='Workflow not found')
        definition = json.loads(workflow.definition_json or '{}')
        steps = definition.get('steps') or []
        if not steps:
            raise HTTPException(status_code=400, detail='Workflow has no steps')

        run = Run(
            id=f'run_{uuid4().hex}',
            run_type='workflow_manual',
            source=source,
            status='running',
            workflow_id=workflow.id,
            job_id=job_id,
            dataset_id=payload.dataset_id,
            provider_id=payload.provider_id,
            summary=f'Workflow run for {workflow.name}',
            started_at=datetime.now(UTC).isoformat(),
            metadata_json=json.dumps({'workflow_slug': workflow.slug, 'variables': payload.variables}),
        )
        self.db.add(run)
        self.db.commit()

        outputs: dict[str, object] = {}
        try:
            for index, step in enumerate(steps, start=1):
                await self._execute_step(run, index, step, payload, outputs)
            run.status = 'success'
            run.summary = f'Workflow {workflow.name} completed'
            run.finished_at = datetime.now(UTC).isoformat()
            self.db.add(run)
            self.db.commit()
            self.audit.record(AuditEventCreate(action='workflow.run_finished', entity_type='run', entity_id=run.id, run_id=run.id, status='success', after={'workflow_id': workflow.id}))
            return WorkflowRunResponse(ok=True, run_id=run.id, workflow_id=workflow.id, status='success', outputs=outputs)
        except HTTPException as exc:
            self._fail_run(run, str(exc.detail))
            raise
        except Exception as exc:  # noqa: BLE001
            self._fail_run(run, str(exc))
            raise HTTPException(status_code=500, detail=str(exc)) from exc

    def get_run_status(self, run_id: str) -> WorkflowRunStatusResponse:
        run = self.db.get(Run, run_id)
        if run is None:
            raise HTTPException(status_code=404, detail='Run not found')
        steps = self.db.query(RunStep).filter(RunStep.run_id == run_id).order_by(RunStep.step_index.asc()).all()
        outputs: dict[str, object] = {}
        for step in steps:
            output = json.loads(step.output_json) if step.output_json else None
            if isinstance(output, dict) and 'result_key' in output and 'result' in output:
                outputs[str(output['result_key'])] = output['result']
        return WorkflowRunStatusResponse(
            ok=True,
            run=self._run_to_dict(run),
            steps=[self._step_to_read(step) for step in steps],
            outputs=outputs,
        )

    @staticmethod
    def _safe_prompt_result(result: dict) -> dict:
        return {
            'template_id': result.get('template_id'),
            'template_slug': result.get('template_slug'),
            'dataset_id': result.get('dataset_id'),
            'has_system_prompt': bool(result.get('system_prompt')),
            'system_prompt_length': len(str(result.get('system_prompt') or '')),
            'user_prompt_length': len(str(result.get('user_prompt') or '')),
            'variable_keys': sorted((result.get('variables') or {}).keys()) if isinstance(result.get('variables'), dict) else [],
        }

    @staticmethod
    def _safe_provider_result(result: dict) -> dict:
        payload = result.get('payload') or {}
        items = payload.get('items') or []
        text_length = 0
        if isinstance(items, list):
            for item in items:
                if isinstance(item, dict):
                    text_length += len(str(item.get('text') or ''))
        return {
            'status': result.get('status'),
            'summary': result.get('summary'),
            'metrics': result.get('metrics'),
            'warnings': result.get('warnings'),
            'raw_keys': sorted((result.get('raw') or {}).keys()) if isinstance(result.get('raw'), dict) else [],
            'text_length': text_length,
        }

    async def _execute_step(self, run: Run, index: int, step: dict, payload: WorkflowRunRequest, outputs: dict[str, object]) -> None:
        step_type = step.get('type')
        step_name = step.get('name') or step_type or f'step_{index}'
        now = datetime.now(UTC).isoformat()

        if step_type == 'prompt_template':
            template_id = step.get('template_id') or payload.template_id
            dataset_id = step.get('dataset_id') or payload.dataset_id
            if not template_id:
                raise HTTPException(status_code=400, detail=f'{step_name}: template_id is required')
            if not dataset_id:
                raise HTTPException(status_code=400, detail=f'{step_name}: dataset_id is required')
            template = self.template_service.get(template_id)
            normalized_payload = self._load_dataset_payload(dataset_id)
            variables = {**template.default_vars, **payload.variables, **(step.get('variables') or {})}
            rendered_system = step.get('system_prompt_override') if step.get('system_prompt_override') is not None else template.system_prompt
            rendered_user = self.env.from_string(step.get('user_prompt_override') or template.user_prompt_template).render(payload=normalized_payload, vars=variables)
            result = {
                'template_id': template.id,
                'template_slug': template.slug,
                'dataset_id': dataset_id,
                'system_prompt': rendered_system,
                'user_prompt': rendered_user,
                'variables': variables,
            }
            result_key = step.get('result_key') or 'prompt'
            outputs[result_key] = result
            self._record_step(run.id, index, step_type, step_name, 'success', {'template_id': template.id, 'dataset_id': dataset_id}, {'result_key': result_key, 'result': self._safe_prompt_result(result)}, started_at=now)
            return

        if step_type == 'llm_provider':
            provider_id = step.get('provider_id') or payload.provider_id
            if not provider_id:
                raise HTTPException(status_code=400, detail=f'{step_name}: provider_id is required')
            prompt_ref = step.get('prompt_ref') or 'prompt'
            prompt_data = outputs.get(prompt_ref)
            if not isinstance(prompt_data, dict):
                raise HTTPException(status_code=400, detail=f'{step_name}: prompt_ref {prompt_ref!r} did not resolve to a rendered prompt')
            provider_result = await self.provider_service.invoke(provider_id, {
                'run_id': run.id,
                'model': step.get('model') or payload.model,
                'system_prompt': prompt_data.get('system_prompt'),
                'input': prompt_data.get('user_prompt'),
                'payload': {'workflow_outputs': outputs, 'dataset_id': prompt_data.get('dataset_id')},
                'variables': prompt_data.get('variables') or payload.variables,
            })
            result_key = step.get('result_key') or 'llm'
            outputs[result_key] = provider_result
            status = 'success' if provider_result.get('status') == 'success' else 'failed'
            self._record_step(run.id, index, step_type, step_name, status, {'provider_id': provider_id, 'prompt_ref': prompt_ref}, {'result_key': result_key, 'result': self._safe_provider_result(provider_result)}, error_text=None if status == 'success' else provider_result.get('summary'), started_at=now)
            if status != 'success':
                raise HTTPException(status_code=400, detail=f'{step_name}: {provider_result.get("summary") or "provider step failed"}')
            return

        raise HTTPException(status_code=400, detail=f'Unsupported workflow step type: {step_type}')

    def _load_dataset_payload(self, dataset_id: str) -> dict:
        version = self.db.query(DatasetVersion).filter(DatasetVersion.dataset_id == dataset_id).order_by(DatasetVersion.version_no.desc()).first()
        if version is None or not version.normalized_payload_path:
            raise HTTPException(status_code=404, detail='Dataset version not found')
        return json.loads(Path(version.normalized_payload_path).read_text(encoding='utf-8'))

    def _record_step(self, run_id: str, step_index: int, step_type: str, step_name: str, status: str, input_data: dict | None, output_data: dict | None, error_text: str | None = None, started_at: str | None = None) -> None:
        step = RunStep(
            id=f'rst_{uuid4().hex}',
            run_id=run_id,
            step_index=step_index,
            step_type=step_type,
            step_name=step_name,
            status=status,
            input_json=json.dumps(input_data) if input_data is not None else None,
            output_json=json.dumps(output_data) if output_data is not None else None,
            error_text=error_text,
            started_at=started_at or datetime.now(UTC).isoformat(),
            finished_at=datetime.now(UTC).isoformat(),
        )
        self.db.add(step)
        self.db.commit()

    def _fail_run(self, run: Run, detail: str) -> None:
        run.status = 'failed'
        run.error_text = detail
        run.summary = detail
        run.finished_at = datetime.now(UTC).isoformat()
        self.db.add(run)
        self.db.commit()
        self.audit.record(AuditEventCreate(action='workflow.run_finished', entity_type='run', entity_id=run.id, run_id=run.id, status='failed', message=detail))

    @staticmethod
    def _validate_definition(definition: dict) -> None:
        steps = definition.get('steps')
        if not isinstance(steps, list) or not steps:
            raise HTTPException(status_code=400, detail='Workflow definition must include a non-empty steps array')
        for index, step in enumerate(steps, start=1):
            if not isinstance(step, dict):
                raise HTTPException(status_code=400, detail=f'Workflow step {index} must be an object')
            if step.get('type') not in {'prompt_template', 'llm_provider'}:
                raise HTTPException(status_code=400, detail=f'Workflow step {index} has unsupported type {step.get("type")!r}')

    @staticmethod
    def _to_read(row: Workflow) -> WorkflowRead:
        return WorkflowRead(
            id=row.id,
            slug=row.slug,
            name=row.name,
            description=row.description,
            definition=json.loads(row.definition_json or '{}'),
            enabled=bool(row.enabled),
            version_no=row.version_no,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )

    @staticmethod
    def _run_to_dict(run: Run) -> dict:
        return {
            'id': run.id,
            'workflow_id': run.workflow_id,
            'status': run.status,
            'summary': run.summary,
            'error_text': run.error_text,
            'dataset_id': run.dataset_id,
            'provider_id': run.provider_id,
            'metadata': json.loads(run.metadata_json or '{}'),
            'started_at': run.started_at,
            'finished_at': run.finished_at,
            'created_at': run.created_at,
        }

    @staticmethod
    def _step_to_read(step: RunStep) -> WorkflowRunStepRead:
        return WorkflowRunStepRead(
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
