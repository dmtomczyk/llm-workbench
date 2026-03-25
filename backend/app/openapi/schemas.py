from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class OpenAPISpecImportRequest(BaseModel):
    name: str
    source_type: str
    source: str


class OpenAPISpecRead(BaseModel):
    id: str
    name: str
    source_type: str
    source_ref: str
    operations: list[dict[str, Any]]
    security_schemes: dict[str, Any]
    created_at: str
    updated_at: str
