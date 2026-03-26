from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class AuthStrategy(BaseModel):
    type: str
    secret_alias: str | None = None
    header_name: str | None = None
    username_alias: str | None = None
    password_alias: str | None = None


class ProviderCreate(BaseModel):
    name: str
    kind: str
    base_url: str | None = None
    default_model: str | None = None
    spec_id: str | None = None
    operation_id: str | None = None
    invoke_method: str | None = None
    invoke_path: str | None = None
    auth_strategy: AuthStrategy | None = None
    secret_value: str | None = None
    request_template: dict[str, Any] | None = None
    response_extractors: dict[str, Any] | None = None
    capabilities: dict[str, Any] = Field(default_factory=dict)


class ProviderUpdate(BaseModel):
    name: str | None = None
    kind: str | None = None
    default_model: str | None = None
    base_url: str | None = None
    enabled: bool | None = None
    spec_id: str | None = None
    auth_strategy: AuthStrategy | None = None
    secret_value: str | None = None
    clear_saved_secret: bool | None = None
    request_template: dict[str, Any] | None = None
    response_extractors: dict[str, Any] | None = None
    capabilities: dict[str, Any] | None = None
    invoke_method: str | None = None
    invoke_path: str | None = None
    operation_id: str | None = None


class ProviderRead(BaseModel):
    id: str
    name: str
    kind: str
    plugin_id: str
    base_url: str | None = None
    default_model: str | None = None
    enabled: bool
    spec_id: str | None = None
    operation_id: str | None = None
    invoke_method: str | None = None
    invoke_path: str | None = None
    auth_strategy: dict[str, Any] | None = None
    capabilities: dict[str, Any] = Field(default_factory=dict)
    request_template: dict[str, Any] | None = None
    response_extractors: dict[str, Any] | None = None
    last_tested_at: str | None = None
    last_test_result: dict[str, Any] | None = None


class ProviderInvokeRequest(BaseModel):
    model: str | None = None
    system_prompt: str | None = None
    input: str | None = None
    messages: list[dict[str, Any]] | None = None
    variables: dict[str, Any] = Field(default_factory=dict)
    payload: dict[str, Any] | None = None


class ProviderInvokeResponse(BaseModel):
    ok: bool
    data: dict[str, Any]
    audit_id: str | None = None
    correlation_id: str


class ProviderModelListResponse(BaseModel):
    ok: bool
    provider_id: str
    models: list[str] = Field(default_factory=list)
    source: str | None = None
    message: str | None = None


class ProviderModelPreviewRequest(BaseModel):
    kind: str
    base_url: str | None = None
    auth_strategy: AuthStrategy | None = None
    secret_value: str | None = None
