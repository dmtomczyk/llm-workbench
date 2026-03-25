from __future__ import annotations

import os
import time
from typing import Any

import httpx

from app.plugins.base import ExecutionContext, ExecutionResult, LLMProviderPlugin, NormalizedPayload


class OpenAICompatibleProviderPlugin(LLMProviderPlugin):
    async def healthcheck(self) -> dict[str, Any]:
        base_url = self.config.get('base_url')
        if not base_url:
            return {'ok': False, 'message': 'base_url is not configured'}
        headers = self._build_headers()
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{base_url.rstrip('/')}/models", headers=headers)
            return {
                'ok': response.is_success,
                'status_code': response.status_code,
                'message': 'Connected to OpenAI-compatible endpoint' if response.is_success else response.text[:500],
            }
        except Exception as exc:  # noqa: BLE001
            return {'ok': False, 'message': str(exc)}

    async def invoke(self, request: dict[str, Any], context: ExecutionContext) -> ExecutionResult:
        base_url = self.config.get('base_url')
        if not base_url:
            return ExecutionResult(status='failed', summary='Provider base_url is not configured', error='missing_base_url')

        use_chat = bool(request.get('messages'))
        endpoint = '/chat/completions' if use_chat else '/responses'
        body = self._build_request_body(request, use_chat)
        headers = self._build_headers(context)
        started = time.perf_counter()
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(f"{base_url.rstrip('/')}{endpoint}", headers=headers, json=body)
            latency_ms = int((time.perf_counter() - started) * 1000)
            raw = response.json() if response.headers.get('content-type', '').startswith('application/json') else {'text': response.text}
            if not response.is_success:
                return ExecutionResult(
                    status='failed',
                    summary=f'Provider call failed with HTTP {response.status_code}',
                    error=response.text[:1000],
                    metrics={'latency_ms': latency_ms},
                    raw=raw if isinstance(raw, dict) else {'raw': raw},
                )
            text = self._extract_text(raw)
            payload = NormalizedPayload(
                type='text_bundle',
                title='LLM output',
                items=[{'name': 'response.txt', 'text': text}],
                metadata={'model': body.get('model')},
            )
            usage = raw.get('usage') or {}
            return ExecutionResult(
                status='success',
                summary='Provider invocation completed',
                payload=payload,
                metrics={
                    'latency_ms': latency_ms,
                    'prompt_tokens': usage.get('input_tokens') or usage.get('prompt_tokens'),
                    'completion_tokens': usage.get('output_tokens') or usage.get('completion_tokens'),
                    'total_tokens': usage.get('total_tokens'),
                    'finish_reason': raw.get('status') or self._extract_finish_reason(raw),
                },
                raw=raw if isinstance(raw, dict) else {'raw': raw},
            )
        except Exception as exc:  # noqa: BLE001
            return ExecutionResult(status='failed', summary='Provider invocation crashed', error=str(exc))

    def _build_request_body(self, request: dict[str, Any], use_chat: bool) -> dict[str, Any]:
        model = request.get('model') or self.config.get('default_model')
        if use_chat:
            return {
                'model': model,
                'messages': request['messages'],
            }
        input_value = request.get('input') or ''
        if request.get('system_prompt'):
            input_value = (
                f"System:\n{request['system_prompt']}\n\nUser:\n{input_value}"
                if input_value
                else request['system_prompt']
            )
        return {
            'model': model,
            'input': input_value,
        }

    def _build_headers(self, context: ExecutionContext | None = None) -> dict[str, str]:
        headers = {'Content-Type': 'application/json'}
        auth = self.config.get('auth_strategy') or {}
        secret_alias = auth.get('secret_alias')
        secret_value = os.environ.get(secret_alias, '') if secret_alias else ''
        auth_type = auth.get('type')
        if auth_type == 'bearer' and secret_value:
            headers['Authorization'] = f'Bearer {secret_value}'
        elif auth_type == 'custom_header' and secret_value:
            headers[auth.get('header_name') or 'X-API-Key'] = secret_value
        if context is not None:
            headers['X-Correlation-ID'] = context.correlation_id
            headers['X-Request-ID'] = context.request_id
        return headers

    def _extract_text(self, raw: dict[str, Any]) -> str:
        if isinstance(raw.get('output_text'), str):
            return raw['output_text']
        output = raw.get('output')
        if isinstance(output, list):
            texts: list[str] = []
            for item in output:
                for content in item.get('content', []):
                    if isinstance(content, dict) and 'text' in content:
                        texts.append(content['text'])
            if texts:
                return '\n'.join(texts)
        choices = raw.get('choices') or []
        if choices:
            message = choices[0].get('message') or {}
            if isinstance(message.get('content'), str):
                return message['content']
        return raw.get('text', '') if isinstance(raw.get('text'), str) else ''

    def _extract_finish_reason(self, raw: dict[str, Any]) -> str | None:
        choices = raw.get('choices') or []
        if choices:
            return choices[0].get('finish_reason')
        return None
