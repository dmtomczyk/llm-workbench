from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from typing import Any, Literal


PayloadType = Literal["text_bundle", "record_set", "document_set", "mixed_bundle", "binary_artifact"]


@dataclass(slots=True)
class ExecutionContext:
    actor: str
    source: str
    correlation_id: str
    request_id: str
    run_id: str | None = None
    now_iso: str | None = None


@dataclass(slots=True)
class ArtifactRef:
    artifact_type: str
    label: str
    storage_path: str
    media_type: str | None = None
    checksum: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class NormalizedPayload:
    type: PayloadType
    title: str
    items: list[dict[str, Any]] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)
    artifacts: list[ArtifactRef] = field(default_factory=list)


@dataclass(slots=True)
class ExecutionResult:
    status: Literal["success", "failed", "partial_success"]
    summary: str
    payload: NormalizedPayload | None = None
    artifacts: list[ArtifactRef] = field(default_factory=list)
    metrics: dict[str, Any] = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)
    error: str | None = None
    raw: dict[str, Any] | None = None


class BasePlugin(ABC):
    def __init__(self, manifest: dict[str, Any], config: dict[str, Any] | None = None):
        self.manifest = manifest
        self.config = config or {}

    @abstractmethod
    async def healthcheck(self) -> dict[str, Any]:
        raise NotImplementedError


class SourceConnectorPlugin(BasePlugin):
    @abstractmethod
    async def list_actions(self) -> list[dict[str, Any]]:
        raise NotImplementedError

    @abstractmethod
    async def execute(self, action: str, params: dict[str, Any], context: ExecutionContext) -> ExecutionResult:
        raise NotImplementedError


class LLMProviderPlugin(BasePlugin):
    @abstractmethod
    async def invoke(self, request: dict[str, Any], context: ExecutionContext) -> ExecutionResult:
        raise NotImplementedError

    async def invoke_stream(self, request: dict[str, Any], context: ExecutionContext) -> AsyncIterator[dict[str, Any]]:
        result = await self.invoke(request, context)
        text = ''
        if result.payload and result.payload.items:
            text = str(result.payload.items[0].get('text') or '')
        if text:
            yield {'event': 'delta', 'delta': text}
        yield {'event': 'done', 'result': result}


class TransformerPlugin(BasePlugin):
    @abstractmethod
    async def transform(self, payload: NormalizedPayload, options: dict[str, Any], context: ExecutionContext) -> ExecutionResult:
        raise NotImplementedError


class ExporterPlugin(BasePlugin):
    @abstractmethod
    async def export(self, payload: NormalizedPayload, options: dict[str, Any], context: ExecutionContext) -> ExecutionResult:
        raise NotImplementedError
