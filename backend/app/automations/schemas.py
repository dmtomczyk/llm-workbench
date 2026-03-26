from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class AutomationCreate(BaseModel):
    name: str
    enabled: bool = True
    schedule_type: Literal['interval', 'at', 'daily']
    interval_seconds: int | None = None
    run_at: str | None = None
    time_of_day: str | None = None
    timezone: str = 'America/New_York'
    target_type: Literal['workflow', 'custom_prompt', 'template_prompt']
    workflow_id: str | None = None
    provider_id: str | None = None
    template_id: str | None = None
    dataset_id: str | None = None
    model: str | None = None
    system_prompt: str | None = None
    prompt_text: str | None = None
    variables: dict[str, Any] = Field(default_factory=dict)


class AutomationUpdate(BaseModel):
    name: str | None = None
    enabled: bool | None = None
    schedule_type: Literal['interval', 'at', 'daily'] | None = None
    interval_seconds: int | None = None
    run_at: str | None = None
    time_of_day: str | None = None
    timezone: str | None = None
    target_type: Literal['workflow', 'custom_prompt', 'template_prompt'] | None = None
    workflow_id: str | None = None
    provider_id: str | None = None
    template_id: str | None = None
    dataset_id: str | None = None
    model: str | None = None
    system_prompt: str | None = None
    prompt_text: str | None = None
    variables: dict[str, Any] | None = None


class AutomationRead(BaseModel):
    id: str
    name: str
    enabled: bool
    schedule_type: str
    interval_seconds: int | None = None
    run_at: str | None = None
    time_of_day: str | None = None
    timezone: str
    target_type: str
    workflow_id: str | None = None
    provider_id: str | None = None
    template_id: str | None = None
    dataset_id: str | None = None
    model: str | None = None
    system_prompt: str | None = None
    prompt_text: str | None = None
    variables: dict[str, Any] = Field(default_factory=dict)
    last_run_at: str | None = None
    next_run_at: str | None = None
    created_at: str
    updated_at: str


class AutomationRunResponse(BaseModel):
    ok: bool
    automation_id: str
    run_id: str
    status: str
    summary: str | None = None


class AutomationRunsResponse(BaseModel):
    ok: bool
    runs: list[dict[str, Any]] = Field(default_factory=list)


class AutomationRunDetailResponse(BaseModel):
    ok: bool
    run: dict[str, Any]
    steps: list[dict[str, Any]] = Field(default_factory=list)
