from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class ConnectorCreate(BaseModel):
    name: str
    plugin_id: str
    base_url: str | None = None
    auth_type: str | None = None
    secret_alias: str | None = None
    config: dict[str, Any] = Field(default_factory=dict)
    enabled: bool = True


class ConnectorUpdate(BaseModel):
    name: str | None = None
    base_url: str | None = None
    auth_type: str | None = None
    secret_alias: str | None = None
    config: dict[str, Any] | None = None
    enabled: bool | None = None


class ConnectorActionRequest(BaseModel):
    params: dict[str, Any] = Field(default_factory=dict)


class ConnectorRead(BaseModel):
    id: str
    name: str
    plugin_id: str
    base_url: str | None = None
    auth_type: str | None = None
    secret_alias: str | None = None
    config: dict[str, Any] = Field(default_factory=dict)
    enabled: bool
    last_tested_at: str | None = None
    last_test_result: dict[str, Any] | None = None
