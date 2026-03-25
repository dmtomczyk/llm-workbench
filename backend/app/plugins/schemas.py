from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class PluginRead(BaseModel):
    id: str
    name: str
    version: str
    kind: str
    entrypoint: str
    enabled: bool
    load_status: str
    manifest: dict[str, Any]
    manifest_hash: str | None = None
    last_loaded_at: str | None = None
    last_error: str | None = None


class PluginSyncResult(BaseModel):
    discovered: int
    loaded: int
    failed: int
    items: list[PluginRead] = Field(default_factory=list)
