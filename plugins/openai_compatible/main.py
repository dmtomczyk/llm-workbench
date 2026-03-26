from __future__ import annotations

import json
import os
import time
from collections.abc import AsyncIterator
from typing import Any

import httpx

from app.plugins.base import ExecutionContext, ExecutionResult, LLMProviderPlugin, NormalizedPayload


class OpenAICompatibleProviderPlugin(LLMProviderPlugin):
    async def healthcheck(self) -> dict[str, Any]:
        base_url = self.config.get('base_url')
        if not base_url:
            return {'ok': False, 'message': 'base_url is not configured'}
        auth_error = self._auth_error()
        if auth_error:
            return {'ok': False, 'message': auth_error}
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

        auth_error = self._auth_error()
        if auth_error:
            return ExecutionResult(status='failed', summary='Provider auth is misconfigured', error=auth_error)

        use_chat = bool(request.get('messages'))
        endpoint = '/chat/completions' if use_chat else '/responses'
        model = request.get('model') or self.config.get('default_model')
        if not model:
            return ExecutionResult(
                status='failed',
                summary='Provider model is not configured',
                error='Set a default model on the provider or a model override on the chat session before sending messages.',
            )
        body = self._build_request_body(request, use_chat, model)
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
                    summary=self._error_summary(response.status_code, raw, response.text),
                    error=response.text[:1000],
                    metrics={'latency_ms': latency_ms, 'status_code': response.status_code},
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

    async def invoke_stream(self, request: dict[str, Any], context: ExecutionContext) -> AsyncIterator[dict[str, Any]]:
        base_url = self.config.get('base_url')
        if not base_url:
            yield {'event': 'error', 'message': 'Provider base_url is not configured'}
            return
        auth_error = self._auth_error()
        if auth_error:
            yield {'event': 'error', 'message': auth_error}
            return
        use_chat = bool(request.get('messages'))
        if not use_chat:
            async for event in super().invoke_stream(request, context):
                yield event
            return
        model = request.get('model') or self.config.get('default_model')
        if not model:
            yield {'event': 'error', 'message': 'Provider model is not configured'}
            return
        body = self._build_request_body(request, use_chat, model)
        body['stream'] = True
        headers = self._build_headers(context)
        started = time.perf_counter()
        chunks: list[str] = []
        usage: dict[str, Any] = {}
        finish_reason = None
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream('POST', f"{base_url.rstrip('/')}/chat/completions", headers=headers, json=body) as response:
                    if not response.is_success:
                        text = await response.aread()
                        raw_text = text.decode('utf-8', errors='ignore')
                        raw = json.loads(raw_text) if raw_text.strip().startswith('{') else {'text': raw_text}
                        yield {'event': 'error', 'message': self._error_summary(response.status_code, raw, raw_text), 'detail': raw}
                        return
                    async for line in response.aiter_lines():
                        if not line or not line.startswith('data:'):
                            continue
                        payload = line[5:].strip()
                        if payload == '[DONE]':
                            break
                        try:
                            data = json.loads(payload)
                        except Exception:
                            continue
                        choice = ((data.get('choices') or [{}])[0]) if isinstance(data, dict) else {}
                        delta = (choice.get('delta') or {}).get('content')
                        if delta:
                            chunks.append(delta)
                            yield {'event': 'delta', 'delta': delta}
                        if choice.get('finish_reason'):
                            finish_reason = choice.get('finish_reason')
                        if isinstance(data.get('usage'), dict):
                            usage = data.get('usage')
            latency_ms = int((time.perf_counter() - started) * 1000)
            text = ''.join(chunks)
            result = ExecutionResult(
                status='success',
                summary='Provider invocation completed',
                payload=NormalizedPayload(type='text_bundle', title='LLM output', items=[{'name': 'response.txt', 'text': text}], metadata={'model': model}),
                metrics={
                    'latency_ms': latency_ms,
                    'prompt_tokens': usage.get('input_tokens') or usage.get('prompt_tokens'),
                    'completion_tokens': usage.get('output_tokens') or usage.get('completion_tokens'),
                    'total_tokens': usage.get('total_tokens'),
                    'finish_reason': finish_reason,
                },
                raw={'choices': [{'message': {'content': text}, 'finish_reason': finish_reason}], 'usage': usage},
            )
            yield {'event': 'done', 'result': result}
        except Exception as exc:  # noqa: BLE001
            yield {'event': 'error', 'message': str(exc)}

    def _build_request_body(self, request: dict[str, Any], use_chat: bool, model: str) -> dict[str, Any]:
        max_output_tokens = request.get('max_output_tokens')
        if use_chat:
            body = {
                'model': model,
                'messages': request['messages'],
            }
            if max_output_tokens:
                body['max_tokens'] = max_output_tokens
            return body
        input_value = request.get('input') or ''
        if request.get('system_prompt'):
            input_value = (
                f"System:\n{request['system_prompt']}\n\nUser:\n{input_value}"
                if input_value
                else request['system_prompt']
            )
        body = {
            'model': model,
            'input': input_value,
        }
        if max_output_tokens:
            body['max_output_tokens'] = max_output_tokens
        return body

    def _build_headers(self, context: ExecutionContext | None = None) -> dict[str, str]:
        headers = {'Content-Type': 'application/json'}
        auth = self.config.get('auth_strategy') or {}
        secret_alias = auth.get('secret_alias')
        secret_value = auth.get('secret_value') or (os.environ.get(secret_alias, '') if secret_alias else '')
        auth_type = auth.get('type')
        if auth_type == 'bearer' and secret_value:
            headers['Authorization'] = f'Bearer {secret_value}'
        elif auth_type == 'custom_header' and secret_value:
            headers[auth.get('header_name') or 'X-API-Key'] = secret_value
        if context is not None:
            headers['X-Correlation-ID'] = context.correlation_id
            headers['X-Request-ID'] = context.request_id
        return headers

    def _auth_error(self) -> str | None:
        auth = self.config.get('auth_strategy') or {}
        if auth.get('type') != 'bearer':
            return None
        secret_alias = auth.get('secret_alias')
        if not secret_alias:
            return 'Bearer auth is configured but no secret alias is set.'
        if not (auth.get('secret_value') or os.environ.get(secret_alias)):
            return f'Bearer auth expects either a saved token or environment variable {secret_alias!r}, but neither is set. BRIDGE sends Authorization: Bearer <token> using the saved token or the value of that env var.'
        return None

    def _error_summary(self, status_code: int, raw: Any, fallback_text: str) -> str:
        detail = None
        error_code = None
        if isinstance(raw, dict):
            error = raw.get('error')
            if isinstance(error, dict):
                detail = error.get('message') or error.get('code') or error.get('type')
                error_code = error.get('code') if isinstance(error.get('code'), str) else None
            if detail is None:
                message = raw.get('message') or raw.get('detail')
                if isinstance(message, str) and message:
                    detail = message
        if detail is None:
            trimmed = (fallback_text or '').strip()[:300]
            detail = trimmed or None

        hint = None
        detail_text = detail.lower() if isinstance(detail, str) else ''
        if error_code == 'model_not_found' or 'model' in detail_text and ('not found' in detail_text or 'does not exist' in detail_text):
            hint = 'Hint: open the provider or chat settings and pick a model returned by /models for this provider.'
        elif 'unsupported' in detail_text and 'model' in detail_text:
            hint = 'Hint: the selected model may not support this endpoint; try another listed model.'
        elif 'messages' in detail_text and 'required' in detail_text:
            hint = 'Hint: this provider is using the chat-completions shape; verify the upstream endpoint is OpenAI-compatible.'

        summary = f'Provider call failed with HTTP {status_code}'
        if detail:
            summary += f': {detail}'
        if hint:
            summary += f' {hint}'
        return summary

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
