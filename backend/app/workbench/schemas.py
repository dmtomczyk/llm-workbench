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


class WorkbenchRunStepRead(BaseModel):
    id: str
    step_index: int
    step_type: str
    step_name: str
    status: str
    input_json: dict[str, Any] | None = None
    output_json: dict[str, Any] | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    error_text: str | None = None
    started_at: str | None = None
    finished_at: str | None = None
    created_at: str


class WorkbenchRunStatusResponse(BaseModel):
    ok: bool
    run: dict[str, Any]
    steps: list[WorkbenchRunStepRead] = Field(default_factory=list)
    rendered_prompt: dict[str, Any] | None = None
    provider_result: dict[str, Any] | None = None
