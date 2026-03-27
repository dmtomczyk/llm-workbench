from __future__ import annotations

import json
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.audit.schemas import AuditEventCreate
from app.audit.service import AuditService
from app.core.config import get_settings
from app.db.models import SettingsEntry


class SettingsService:
    def __init__(self, db: Session):
        self.db = db
        self.audit = AuditService(db)

    def read(self) -> dict[str, Any]:
        config = get_settings().model_dump()
        if isinstance(config.get('auth'), dict):
            auth_config = dict(config['auth'])
            if auth_config.get('session_jwt_secret'):
                auth_config['session_jwt_secret'] = '**********'
            oidc = dict(auth_config.get('oidc') or {})
            if oidc.get('client_secret'):
                oidc['client_secret'] = '**********'
            auth_config['oidc'] = oidc
            config['auth'] = auth_config
        rows = self.db.scalars(select(SettingsEntry)).all()
        overrides = {}
        for row in rows:
            value = json.loads(row.value_json)
            if row.key.startswith('secrets.'):
                overrides[row.key] = '**********' if value else ''
            else:
                overrides[row.key] = value
        return {'config': config, 'overrides': overrides}

    def patch(self, payload: dict[str, Any]) -> dict[str, Any]:
        for key, value in payload.items():
            row = self.db.get(SettingsEntry, key) or SettingsEntry(key=key)
            row.value_json = json.dumps(value)
            self.db.add(row)
        self.db.commit()
        self.audit.record(AuditEventCreate(
            action='settings.updated',
            entity_type='settings',
            entity_id='app',
            after=payload,
        ))
        return self.read()
