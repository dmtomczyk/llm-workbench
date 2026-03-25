from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class WorkbenchRunRequest(BaseModel):
    dataset_id: str
    provider_id: str
    template_id: str | None = None
    template_slug: str | None = None
    model: str | None = None
    variables: dict[str, Any] = Field(default_factory=dict)
    system_prompt_override: str | None = None
    user_prompt_override: str | None = None


class WorkbenchRunResponse(BaseModel):
    ok: bool
    run_id: str
    audit_id: str | None = None
    rendered_prompt: dict[str, Any]
    provider_result: dict[str, Any]
