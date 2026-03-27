from __future__ import annotations

from time import perf_counter

import httpx
from fastapi import HTTPException


class HttpImportFetcher:
    async def fetch(self, *, url: str, method: str = 'GET', headers: dict | None = None, timeout_seconds: int = 15, body: str | None = None) -> dict:
        started = perf_counter()
        try:
            async with httpx.AsyncClient(timeout=timeout_seconds, follow_redirects=True) as client:
                response = await client.request(method.upper(), url, headers=headers or {}, content=body.encode('utf-8') if body else None)
            elapsed_ms = int((perf_counter() - started) * 1000)
        except httpx.ConnectTimeout as exc:
            raise HTTPException(status_code=502, detail={'message': f'Connection timed out for {url}', 'type': 'timeout'}) from exc
        except httpx.ReadTimeout as exc:
            raise HTTPException(status_code=502, detail={'message': f'Read timed out for {url}', 'type': 'timeout'}) from exc
        except httpx.ConnectError as exc:
            message = str(exc)
            error_type = 'tls_error' if 'CERTIFICATE_VERIFY_FAILED' in message or 'certificate verify failed' in message.lower() else 'connect_error'
            raise HTTPException(status_code=502, detail={'message': message or f'Failed to connect to {url}', 'type': error_type}) from exc
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=502, detail={'message': str(exc), 'type': 'http_error'}) from exc

        diagnostics = {
            'url': url,
            'method': method.upper(),
            'status_code': response.status_code,
            'content_type': response.headers.get('content-type'),
            'elapsed_ms': elapsed_ms,
        }
        if response.status_code >= 400:
            raise HTTPException(status_code=502, detail={'message': f'HTTP {response.status_code} from {url}', 'type': 'http_status_error', 'diagnostics': diagnostics})
        return {
            'url': url,
            'method': method.upper(),
            'content': response.content,
            'media_type': response.headers.get('content-type') or 'application/octet-stream',
            'diagnostics': diagnostics,
        }
