from __future__ import annotations

import os
import time
from typing import Any

import httpx
from jinja2 import Template

from app.plugins.base import ExecutionContext, ExecutionResult, LLMProviderPlugin, NormalizedPayload


class GenericOpenAPIProviderPlugin(LLMProviderPlugin):
    async def healthcheck(self) -> dict[str, Any]:
        if not self.config.get('base_url'):
            return {'ok': False, 'message': 'base_url is not configured'}
        if not self.config.get('invoke_path'):
            return {'ok': False, 'message': 'invoke_path is not configured'}
        auth_error = self._auth_error()
        if auth_error:
            return {'ok': False, 'message': auth_error}
        return {'ok': True, 'message': 'Configuration looks valid'}

    async def invoke(self, request: dict[str, Any], context: ExecutionContext) -> ExecutionResult:
        base_url = self.config.get('base_url')
        method = (self.config.get('invoke_method') or 'POST').upper()
        invoke_path = self.config.get('invoke_path') or '/'
        auth_error = self._auth_error()
        if auth_error:
            return ExecutionResult(status='failed', summary='Provider auth is misconfigured', error=auth_error)
        rendered = self._render_template(self.config.get('request_template') or {}, request)
        headers = rendered.get('headers') or {}
        headers.update(self._auth_headers())
        headers['X-Correlation-ID'] = context.correlation_id
        headers['X-Request-ID'] = context.request_id
        started = time.perf_counter()
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.request(method, f"{base_url.rstrip('/')}{invoke_path}", headers=headers, json=rendered.get('body'))
            latency_ms = int((time.perf_counter() - started) * 1000)
            raw = response.json() if response.headers.get('content-type', '').startswith('application/json') else {'text': response.text}
            text = self._extract_value(raw, (self.config.get('response_extractors') or {}).get('text'))
            payload = NormalizedPayload(
                type='mixed_bundle',
                title='Generic OpenAPI response',
                items=[{'text': text, 'response': raw}],
                metadata={'status_code': response.status_code},
            )
            return ExecutionResult(
                status='success' if response.is_success else 'failed',
                summary='Generic OpenAPI invocation completed' if response.is_success else f'HTTP {response.status_code}',
                payload=payload,
                metrics={'latency_ms': latency_ms, 'status_code': response.status_code},
                raw=raw if isinstance(raw, dict) else {'raw': raw},
                error=None if response.is_success else str(raw)[:1000],
            )
        except Exception as exc:  # noqa: BLE001
            return ExecutionResult(status='failed', summary='Generic OpenAPI invocation crashed', error=str(exc))

    def _render_template(self, value: Any, request: dict[str, Any]) -> Any:
        context = {
            'model': request.get('model') or self.config.get('default_model'),
            'rendered_prompt': request.get('input'),
            'input': request.get('input'),
            'vars': request.get('variables', {}),
            'payload': request.get('payload'),
            'secrets': {alias: os.environ.get(alias) for alias in self._referenced_secret_aliases()},
        }
        if isinstance(value, str):
            return Template(value).render(**context)
        if isinstance(value, list):
            return [self._render_template(item, request) for item in value]
        if isinstance(value, dict):
            return {key: self._render_template(item, request) for key, item in value.items()}
        return value

    def _auth_headers(self) -> dict[str, str]:
        auth = self.config.get('auth_strategy') or {}
        secret_alias = auth.get('secret_alias')
        secret_value = auth.get('secret_value') or (os.environ.get(secret_alias, '') if secret_alias else '')
        auth_type = auth.get('type')
        if auth_type == 'bearer' and secret_value:
            return {'Authorization': f'Bearer {secret_value}'}
        if auth_type == 'custom_header' and secret_value:
            return {auth.get('header_name') or 'X-API-Key': secret_value}
        return {}

    def _auth_error(self) -> str | None:
        auth = self.config.get('auth_strategy') or {}
        auth_type = auth.get('type')
        secret_alias = auth.get('secret_alias')
        spec_context = self.config.get('spec_context') or {}
        requirement = self._describe_auth_requirement(spec_context)

        if auth_type == 'bearer':
            if not secret_alias:
                return self._format_auth_error('Bearer auth is configured but no secret alias is set.', requirement)
            if not (auth.get('secret_value') or os.environ.get(secret_alias)):
                return self._format_auth_error(
                    f'Bearer auth expects either a saved token or environment variable {secret_alias!r}, but neither is set. BRIDGE sends Authorization: Bearer <token> using the saved token or the value of that env var.',
                    requirement,
                )
            return None

        if requirement == 'bearer_header':
            return self._format_auth_error(
                'This OpenAPI operation requires bearer authentication in the Authorization header, but the provider auth strategy is not configured as bearer.',
                requirement,
            )

        return None

    def _describe_auth_requirement(self, spec_context: dict[str, Any]) -> str | None:
        requirements = spec_context.get('operation_security')
        if requirements is None:
            requirements = spec_context.get('global_security')
        if not requirements:
            return None
        schemes = spec_context.get('security_schemes') or {}
        for requirement in requirements:
            if not isinstance(requirement, dict):
                continue
            for scheme_name in requirement.keys():
                scheme = schemes.get(scheme_name) or {}
                if scheme.get('type') == 'http' and str(scheme.get('scheme') or '').lower() == 'bearer':
                    if str(scheme.get('in') or 'header').lower() == 'header':
                        return 'bearer_header'
        return None

    @staticmethod
    def _format_auth_error(message: str, requirement: str | None) -> str:
        if requirement == 'bearer_header':
            return f'{message} Required auth from imported spec: bearer token in Authorization header.'
        return message

    def _extract_value(self, raw: Any, path: str | None) -> Any:
        if not path:
            return raw
        if path.startswith('$.'):
            path = path[2:]
        current = raw
        for part in path.split('.'):
            if isinstance(current, dict):
                current = current.get(part)
            else:
                return None
        return current

    def _referenced_secret_aliases(self) -> set[str]:
        auth = self.config.get('auth_strategy') or {}
        aliases = {auth.get('secret_alias')} if auth.get('secret_alias') else set()
        return {alias for alias in aliases if alias}
