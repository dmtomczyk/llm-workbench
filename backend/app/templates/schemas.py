from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class TemplateCreate(BaseModel):
    slug: str
    name: str
    description: str | None = None
    system_prompt: str | None = None
    user_prompt_template: str
    output_schema: dict[str, Any] | None = None
    default_vars: dict[str, Any] = Field(default_factory=dict)
    tags: list[str] = Field(default_factory=list)


class TemplateUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    system_prompt: str | None = None
    user_prompt_template: str | None = None
    output_schema: dict[str, Any] | None = None
    default_vars: dict[str, Any] | None = None
    tags: list[str] | None = None


class TemplateRead(BaseModel):
    id: str
    slug: str
    name: str
    description: str | None = None
    system_prompt: str | None = None
    user_prompt_template: str
    output_schema: dict[str, Any] | None = None
    default_vars: dict[str, Any] = Field(default_factory=dict)
    tags: list[str] = Field(default_factory=list)
    created_at: str
    updated_at: str
