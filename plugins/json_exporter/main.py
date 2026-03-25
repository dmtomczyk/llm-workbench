from __future__ import annotations

import json
from typing import Any

from app.core.config import get_settings
from app.plugins.base import ArtifactRef, ExecutionContext, ExecutionResult, ExporterPlugin, NormalizedPayload


class JsonExporterPlugin(ExporterPlugin):
    async def healthcheck(self) -> dict[str, Any]:
        return {'ok': True, 'message': 'json exporter ready'}

    async def export(self, payload: NormalizedPayload, options: dict[str, Any], context: ExecutionContext) -> ExecutionResult:
        settings = get_settings()
        filename = options.get('filename') or 'export.json'
        export_path = settings.resolve_path(settings.storage.exports_dir) / filename
        export_path.write_text(json.dumps({'title': payload.title, 'type': payload.type, 'items': payload.items, 'metadata': payload.metadata}, indent=2), encoding='utf-8')
        artifact = ArtifactRef(artifact_type='export', label=filename, storage_path=str(export_path), media_type='application/json')
        return ExecutionResult(status='success', summary='JSON export created', artifacts=[artifact])
