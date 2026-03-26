from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from pathlib import Path
from uuid import uuid4
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from jinja2 import Environment
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.audit.schemas import AuditEventCreate
from app.audit.service import AuditService
from app.db.models import Automation, DatasetVersion, Run, RunStep
from app.providers.service import ProviderService
from app.templates.service import TemplateService
from app.workflows.schemas import WorkflowRunRequest
from app.workflows.service import WorkflowService
from app.automations.schemas import AutomationCreate, AutomationRead, AutomationRunDetailResponse, AutomationRunResponse, AutomationRunsResponse, AutomationUpdate


class AutomationService:
    def __init__(self, db: Session, provider_service: ProviderService):
        self.db = db
        self.provider_service = provider_service
        self.audit = AuditService(db)
        self.template_service = TemplateService(db)
        self.env = Environment(autoescape=False)
        self.env.filters['tojson'] = lambda value, indent=None: json.dumps(value, indent=indent, ensure_ascii=False)

    def list(self) -> list[AutomationRead]:
        rows = self.db.scalars(select(Automation).order_by(Automation.created_at.desc())).all()
        return [self._to_read(row) for row in rows]

    def get(self, automation_id: str) -> AutomationRead:
        row = self.db.get(Automation, automation_id)
        if row is None:
            raise HTTPException(status_code=404, detail='Automation not found')
        return self._to_read(row)

    def create(self, payload: AutomationCreate) -> AutomationRead:
        self._validate_payload(payload)
        row = Automation(
            id=f'aut_{uuid4().hex}',
            name=payload.name,
            enabled=1 if payload.enabled else 0,
            schedule_type=payload.schedule_type,
            interval_seconds=payload.interval_seconds,
            run_at=payload.run_at,
            time_of_day=payload.time_of_day,
            timezone=payload.timezone,
            target_type=payload.target_type,
            workflow_id=payload.workflow_id,
            provider_id=payload.provider_id,
            template_id=payload.template_id,
            dataset_id=payload.dataset_id,
            model=payload.model,
            system_prompt=payload.system_prompt,
            prompt_text=payload.prompt_text,
            variables_json=json.dumps(payload.variables),
            next_run_at=self._compute_next_run(payload.schedule_type, payload.interval_seconds, payload.run_at, payload.time_of_day, payload.timezone),
        )
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        self.audit.record(AuditEventCreate(action='automation.created', entity_type='automation', entity_id=row.id, after=self._to_read(row).model_dump()))
        return self._to_read(row)

    def update(self, automation_id: str, payload: AutomationUpdate) -> AutomationRead:
        row = self.db.get(Automation, automation_id)
        if row is None:
            raise HTTPException(status_code=404, detail='Automation not found')
        before = self._to_read(row).model_dump()
        for field in ['name', 'schedule_type', 'interval_seconds', 'run_at', 'time_of_day', 'timezone', 'target_type', 'workflow_id', 'provider_id', 'template_id', 'dataset_id', 'model', 'system_prompt', 'prompt_text']:
            if field in payload.model_fields_set:
                setattr(row, field, getattr(payload, field))
        if 'enabled' in payload.model_fields_set:
            row.enabled = 1 if payload.enabled else 0
        if 'variables' in payload.model_fields_set and payload.variables is not None:
            row.variables_json = json.dumps(payload.variables)
        self._validate_row(row)
        row.next_run_at = self._compute_next_run(row.schedule_type, row.interval_seconds, row.run_at, row.time_of_day, row.timezone)
        row.updated_at = datetime.now(UTC).isoformat()
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        self.audit.record(AuditEventCreate(action='automation.updated', entity_type='automation', entity_id=row.id, before=before, after=self._to_read(row).model_dump()))
        return self._to_read(row)

    def delete(self, automation_id: str) -> dict[str, bool]:
        row = self.db.get(Automation, automation_id)
        if row is None:
            raise HTTPException(status_code=404, detail='Automation not found')
        before = self._to_read(row).model_dump()
        self.db.delete(row)
        self.db.commit()
        self.audit.record(AuditEventCreate(action='automation.deleted', entity_type='automation', entity_id=automation_id, before=before))
        return {'ok': True}

    async def run_now(self, automation_id: str, source: str = 'ui') -> AutomationRunResponse:
        row = self.db.get(Automation, automation_id)
        if row is None:
            raise HTTPException(status_code=404, detail='Automation not found')
        run = await self._execute_row(row, source=source)
        return AutomationRunResponse(ok=True, automation_id=row.id, run_id=run.id, status=run.status, summary=run.summary)

    async def run_due(self) -> int:
        now = datetime.now(UTC).isoformat()
        due = self.db.scalars(select(Automation).where(Automation.enabled == 1).where(Automation.next_run_at.is_not(None)).where(Automation.next_run_at <= now).order_by(Automation.next_run_at.asc())).all()
        count = 0
        for row in due:
            await self._execute_row(row, source='scheduler')
            count += 1
        return count

    def list_runs(self, automation_id: str) -> AutomationRunsResponse:
        runs = self.db.scalars(select(Run).where(Run.job_id == automation_id).order_by(Run.created_at.desc()).limit(20)).all()
        return AutomationRunsResponse(ok=True, runs=[self._run_summary(run) for run in runs])

    def get_run_detail(self, run_id: str) -> AutomationRunDetailResponse:
        run = self.db.get(Run, run_id)
        if run is None:
            raise HTTPException(status_code=404, detail='Run not found')
        steps = self.db.scalars(select(RunStep).where(RunStep.run_id == run_id).order_by(RunStep.step_index.asc())).all()
        return AutomationRunDetailResponse(ok=True, run=self._run_summary(run), steps=[self._step_summary(step) for step in steps])

    async def _execute_row(self, row: Automation, source: str) -> Run:
        self._validate_row(row)
        if row.target_type == 'workflow':
            workflow_service = WorkflowService(self.db, self.provider_service)
            result = await workflow_service.run(
                row.workflow_id,
                WorkflowRunRequest(dataset_id=row.dataset_id, provider_id=row.provider_id, template_id=row.template_id, model=row.model, variables=json.loads(row.variables_json or '{}')),
                source=source,
                job_id=row.id,
            )
            run = self.db.get(Run, result.run_id)
        else:
            run = Run(
                id=f'run_{uuid4().hex}',
                run_type='automation_prompt',
                source=source,
                status='running',
                job_id=row.id,
                provider_id=row.provider_id,
                dataset_id=row.dataset_id,
                summary=f'Automation prompt run for {row.name}',
                started_at=datetime.now(UTC).isoformat(),
                metadata_json=json.dumps({'automation_id': row.id, 'target_type': row.target_type}),
            )
            self.db.add(run)
            self.db.commit()

            variables = json.loads(row.variables_json or '{}')
            system_prompt = row.system_prompt
            prompt_text = row.prompt_text or ''
            if row.target_type == 'template_prompt':
                if not row.template_id:
                    raise HTTPException(status_code=400, detail='template_id is required for template prompt automations')
                template = self.template_service.get(row.template_id)
                dataset_payload = self._load_dataset_payload(row.dataset_id) if row.dataset_id else {}
                merged_vars = {**template.default_vars, **variables}
                system_prompt = system_prompt if system_prompt else template.system_prompt
                prompt_text = self.env.from_string(template.user_prompt_template).render(payload=dataset_payload, vars=merged_vars)
                variables = merged_vars
                self._record_step(run.id, 1, 'render', 'render_template_prompt', 'success', {'template_id': row.template_id, 'dataset_id': row.dataset_id}, self._safe_render_result(system_prompt, prompt_text, variables))

            provider_result = await self.provider_service.invoke(row.provider_id, {
                'run_id': run.id,
                'model': row.model,
                'system_prompt': system_prompt,
                'input': prompt_text,
                'variables': variables,
            })
            self._record_step(run.id, 2 if row.target_type == 'template_prompt' else 1, 'llm', 'invoke_provider', 'success' if provider_result.get('status') == 'success' else 'failed', {'provider_id': row.provider_id}, self._safe_provider_result(provider_result), None if provider_result.get('status') == 'success' else provider_result.get('summary'))
            run.status = 'success' if provider_result.get('status') == 'success' else 'failed'
            run.summary = provider_result.get('summary')
            run.error_text = None if run.status == 'success' else provider_result.get('summary')
            run.finished_at = datetime.now(UTC).isoformat()
            self.db.add(run)
            self.db.commit()
        row.last_run_at = datetime.now(UTC).isoformat()
        row.next_run_at = self._next_after_run(row)
        if row.schedule_type == 'at':
            row.enabled = 0
        self.db.add(row)
        self.db.commit()
        self.audit.record(AuditEventCreate(action='automation.executed', entity_type='automation', entity_id=row.id, run_id=run.id, status=run.status, after={'source': source}))
        return run

    @staticmethod
    def _safe_render_result(system_prompt: str | None, prompt_text: str, variables: dict) -> dict:
        return {
            'has_system_prompt': bool(system_prompt),
            'system_prompt_length': len(system_prompt or ''),
            'prompt_length': len(prompt_text or ''),
            'variable_keys': sorted(variables.keys()) if isinstance(variables, dict) else [],
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

    @staticmethod
    def _compute_next_run(schedule_type: str, interval_seconds: int | None, run_at: str | None, time_of_day: str | None, timezone: str) -> str | None:
        now_utc = datetime.now(UTC)
        if schedule_type == 'interval':
            if not interval_seconds or interval_seconds <= 0:
                raise HTTPException(status_code=400, detail='interval_seconds must be > 0 for interval automations')
            return (now_utc + timedelta(seconds=interval_seconds)).isoformat()
        if schedule_type == 'at':
            if not run_at:
                raise HTTPException(status_code=400, detail='run_at is required for one-time automations')
            return run_at
        if schedule_type == 'daily':
            if not time_of_day:
                raise HTTPException(status_code=400, detail='time_of_day is required for daily automations')
            hour, minute = [int(part) for part in time_of_day.split(':', 1)]
            local_now = now_utc.astimezone(ZoneInfo(timezone))
            candidate = local_now.replace(hour=hour, minute=minute, second=0, microsecond=0)
            if candidate <= local_now:
                candidate += timedelta(days=1)
            return candidate.astimezone(UTC).isoformat()
        raise HTTPException(status_code=400, detail='Unsupported schedule type')

    @staticmethod
    def _next_after_run(row: Automation) -> str | None:
        return AutomationService._compute_next_run(row.schedule_type, row.interval_seconds, row.run_at, row.time_of_day, row.timezone) if row.schedule_type in {'interval', 'daily'} else None

    @staticmethod
    def _validate_payload(payload: AutomationCreate) -> None:
        if payload.target_type == 'workflow' and not payload.workflow_id:
            raise HTTPException(status_code=400, detail='workflow_id is required for workflow automations')
        if payload.target_type == 'custom_prompt':
            if not payload.provider_id:
                raise HTTPException(status_code=400, detail='provider_id is required for custom prompt automations')
            if not payload.prompt_text:
                raise HTTPException(status_code=400, detail='prompt_text is required for custom prompt automations')
        if payload.target_type == 'template_prompt':
            if not payload.provider_id:
                raise HTTPException(status_code=400, detail='provider_id is required for template prompt automations')
            if not payload.template_id:
                raise HTTPException(status_code=400, detail='template_id is required for template prompt automations')

    def _validate_row(self, row: Automation) -> None:
        self._validate_payload(AutomationCreate(
            name=row.name,
            enabled=bool(row.enabled),
            schedule_type=row.schedule_type,
            interval_seconds=row.interval_seconds,
            run_at=row.run_at,
            time_of_day=row.time_of_day,
            timezone=row.timezone,
            target_type=row.target_type,
            workflow_id=row.workflow_id,
            provider_id=row.provider_id,
            template_id=row.template_id,
            dataset_id=row.dataset_id,
            model=row.model,
            system_prompt=row.system_prompt,
            prompt_text=row.prompt_text,
            variables=json.loads(row.variables_json or '{}'),
        ))

    def _load_dataset_payload(self, dataset_id: str | None) -> dict:
        if not dataset_id:
            return {}
        version = self.db.query(DatasetVersion).filter(DatasetVersion.dataset_id == dataset_id).order_by(DatasetVersion.version_no.desc()).first()
        if version is None or not version.normalized_payload_path:
            raise HTTPException(status_code=404, detail='Dataset version not found')
        return json.loads(Path(version.normalized_payload_path).read_text(encoding='utf-8'))

    def _record_step(self, run_id: str, step_index: int, step_type: str, step_name: str, status: str, input_data: dict | None, output_data: dict | None, error_text: str | None = None) -> None:
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
            started_at=datetime.now(UTC).isoformat(),
            finished_at=datetime.now(UTC).isoformat(),
        )
        self.db.add(step)
        self.db.commit()

    @staticmethod
    def _run_summary(run: Run) -> dict:
        return {
            'id': run.id,
            'status': run.status,
            'summary': run.summary,
            'error_text': run.error_text,
            'started_at': run.started_at,
            'finished_at': run.finished_at,
            'created_at': run.created_at,
        }

    @staticmethod
    def _step_summary(step: RunStep) -> dict:
        return {
            'id': step.id,
            'step_index': step.step_index,
            'step_type': step.step_type,
            'step_name': step.step_name,
            'status': step.status,
            'input_json': json.loads(step.input_json) if step.input_json else None,
            'output_json': json.loads(step.output_json) if step.output_json else None,
            'error_text': step.error_text,
            'started_at': step.started_at,
            'finished_at': step.finished_at,
            'created_at': step.created_at,
        }

    @staticmethod
    def _to_read(row: Automation) -> AutomationRead:
        return AutomationRead(
            id=row.id,
            name=row.name,
            enabled=bool(row.enabled),
            schedule_type=row.schedule_type,
            interval_seconds=row.interval_seconds,
            run_at=row.run_at,
            time_of_day=row.time_of_day,
            timezone=row.timezone,
            target_type=row.target_type,
            workflow_id=row.workflow_id,
            provider_id=row.provider_id,
            template_id=row.template_id,
            dataset_id=row.dataset_id,
            model=row.model,
            system_prompt=row.system_prompt,
            prompt_text=row.prompt_text,
            variables=json.loads(row.variables_json or '{}'),
            last_run_at=row.last_run_at,
            next_run_at=row.next_run_at,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )
