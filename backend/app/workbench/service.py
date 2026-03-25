from __future__ import annotations

import json
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
from app.workbench.schemas import WorkbenchRunRequest


class WorkbenchService:
    def __init__(self, db: Session, provider_service: ProviderService):
        self.db = db
        self.provider_service = provider_service
        self.audit = AuditService(db)
        self.template_service = TemplateService(db)
        self.env = Environment(autoescape=False)
        self.env.filters['tojson'] = lambda value, indent=None: json.dumps(value, indent=indent, ensure_ascii=False)

    async def run(self, payload: WorkbenchRunRequest) -> dict:
        version = self.db.query(DatasetVersion).filter(DatasetVersion.dataset_id == payload.dataset_id).order_by(DatasetVersion.version_no.desc()).first()
        if version is None or not version.normalized_payload_path:
            raise HTTPException(status_code=404, detail='Dataset version not found')
        normalized_payload = json.loads(Path(version.normalized_payload_path).read_text(encoding='utf-8'))
        template = self.template_service.get(payload.template_id) if payload.template_id else self.template_service.get_by_slug(payload.template_slug or 'weekly_engineering_summary')
        rendered_system = payload.system_prompt_override if payload.system_prompt_override is not None else template.system_prompt
        rendered_user = payload.user_prompt_override if payload.user_prompt_override is not None else self.env.from_string(template.user_prompt_template).render(payload=normalized_payload, vars={**template.default_vars, **payload.variables})

        run = Run(
            id=f'run_{uuid4().hex}',
            run_type='manual_workbench',
            source='ui',
            status='running',
            dataset_id=payload.dataset_id,
            provider_id=payload.provider_id,
            summary=f'Workbench run for dataset {payload.dataset_id}',
            started_at=datetime.now(UTC).isoformat(),
            metadata_json=json.dumps({'template_id': template.id, 'template_slug': template.slug}),
        )
        self.db.add(run)
        self.db.commit()

        render_step = RunStep(
            id=f'rst_{uuid4().hex}',
            run_id=run.id,
            step_index=1,
            step_type='render',
            step_name='render_prompt',
            status='success',
            output_json=json.dumps({'system_prompt': rendered_system, 'user_prompt': rendered_user}),
            started_at=run.started_at,
            finished_at=datetime.now(UTC).isoformat(),
        )
        self.db.add(render_step)
        self.db.commit()

        self.audit.record(AuditEventCreate(action='workbench.run_started', entity_type='run', entity_id=run.id, run_id=run.id, after={'dataset_id': payload.dataset_id, 'provider_id': payload.provider_id, 'template_id': template.id}))

        provider_result = await self.provider_service.invoke(payload.provider_id, {
            'run_id': run.id,
            'model': payload.model,
            'system_prompt': rendered_system,
            'input': rendered_user,
            'payload': normalized_payload,
            'variables': payload.variables,
        })

        llm_step = RunStep(
            id=f'rst_{uuid4().hex}',
            run_id=run.id,
            step_index=2,
            step_type='llm',
            step_name='invoke_provider',
            status='success' if provider_result['status'] == 'success' else 'failed',
            input_json=json.dumps({'system_prompt': rendered_system, 'user_prompt': rendered_user}),
            output_json=json.dumps(provider_result),
            error_text=None if provider_result['status'] == 'success' else provider_result.get('summary'),
            started_at=datetime.now(UTC).isoformat(),
            finished_at=datetime.now(UTC).isoformat(),
        )
        run.status = 'success' if provider_result['status'] == 'success' else 'failed'
        run.summary = provider_result.get('summary')
        run.finished_at = datetime.now(UTC).isoformat()
        self.db.add_all([llm_step, run])
        self.db.commit()

        audit = self.audit.record(AuditEventCreate(action='workbench.run_finished', entity_type='run', entity_id=run.id, run_id=run.id, status='success' if provider_result['status'] == 'success' else 'failed', after={'provider_result_status': provider_result['status']}))
        return {
            'ok': True,
            'run_id': run.id,
            'audit_id': audit.id,
            'rendered_prompt': {
                'system_prompt': rendered_system,
                'user_prompt': rendered_user,
            },
            'provider_result': provider_result,
        }
