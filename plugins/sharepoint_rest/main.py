from __future__ import annotations

from typing import Any

from app.plugins.base import ExecutionContext, ExecutionResult, NormalizedPayload, SourceConnectorPlugin


class SharePointRestPlugin(SourceConnectorPlugin):
    async def healthcheck(self) -> dict[str, Any]:
        return {'ok': False, 'message': 'SharePoint connector implementation is scaffolded but not wired yet'}

    async def list_actions(self) -> list[dict[str, Any]]:
        return self.manifest.get('actions', [])

    async def execute(self, action: str, params: dict[str, Any], context: ExecutionContext) -> ExecutionResult:
        payload = NormalizedPayload(type='mixed_bundle', title='SharePoint placeholder', items=[{'action': action, 'params': params}])
        return ExecutionResult(status='partial_success', summary='SharePoint connector stub executed', payload=payload, warnings=['Connector not yet implemented'])
