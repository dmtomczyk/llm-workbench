from __future__ import annotations

from typing import Any

from app.plugins.base import ExecutionContext, ExecutionResult, NormalizedPayload, TransformerPlugin


class BuiltinNormalizerPlugin(TransformerPlugin):
    async def healthcheck(self) -> dict[str, Any]:
        return {'ok': True, 'message': 'builtin transformer ready'}

    async def transform(self, payload: NormalizedPayload, options: dict[str, Any], context: ExecutionContext) -> ExecutionResult:
        return ExecutionResult(status='success', summary='Payload passed through builtin normalizer', payload=payload)
