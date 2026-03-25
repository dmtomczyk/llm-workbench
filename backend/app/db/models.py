from __future__ import annotations

from sqlalchemy import Index, Integer, Text, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class TimestampTextMixin:
    created_at: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("CURRENT_TIMESTAMP"))
    updated_at: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("CURRENT_TIMESTAMP"))


class SettingsEntry(Base):
    __tablename__ = "settings"

    key: Mapped[str] = mapped_column(Text, primary_key=True)
    value_json: Mapped[str] = mapped_column(Text, nullable=False)
    updated_at: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("CURRENT_TIMESTAMP"))


class PluginRegistry(Base, TimestampTextMixin):
    __tablename__ = "plugin_registry"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    version: Mapped[str] = mapped_column(Text, nullable=False)
    kind: Mapped[str] = mapped_column(Text, nullable=False)
    entrypoint: Mapped[str] = mapped_column(Text, nullable=False)
    enabled: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("1"))
    load_status: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'pending'"))
    manifest_json: Mapped[str] = mapped_column(Text, nullable=False)
    manifest_hash: Mapped[str | None] = mapped_column(Text)
    last_loaded_at: Mapped[str | None] = mapped_column(Text)
    last_healthcheck_at: Mapped[str | None] = mapped_column(Text)
    last_healthcheck_json: Mapped[str | None] = mapped_column(Text)
    last_error: Mapped[str | None] = mapped_column(Text)


class OpenAPISpec(Base, TimestampTextMixin):
    __tablename__ = "openapi_spec"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    source_type: Mapped[str] = mapped_column(Text, nullable=False)
    source_ref: Mapped[str] = mapped_column(Text, nullable=False)
    raw_text: Mapped[str | None] = mapped_column(Text)
    parsed_json: Mapped[str | None] = mapped_column(Text)
    operations_json: Mapped[str | None] = mapped_column(Text)
    security_schemes_json: Mapped[str | None] = mapped_column(Text)


class Connector(Base, TimestampTextMixin):
    __tablename__ = "connector"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    plugin_id: Mapped[str] = mapped_column(Text, nullable=False)
    base_url: Mapped[str | None] = mapped_column(Text)
    auth_type: Mapped[str | None] = mapped_column(Text)
    secret_alias: Mapped[str | None] = mapped_column(Text)
    config_json: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'{}'"))
    enabled: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("1"))
    last_tested_at: Mapped[str | None] = mapped_column(Text)
    last_test_result_json: Mapped[str | None] = mapped_column(Text)


class LLMProvider(Base, TimestampTextMixin):
    __tablename__ = "llm_provider"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    plugin_id: Mapped[str] = mapped_column(Text, nullable=False)
    spec_id: Mapped[str | None] = mapped_column(Text)
    connector_id: Mapped[str | None] = mapped_column(Text)
    provider_kind: Mapped[str] = mapped_column(Text, nullable=False)
    base_url: Mapped[str | None] = mapped_column(Text)
    default_model: Mapped[str | None] = mapped_column(Text)
    auth_type: Mapped[str | None] = mapped_column(Text)
    secret_alias: Mapped[str | None] = mapped_column(Text)
    operation_id: Mapped[str | None] = mapped_column(Text)
    invoke_method: Mapped[str | None] = mapped_column(Text)
    invoke_path: Mapped[str | None] = mapped_column(Text)
    request_template_json: Mapped[str | None] = mapped_column(Text)
    response_extractors_json: Mapped[str | None] = mapped_column(Text)
    capabilities_json: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'{}'"))
    enabled: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("1"))
    last_tested_at: Mapped[str | None] = mapped_column(Text)
    last_test_result_json: Mapped[str | None] = mapped_column(Text)


class PromptTemplate(Base, TimestampTextMixin):
    __tablename__ = "prompt_template"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    slug: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    system_prompt: Mapped[str | None] = mapped_column(Text)
    user_prompt_template: Mapped[str] = mapped_column(Text, nullable=False)
    output_schema_json: Mapped[str | None] = mapped_column(Text)
    default_vars_json: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'{}'"))
    tags_json: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'[]'"))


class Dataset(Base, TimestampTextMixin):
    __tablename__ = "dataset"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    source_type: Mapped[str] = mapped_column(Text, nullable=False)
    source_ref: Mapped[str | None] = mapped_column(Text)
    media_type: Mapped[str | None] = mapped_column(Text)
    latest_version_no: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    metadata_json: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'{}'"))


class DatasetVersion(Base):
    __tablename__ = "dataset_version"
    __table_args__ = (Index("idx_dataset_version_dataset_id", "dataset_id", "version_no"),)

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    dataset_id: Mapped[str] = mapped_column(Text, nullable=False)
    version_no: Mapped[int] = mapped_column(Integer, nullable=False)
    storage_path: Mapped[str] = mapped_column(Text, nullable=False)
    normalized_payload_path: Mapped[str | None] = mapped_column(Text)
    checksum: Mapped[str | None] = mapped_column(Text)
    row_count: Mapped[int | None] = mapped_column(Integer)
    metadata_json: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'{}'"))
    created_at: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("CURRENT_TIMESTAMP"))


class ImportRecord(Base):
    __tablename__ = "import_record"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    dataset_id: Mapped[str | None] = mapped_column(Text)
    import_type: Mapped[str] = mapped_column(Text, nullable=False)
    original_filename: Mapped[str | None] = mapped_column(Text)
    storage_path: Mapped[str] = mapped_column(Text, nullable=False)
    parser_used: Mapped[str | None] = mapped_column(Text)
    media_type: Mapped[str | None] = mapped_column(Text)
    byte_size: Mapped[int | None] = mapped_column(Integer)
    checksum: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'created'"))
    details_json: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'{}'"))
    created_at: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("CURRENT_TIMESTAMP"))


class Workflow(Base, TimestampTextMixin):
    __tablename__ = "workflow"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    slug: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    definition_json: Mapped[str] = mapped_column(Text, nullable=False)
    enabled: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("1"))
    version_no: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("1"))


class ScheduledJob(Base, TimestampTextMixin):
    __tablename__ = "scheduled_job"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    workflow_id: Mapped[str] = mapped_column(Text, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    cron_expr: Mapped[str] = mapped_column(Text, nullable=False)
    timezone: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'America/New_York'"))
    enabled: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("1"))
    timeout_seconds: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("1800"))
    max_retries: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    retry_backoff_seconds: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("60"))
    concurrency_policy: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'forbid'"))
    last_run_at: Mapped[str | None] = mapped_column(Text)
    next_run_at: Mapped[str | None] = mapped_column(Text)


class Run(Base):
    __tablename__ = "run"
    __table_args__ = (
        Index("idx_run_status", "status"),
        Index("idx_run_created_at", "created_at"),
        Index("idx_run_job_id", "job_id"),
        Index("idx_run_workflow_id", "workflow_id"),
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    parent_run_id: Mapped[str | None] = mapped_column(Text)
    run_type: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'queued'"))
    workflow_id: Mapped[str | None] = mapped_column(Text)
    job_id: Mapped[str | None] = mapped_column(Text)
    dataset_id: Mapped[str | None] = mapped_column(Text)
    provider_id: Mapped[str | None] = mapped_column(Text)
    connector_id: Mapped[str | None] = mapped_column(Text)
    summary: Mapped[str | None] = mapped_column(Text)
    input_ref: Mapped[str | None] = mapped_column(Text)
    output_ref: Mapped[str | None] = mapped_column(Text)
    metadata_json: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'{}'"))
    error_text: Mapped[str | None] = mapped_column(Text)
    started_at: Mapped[str | None] = mapped_column(Text)
    finished_at: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("CURRENT_TIMESTAMP"))


class RunStep(Base):
    __tablename__ = "run_step"
    __table_args__ = (Index("idx_run_step_run_id", "run_id", "step_index"),)

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    run_id: Mapped[str] = mapped_column(Text, nullable=False)
    step_index: Mapped[int] = mapped_column(Integer, nullable=False)
    step_type: Mapped[str] = mapped_column(Text, nullable=False)
    step_name: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'queued'"))
    input_json: Mapped[str | None] = mapped_column(Text)
    output_json: Mapped[str | None] = mapped_column(Text)
    metadata_json: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'{}'"))
    error_text: Mapped[str | None] = mapped_column(Text)
    started_at: Mapped[str | None] = mapped_column(Text)
    finished_at: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("CURRENT_TIMESTAMP"))


class Artifact(Base):
    __tablename__ = "artifact"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    run_id: Mapped[str | None] = mapped_column(Text)
    artifact_type: Mapped[str] = mapped_column(Text, nullable=False)
    label: Mapped[str] = mapped_column(Text, nullable=False)
    storage_path: Mapped[str] = mapped_column(Text, nullable=False)
    media_type: Mapped[str | None] = mapped_column(Text)
    size_bytes: Mapped[int | None] = mapped_column(Integer)
    checksum: Mapped[str | None] = mapped_column(Text)
    metadata_json: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'{}'"))
    created_at: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("CURRENT_TIMESTAMP"))


class ExportRecord(Base):
    __tablename__ = "export_record"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    run_id: Mapped[str] = mapped_column(Text, nullable=False)
    export_type: Mapped[str] = mapped_column(Text, nullable=False)
    target_name: Mapped[str | None] = mapped_column(Text)
    storage_path: Mapped[str] = mapped_column(Text, nullable=False)
    media_type: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("CURRENT_TIMESTAMP"))


class ChatSession(Base, TimestampTextMixin):
    __tablename__ = "chat_session"
    __table_args__ = (
        Index("idx_chat_session_updated_at", "updated_at"),
        Index("idx_chat_session_provider_id", "provider_id"),
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    provider_id: Mapped[str] = mapped_column(Text, nullable=False)
    model_name: Mapped[str | None] = mapped_column(Text)
    system_prompt: Mapped[str | None] = mapped_column(Text)
    provider_conversation_id: Mapped[str | None] = mapped_column(Text)
    message_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    metadata_json: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'{}'"))


class ChatMessage(Base):
    __tablename__ = "chat_message"
    __table_args__ = (
        Index("idx_chat_message_session_id", "session_id", "sequence_no"),
        Index("idx_chat_message_run_id", "run_id"),
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    session_id: Mapped[str] = mapped_column(Text, nullable=False)
    run_id: Mapped[str | None] = mapped_column(Text)
    sequence_no: Mapped[int] = mapped_column(Integer, nullable=False)
    role: Mapped[str] = mapped_column(Text, nullable=False)
    content_text: Mapped[str] = mapped_column(Text, nullable=False)
    provider_message_id: Mapped[str | None] = mapped_column(Text)
    metadata_json: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'{}'"))
    created_at: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("CURRENT_TIMESTAMP"))


class AuditEvent(Base):
    __tablename__ = "audit_event"
    __table_args__ = (
        Index("idx_audit_event_occurred_at", "occurred_at"),
        Index("idx_audit_event_action", "action"),
        Index("idx_audit_event_correlation_id", "correlation_id"),
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    occurred_at: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("CURRENT_TIMESTAMP"))
    actor: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'local-user'"))
    actor_type: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'user'"))
    action: Mapped[str] = mapped_column(Text, nullable=False)
    entity_type: Mapped[str] = mapped_column(Text, nullable=False)
    entity_id: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str] = mapped_column(Text, nullable=False)
    request_id: Mapped[str | None] = mapped_column(Text)
    correlation_id: Mapped[str | None] = mapped_column(Text)
    run_id: Mapped[str | None] = mapped_column(Text)
    session_id: Mapped[str | None] = mapped_column(Text)
    message: Mapped[str | None] = mapped_column(Text)
    before_json: Mapped[str | None] = mapped_column(Text)
    after_json: Mapped[str | None] = mapped_column(Text)
    metadata_json: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'{}'"))
    redaction_level: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'standard'"))


class LLMInteraction(Base):
    __tablename__ = "llm_interaction"
    __table_args__ = (Index("idx_llm_interaction_run_id", "run_id"),)

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    run_id: Mapped[str] = mapped_column(Text, nullable=False)
    provider_id: Mapped[str | None] = mapped_column(Text)
    model_name: Mapped[str | None] = mapped_column(Text)
    request_json: Mapped[str | None] = mapped_column(Text)
    response_json: Mapped[str | None] = mapped_column(Text)
    request_artifact_id: Mapped[str | None] = mapped_column(Text)
    response_artifact_id: Mapped[str | None] = mapped_column(Text)
    prompt_tokens: Mapped[int | None] = mapped_column(Integer)
    completion_tokens: Mapped[int | None] = mapped_column(Integer)
    total_tokens: Mapped[int | None] = mapped_column(Integer)
    latency_ms: Mapped[int | None] = mapped_column(Integer)
    finish_reason: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("CURRENT_TIMESTAMP"))


class ConnectorCall(Base):
    __tablename__ = "connector_call"
    __table_args__ = (Index("idx_connector_call_run_id", "run_id"),)

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    run_id: Mapped[str] = mapped_column(Text, nullable=False)
    connector_id: Mapped[str | None] = mapped_column(Text)
    plugin_action: Mapped[str] = mapped_column(Text, nullable=False)
    request_json: Mapped[str | None] = mapped_column(Text)
    response_json: Mapped[str | None] = mapped_column(Text)
    request_artifact_id: Mapped[str | None] = mapped_column(Text)
    response_artifact_id: Mapped[str | None] = mapped_column(Text)
    status_code: Mapped[int | None] = mapped_column(Integer)
    latency_ms: Mapped[int | None] = mapped_column(Integer)
    error_text: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("CURRENT_TIMESTAMP"))
