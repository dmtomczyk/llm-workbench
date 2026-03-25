from __future__ import annotations

import hashlib
import importlib
import json
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import yaml
from jsonschema import ValidationError, validate
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.audit.schemas import AuditEventCreate
from app.audit.service import AuditService
from app.core.config import PROJECT_ROOT, get_settings
from app.db.models import PluginRegistry
from app.db.session import get_db
from app.plugins.schemas import PluginRead, PluginSyncResult


class PluginService:
    def __init__(self):
        self.settings = get_settings()
        self.manifest_schema = json.loads((Path(__file__).with_name('manifest_schema.json')).read_text(encoding='utf-8'))
        self._manifest_cache: dict[str, dict[str, Any]] = {}
        self._class_cache: dict[str, type[Any]] = {}
        repo_root = str(PROJECT_ROOT)
        if repo_root not in sys.path:
            sys.path.insert(0, repo_root)

    def _db(self) -> Session:
        return next(get_db())

    def sync_registry(self) -> PluginSyncResult:
        plugin_dir = self.settings.plugin_dir
        discovered = loaded = failed = 0
        db = self._db()
        audit = AuditService(db)
        try:
            for manifest_path in sorted(plugin_dir.glob('*/plugin.yaml')):
                discovered += 1
                try:
                    manifest = yaml.safe_load(manifest_path.read_text(encoding='utf-8')) or {}
                    validate(manifest, self.manifest_schema)
                    row = db.get(PluginRegistry, manifest['id']) or PluginRegistry(id=manifest['id'])
                    row.name = manifest['name']
                    row.version = manifest['version']
                    row.kind = manifest['kind']
                    row.entrypoint = manifest['entrypoint']
                    row.enabled = 1 if manifest.get('enabled_by_default', True) else 0
                    row.load_status = 'loaded'
                    row.manifest_json = json.dumps(manifest)
                    row.manifest_hash = hashlib.sha256(row.manifest_json.encode('utf-8')).hexdigest()
                    row.last_loaded_at = datetime.now(UTC).isoformat()
                    row.last_error = None
                    db.add(row)
                    db.commit()
                    db.refresh(row)
                    self._manifest_cache[row.id] = manifest
                    self._class_cache.pop(row.id, None)
                    loaded += 1
                    audit.record(AuditEventCreate(
                        action='plugin.loaded',
                        entity_type='plugin',
                        entity_id=row.id,
                        status='success',
                        after=manifest,
                        metadata={'path': str(manifest_path.relative_to(PROJECT_ROOT))},
                        source='plugin',
                    ))
                except ValidationError as exc:
                    failed += 1
                    self._mark_failed_manifest(db, audit, manifest_path, str(exc))
                except Exception as exc:  # noqa: BLE001
                    failed += 1
                    self._mark_failed_manifest(db, audit, manifest_path, str(exc))
            rows = db.scalars(select(PluginRegistry).order_by(PluginRegistry.kind, PluginRegistry.name)).all()
            return PluginSyncResult(discovered=discovered, loaded=loaded, failed=failed, items=[self._to_read(row) for row in rows])
        finally:
            db.close()

    def list_plugins(self) -> list[PluginRead]:
        db = self._db()
        try:
            rows = db.scalars(select(PluginRegistry).order_by(PluginRegistry.kind, PluginRegistry.name)).all()
            return [self._to_read(row) for row in rows]
        finally:
            db.close()

    def get_plugin(self, plugin_id: str) -> PluginRead | None:
        db = self._db()
        try:
            row = db.get(PluginRegistry, plugin_id)
            return self._to_read(row) if row else None
        finally:
            db.close()

    def load_plugin_class(self, plugin_id: str) -> type[Any]:
        if plugin_id in self._class_cache:
            return self._class_cache[plugin_id]
        manifest = self._manifest_cache.get(plugin_id)
        if manifest is None:
            plugin = self.get_plugin(plugin_id)
            if plugin is None:
                raise KeyError(f'Unknown plugin: {plugin_id}')
            manifest = plugin.manifest
            self._manifest_cache[plugin_id] = manifest
        module_name, class_name = manifest['entrypoint'].split(':', 1)
        module = importlib.import_module(module_name)
        plugin_class = getattr(module, class_name)
        self._class_cache[plugin_id] = plugin_class
        return plugin_class

    def instantiate(self, plugin_id: str, config: dict[str, Any] | None = None):
        plugin_class = self.load_plugin_class(plugin_id)
        manifest = self._manifest_cache.get(plugin_id)
        if manifest is None:
            plugin = self.get_plugin(plugin_id)
            if plugin is None:
                raise KeyError(f'Unknown plugin: {plugin_id}')
            manifest = plugin.manifest
        return plugin_class(manifest=manifest, config=config or {})

    def _mark_failed_manifest(self, db: Session, audit: AuditService, manifest_path: Path, error_text: str) -> None:
        plugin_id = manifest_path.parent.name
        row = db.get(PluginRegistry, plugin_id) or PluginRegistry(id=plugin_id)
        row.name = plugin_id
        row.version = '0.0.0'
        row.kind = 'unknown'
        row.entrypoint = ''
        row.enabled = 0
        row.load_status = 'failed'
        row.manifest_json = '{}'
        row.manifest_hash = None
        row.last_loaded_at = datetime.now(UTC).isoformat()
        row.last_error = error_text
        db.add(row)
        db.commit()
        audit.record(AuditEventCreate(
            action='plugin.load_failed',
            entity_type='plugin',
            entity_id=row.id,
            status='failed',
            message=error_text,
            metadata={'path': str(manifest_path.relative_to(PROJECT_ROOT))},
            source='plugin',
        ))

    @staticmethod
    def _to_read(row: PluginRegistry) -> PluginRead:
        return PluginRead(
            id=row.id,
            name=row.name,
            version=row.version,
            kind=row.kind,
            entrypoint=row.entrypoint,
            enabled=bool(row.enabled),
            load_status=row.load_status,
            manifest=json.loads(row.manifest_json or '{}'),
            manifest_hash=row.manifest_hash,
            last_loaded_at=row.last_loaded_at,
            last_error=row.last_error,
        )
