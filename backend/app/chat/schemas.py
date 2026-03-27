from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class ChatSessionCreate(BaseModel):
    title: str | None = None
    provider_id: str = ''
    model_name: str | None = None
    system_prompt: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class ChatSessionUpdate(BaseModel):
    title: str | None = None
    provider_id: str | None = None
    model_name: str | None = None
    system_prompt: str | None = None
    metadata: dict[str, Any] | None = None


class ChatSessionRead(BaseModel):
    id: str
    title: str
    provider_id: str
    model_name: str | None = None
    system_prompt: str | None = None
    provider_conversation_id: str | None = None
    message_count: int
    metadata: dict[str, Any] = Field(default_factory=dict)
    last_message_preview: str | None = None
    created_at: str
    updated_at: str


class ChatMessageCreate(BaseModel):
    role: str = 'user'
    content: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class ChatMessageRead(BaseModel):
    id: str
    session_id: str
    run_id: str | None = None
    sequence_no: int
    role: str
    content: str
    provider_message_id: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: str


class ChatCompleteRequest(BaseModel):
    content: str | None = None
    model: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    regenerate: bool = False


class ChatCompleteResponse(BaseModel):
    ok: bool
    session: ChatSessionRead
    user_message: ChatMessageRead | None = None
    assistant_message: ChatMessageRead
    run_id: str
    audit_id: str | None = None
    provider_result: dict[str, Any]
