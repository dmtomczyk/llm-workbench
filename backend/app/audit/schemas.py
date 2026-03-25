from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class AuditEventCreate(BaseModel):
    action: str
    entity_type: str
    entity_id: str | None = None
    status: str = "success"
    message: str | None = None
    before: dict[str, Any] | None = None
    after: dict[str, Any] | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    run_id: str | None = None
    source: str | None = None


class AuditEventRead(BaseModel):
    id: str
    occurred_at: str
    actor: str
    actor_type: str
    action: str
    entity_type: str
    entity_id: str | None = None
    status: str
    source: str
    request_id: str | None = None
    correlation_id: str | None = None
    run_id: str | None = None
    message: str | None = None
    before: dict[str, Any] | None = None
    after: dict[str, Any] | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
