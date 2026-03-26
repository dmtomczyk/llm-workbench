from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class WorkflowCreate(BaseModel):
    slug: str
    name: str
    description: str | None = None
    definition: dict[str, Any]
    enabled: bool = True


class WorkflowUpdate(BaseModel):
    slug: str | None = None
    name: str | None = None
    description: str | None = None
    definition: dict[str, Any] | None = None
    enabled: bool | None = None


class WorkflowRead(BaseModel):
    id: str
    slug: str
    name: str
    description: str | None = None
    definition: dict[str, Any]
    enabled: bool
    version_no: int
    created_at: str
    updated_at: str


class WorkflowRunRequest(BaseModel):
    dataset_id: str | None = None
    provider_id: str | None = None
    template_id: str | None = None
    model: str | None = None
    variables: dict[str, Any] = Field(default_factory=dict)


class WorkflowRunResponse(BaseModel):
    ok: bool
    run_id: str
    workflow_id: str
    status: str
    outputs: dict[str, Any] = Field(default_factory=dict)


class WorkflowRunStepRead(BaseModel):
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


class WorkflowRunStatusResponse(BaseModel):
    ok: bool
    run: dict[str, Any]
    steps: list[WorkflowRunStepRead] = Field(default_factory=list)
    outputs: dict[str, Any] = Field(default_factory=dict)
