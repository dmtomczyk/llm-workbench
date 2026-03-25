from __future__ import annotations

from contextvars import ContextVar
from dataclasses import dataclass
from uuid import uuid4

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


request_id_var: ContextVar[str | None] = ContextVar("request_id", default=None)
correlation_id_var: ContextVar[str | None] = ContextVar("correlation_id", default=None)
source_var: ContextVar[str] = ContextVar("source", default="ui")
actor_var: ContextVar[str] = ContextVar("actor", default="local-user")


@dataclass(slots=True)
class RequestContext:
    request_id: str
    correlation_id: str
    source: str = "ui"
    actor: str = "local-user"


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID") or f"req_{uuid4().hex}"
        correlation_id = request.headers.get("X-Correlation-ID") or f"corr_{uuid4().hex}"
        actor = request.headers.get("X-Actor", "local-user")
        source = request.headers.get("X-Source", "ui")

        tokens = [
            request_id_var.set(request_id),
            correlation_id_var.set(correlation_id),
            actor_var.set(actor),
            source_var.set(source),
        ]
        request.state.request_context = RequestContext(
            request_id=request_id,
            correlation_id=correlation_id,
            actor=actor,
            source=source,
        )
        try:
            response: Response = await call_next(request)
        finally:
            request_id_var.reset(tokens[0])
            correlation_id_var.reset(tokens[1])
            actor_var.reset(tokens[2])
            source_var.reset(tokens[3])
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Correlation-ID"] = correlation_id
        return response


def get_request_context() -> RequestContext:
    return RequestContext(
        request_id=request_id_var.get() or f"req_{uuid4().hex}",
        correlation_id=correlation_id_var.get() or f"corr_{uuid4().hex}",
        actor=actor_var.get(),
        source=source_var.get(),
    )
