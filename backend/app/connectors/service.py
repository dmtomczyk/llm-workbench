from __future__ import annotations

import json
from datetime import UTC, datetime
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.audit.schemas import AuditEventCreate
from app.audit.service import AuditService
from app.connectors.schemas import ConnectorCreate, ConnectorRead, ConnectorUpdate
from app.core.request_context import get_request_context
from app.db.models import Connector, ConnectorCall, Run
from app.plugins.base import ExecutionContext
from app.plugins.service import PluginService


class ConnectorService:
    def __init__(self, db: Session, plugin_service: PluginService):
        self.db = db
        self.plugin_service = plugin_service
        self.audit = AuditService(db)

    def list(self) -> list[ConnectorRead]:
        rows = self.db.scalars(select(Connector).order_by(Connector.name)).all()
        return [self._to_read(row) for row in rows]

    def get(self, connector_id: str) -> ConnectorRead:
        row = self.db.get(Connector, connector_id)
        if row is None:
            raise HTTPException(status_code=404, detail='Connector not found')
        return self._to_read(row)

    def create(self, payload: ConnectorCreate) -> ConnectorRead:
        row = Connector(
            id=f'con_{uuid4().hex}',
            name=payload.name,
            plugin_id=payload.plugin_id,
            base_url=payload.base_url,
            auth_type=payload.auth_type,
            secret_alias=payload.secret_alias,
            config_json=json.dumps(payload.config),
            enabled=1 if payload.enabled else 0,
        )
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        self.audit.record(AuditEventCreate(action='connector.created', entity_type='connector', entity_id=row.id, after=self._to_read(row).model_dump()))
        return self._to_read(row)

    def update(self, connector_id: str, payload: ConnectorUpdate) -> ConnectorRead:
        row = self.db.get(Connector, connector_id)
        if row is None:
            raise HTTPException(status_code=404, detail='Connector not found')
        before = self._to_read(row).model_dump()
        for field in ['name', 'base_url', 'auth_type', 'secret_alias']:
            value = getattr(payload, field)
            if value is not None:
                setattr(row, field, value)
        if payload.config is not None:
            row.config_json = json.dumps(payload.config)
        if payload.enabled is not None:
            row.enabled = 1 if payload.enabled else 0
        row.updated_at = datetime.now(UTC).isoformat()
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        self.audit.record(AuditEventCreate(action='connector.updated', entity_type='connector', entity_id=row.id, before=before, after=self._to_read(row).model_dump()))
        return self._to_read(row)

    async def test(self, connector_id: str) -> dict:
        row = self._row(connector_id)
        plugin = self.plugin_service.instantiate(row.plugin_id, config=self._config(row))
        result = await plugin.healthcheck()
        row.last_tested_at = datetime.now(UTC).isoformat()
        row.last_test_result_json = json.dumps(result)
        self.db.add(row)
        self.db.commit()
        run = Run(id=f'run_{uuid4().hex}', run_type='connector_test', source='ui', status='success' if result.get('ok') else 'failed', connector_id=row.id, summary=result.get('message'), started_at=row.last_tested_at, finished_at=datetime.now(UTC).isoformat())
        self.db.add(run)
        self.db.commit()
        audit = self.audit.record(AuditEventCreate(action='connector.tested', entity_type='connector', entity_id=row.id, status='success' if result.get('ok') else 'failed', after=result, run_id=run.id))
        result['audit_id'] = audit.id
        result['run_id'] = run.id
        return result

    async def execute_action(self, connector_id: str, action_name: str, params: dict) -> dict:
        row = self._row(connector_id)
        plugin = self.plugin_service.instantiate(row.plugin_id, config=self._config(row))
        run = Run(id=f'run_{uuid4().hex}', run_type='connector_action', source='ui', status='running', connector_id=row.id, summary=f'{row.name}:{action_name}', started_at=datetime.now(UTC).isoformat())
        self.db.add(run)
        self.db.commit()
        req_context = get_request_context()
        result = await plugin.execute(action_name, params, ExecutionContext(actor=req_context.actor, source=req_context.source, correlation_id=req_context.correlation_id, request_id=req_context.request_id, run_id=run.id))
        run.status = 'success' if result.status == 'success' else 'failed'
        run.summary = result.summary
        run.error_text = result.error
        run.finished_at = datetime.now(UTC).isoformat()
        payload_json = None
        if result.payload is not None:
            payload_json = {
                'type': result.payload.type,
                'title': result.payload.title,
                'items': result.payload.items,
                'metadata': result.payload.metadata,
            }
        call = ConnectorCall(
            id=f'cc_{uuid4().hex}',
            run_id=run.id,
            connector_id=row.id,
            plugin_action=action_name,
            request_json=json.dumps(params),
            response_json=json.dumps(result.raw if result.raw is not None else {'payload': payload_json}),
            latency_ms=result.metrics.get('latency_ms'),
            status_code=result.metrics.get('status_code'),
            error_text=result.error,
        )
        self.db.add_all([run, call])
        self.db.commit()
        audit = self.audit.record(AuditEventCreate(action='connector.invoked', entity_type='connector', entity_id=row.id, status='success' if result.status == 'success' else 'failed', metadata={'action': action_name}, run_id=run.id))
        payload = None
        if result.payload is not None:
            payload = {
                'type': result.payload.type,
                'title': result.payload.title,
                'items': result.payload.items,
                'metadata': result.payload.metadata,
            }
        return {'status': result.status, 'summary': result.summary, 'payload': payload, 'warnings': result.warnings, 'audit_id': audit.id, 'run_id': run.id}

    def _row(self, connector_id: str) -> Connector:
        row = self.db.get(Connector, connector_id)
        if row is None:
            raise HTTPException(status_code=404, detail='Connector not found')
        return row

    def _config(self, row: Connector) -> dict:
        return {
            'id': row.id,
            'name': row.name,
            'base_url': row.base_url,
            'auth_type': row.auth_type,
            'secret_alias': row.secret_alias,
            **json.loads(row.config_json or '{}'),
        }

    @staticmethod
    def _to_read(row: Connector) -> ConnectorRead:
        return ConnectorRead(
            id=row.id,
            name=row.name,
            plugin_id=row.plugin_id,
            base_url=row.base_url,
            auth_type=row.auth_type,
            secret_alias=row.secret_alias,
            config=json.loads(row.config_json or '{}'),
            enabled=bool(row.enabled),
            last_tested_at=row.last_tested_at,
            last_test_result=json.loads(row.last_test_result_json) if row.last_test_result_json else None,
        )
