from __future__ import annotations

from pathlib import Path
from typing import Any

from app.core.config import get_settings
from app.plugins.base import ArtifactRef, ExecutionContext, ExecutionResult, ExporterPlugin, NormalizedPayload


class MarkdownExporterPlugin(ExporterPlugin):
    async def healthcheck(self) -> dict[str, Any]:
        return {'ok': True, 'message': 'markdown exporter ready'}

    async def export(self, payload: NormalizedPayload, options: dict[str, Any], context: ExecutionContext) -> ExecutionResult:
        settings = get_settings()
        filename = options.get('filename') or 'export.md'
        export_path = settings.resolve_path(settings.storage.exports_dir) / filename
        lines = [f"# {payload.title}", ""]
        for item in payload.items:
            if 'text' in item:
                lines.append(str(item['text']))
                lines.append('')
            else:
                lines.append(f"- {item}")
        export_path.write_text('\n'.join(lines), encoding='utf-8')
        artifact = ArtifactRef(artifact_type='export', label=filename, storage_path=str(export_path), media_type='text/markdown')
        return ExecutionResult(status='success', summary='Markdown export created', artifacts=[artifact])
