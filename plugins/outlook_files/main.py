from __future__ import annotations

from typing import Any

from app.plugins.base import ExecutionContext, ExecutionResult, NormalizedPayload, SourceConnectorPlugin


class OutlookFilesPlugin(SourceConnectorPlugin):
    async def healthcheck(self) -> dict[str, Any]:
        return {'ok': True, 'message': 'Outlook file parser scaffold ready'}

    async def list_actions(self) -> list[dict[str, Any]]:
        return self.manifest.get('actions', [])

    async def execute(self, action: str, params: dict[str, Any], context: ExecutionContext) -> ExecutionResult:
        payload = NormalizedPayload(type='document_set', title='Outlook placeholder', items=[{'action': action, 'params': params}])
        return ExecutionResult(status='partial_success', summary='Outlook parser stub executed', payload=payload, warnings=['Parser not yet implemented'])
