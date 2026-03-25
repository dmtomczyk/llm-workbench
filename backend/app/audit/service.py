from __future__ import annotations

import json
from uuid import uuid4

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.audit.schemas import AuditEventCreate, AuditEventRead
from app.core.request_context import get_request_context
from app.db.models import AuditEvent


class AuditService:
    def __init__(self, db: Session):
        self.db = db

    def record(self, event: AuditEventCreate) -> AuditEvent:
        context = get_request_context()
        row = AuditEvent(
            id=f"aud_{uuid4().hex}",
            actor=context.actor,
            actor_type="user",
            action=event.action,
            entity_type=event.entity_type,
            entity_id=event.entity_id,
            status=event.status,
            source=event.source or context.source,
            request_id=context.request_id,
            correlation_id=context.correlation_id,
            run_id=event.run_id,
            session_id=event.session_id,
            message=event.message,
            before_json=json.dumps(event.before) if event.before is not None else None,
            after_json=json.dumps(event.after) if event.after is not None else None,
            metadata_json=json.dumps(event.metadata or {}),
        )
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row

    def list(self, limit: int = 100) -> list[AuditEventRead]:
        rows = self.db.scalars(select(AuditEvent).order_by(desc(AuditEvent.occurred_at)).limit(limit)).all()
        return [self._to_read(row) for row in rows]

    def get(self, audit_id: str) -> AuditEventRead | None:
        row = self.db.get(AuditEvent, audit_id)
        return self._to_read(row) if row else None

    @staticmethod
    def _to_read(row: AuditEvent) -> AuditEventRead:
        return AuditEventRead(
            id=row.id,
            occurred_at=row.occurred_at,
            actor=row.actor,
            actor_type=row.actor_type,
            action=row.action,
            entity_type=row.entity_type,
            entity_id=row.entity_id,
            status=row.status,
            source=row.source,
            request_id=row.request_id,
            correlation_id=row.correlation_id,
            run_id=row.run_id,
            session_id=row.session_id,
            message=row.message,
            before=json.loads(row.before_json) if row.before_json else None,
            after=json.loads(row.after_json) if row.after_json else None,
            metadata=json.loads(row.metadata_json or "{}"),
        )
