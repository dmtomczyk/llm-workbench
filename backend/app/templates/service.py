from __future__ import annotations

import json
from datetime import UTC, datetime
from uuid import uuid4

import yaml
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.audit.schemas import AuditEventCreate
from app.audit.service import AuditService
from app.core.config import PROJECT_ROOT
from app.db.models import PromptTemplate
from app.db.session import get_db
from app.templates.schemas import TemplateCreate, TemplateRead, TemplateUpdate


class TemplateService:
    def __init__(self, db: Session | None = None):
        self.db = db
        self.seed_path = PROJECT_ROOT / 'backend' / 'config' / 'seed_prompt_templates.yaml'

    def seed_defaults(self) -> None:
        if not self.seed_path.exists():
            return
        payload = yaml.safe_load(self.seed_path.read_text(encoding='utf-8')) or {}
        templates = payload.get('templates', [])
        db = self.db or next(get_db())
        owns_db = self.db is None
        try:
            existing = {row.slug for row in db.scalars(select(PromptTemplate)).all()}
            changed = False
            for item in templates:
                if item['slug'] in existing:
                    continue
                row = PromptTemplate(
                    id=f'tpl_{uuid4().hex}',
                    slug=item['slug'],
                    name=item['name'],
                    description=item.get('description'),
                    system_prompt=item.get('system_prompt'),
                    user_prompt_template=item['user_prompt_template'],
                    output_schema_json=json.dumps(item.get('output_schema')) if item.get('output_schema') else None,
                    default_vars_json=json.dumps(item.get('default_vars', {})),
                    tags_json=json.dumps(item.get('tags', [])),
                )
                db.add(row)
                changed = True
            if changed:
                db.commit()
        finally:
            if owns_db:
                db.close()

    def list(self) -> list[TemplateRead]:
        rows = self.db.scalars(select(PromptTemplate).order_by(PromptTemplate.name)).all()
        return [self._to_read(row) for row in rows]

    def get(self, template_id: str) -> TemplateRead:
        row = self.db.get(PromptTemplate, template_id)
        if row is None:
            raise HTTPException(status_code=404, detail='Template not found')
        return self._to_read(row)

    def get_by_slug(self, slug: str) -> TemplateRead:
        row = self.db.scalar(select(PromptTemplate).where(PromptTemplate.slug == slug))
        if row is None:
            raise HTTPException(status_code=404, detail='Template not found')
        return self._to_read(row)

    def create(self, payload: TemplateCreate) -> TemplateRead:
        row = PromptTemplate(
            id=f'tpl_{uuid4().hex}',
            slug=payload.slug,
            name=payload.name,
            description=payload.description,
            system_prompt=payload.system_prompt,
            user_prompt_template=payload.user_prompt_template,
            output_schema_json=json.dumps(payload.output_schema) if payload.output_schema is not None else None,
            default_vars_json=json.dumps(payload.default_vars),
            tags_json=json.dumps(payload.tags),
        )
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        AuditService(self.db).record(AuditEventCreate(action='template.created', entity_type='template', entity_id=row.id, after=self._to_read(row).model_dump()))
        return self._to_read(row)

    def update(self, template_id: str, payload: TemplateUpdate) -> TemplateRead:
        row = self.db.get(PromptTemplate, template_id)
        if row is None:
            raise HTTPException(status_code=404, detail='Template not found')
        before = self._to_read(row).model_dump()
        for field in ['name', 'description', 'system_prompt', 'user_prompt_template']:
            value = getattr(payload, field)
            if value is not None:
                setattr(row, field, value)
        if payload.output_schema is not None:
            row.output_schema_json = json.dumps(payload.output_schema)
        if payload.default_vars is not None:
            row.default_vars_json = json.dumps(payload.default_vars)
        if payload.tags is not None:
            row.tags_json = json.dumps(payload.tags)
        row.updated_at = datetime.now(UTC).isoformat()
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        AuditService(self.db).record(AuditEventCreate(action='template.updated', entity_type='template', entity_id=row.id, before=before, after=self._to_read(row).model_dump()))
        return self._to_read(row)

    def delete(self, template_id: str) -> dict[str, bool]:
        row = self.db.get(PromptTemplate, template_id)
        if row is None:
            raise HTTPException(status_code=404, detail='Template not found')
        before = self._to_read(row).model_dump()
        self.db.delete(row)
        self.db.commit()
        AuditService(self.db).record(AuditEventCreate(action='template.deleted', entity_type='template', entity_id=template_id, before=before))
        return {'ok': True}

    @staticmethod
    def _to_read(row: PromptTemplate) -> TemplateRead:
        return TemplateRead(
            id=row.id,
            slug=row.slug,
            name=row.name,
            description=row.description,
            system_prompt=row.system_prompt,
            user_prompt_template=row.user_prompt_template,
            output_schema=json.loads(row.output_schema_json) if row.output_schema_json else None,
            default_vars=json.loads(row.default_vars_json or '{}'),
            tags=json.loads(row.tags_json or '[]'),
            created_at=row.created_at,
            updated_at=row.updated_at,
        )
