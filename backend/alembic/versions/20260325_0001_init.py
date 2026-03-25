"""initial schema

Revision ID: 20260325_0001
Revises: 
Create Date: 2026-03-25 00:00:00
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260325_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "settings",
        sa.Column("key", sa.Text(), primary_key=True),
        sa.Column("value_json", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_table(
        "plugin_registry",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("version", sa.Text(), nullable=False),
        sa.Column("kind", sa.Text(), nullable=False),
        sa.Column("entrypoint", sa.Text(), nullable=False),
        sa.Column("enabled", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("load_status", sa.Text(), nullable=False, server_default="pending"),
        sa.Column("manifest_json", sa.Text(), nullable=False),
        sa.Column("manifest_hash", sa.Text()),
        sa.Column("last_loaded_at", sa.Text()),
        sa.Column("last_healthcheck_at", sa.Text()),
        sa.Column("last_healthcheck_json", sa.Text()),
        sa.Column("last_error", sa.Text()),
        sa.Column("created_at", sa.Text(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.Text(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_table(
        "openapi_spec",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("source_type", sa.Text(), nullable=False),
        sa.Column("source_ref", sa.Text(), nullable=False),
        sa.Column("raw_text", sa.Text()),
        sa.Column("parsed_json", sa.Text()),
        sa.Column("operations_json", sa.Text()),
        sa.Column("security_schemes_json", sa.Text()),
        sa.Column("created_at", sa.Text(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.Text(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_table(
        "prompt_template",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("slug", sa.Text(), nullable=False, unique=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("system_prompt", sa.Text()),
        sa.Column("user_prompt_template", sa.Text(), nullable=False),
        sa.Column("output_schema_json", sa.Text()),
        sa.Column("default_vars_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("tags_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("created_at", sa.Text(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.Text(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_table(
        "dataset",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("source_type", sa.Text(), nullable=False),
        sa.Column("source_ref", sa.Text()),
        sa.Column("media_type", sa.Text()),
        sa.Column("latest_version_no", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("metadata_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.Text(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.Text(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_table(
        "workflow",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("slug", sa.Text(), nullable=False, unique=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("definition_json", sa.Text(), nullable=False),
        sa.Column("enabled", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("version_no", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.Text(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.Text(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_table(
        "connector",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("plugin_id", sa.Text(), sa.ForeignKey("plugin_registry.id"), nullable=False),
        sa.Column("base_url", sa.Text()),
        sa.Column("auth_type", sa.Text()),
        sa.Column("secret_alias", sa.Text()),
        sa.Column("config_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("enabled", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("last_tested_at", sa.Text()),
        sa.Column("last_test_result_json", sa.Text()),
        sa.Column("created_at", sa.Text(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.Text(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_table(
        "llm_provider",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("plugin_id", sa.Text(), sa.ForeignKey("plugin_registry.id"), nullable=False),
        sa.Column("spec_id", sa.Text(), sa.ForeignKey("openapi_spec.id")),
        sa.Column("connector_id", sa.Text(), sa.ForeignKey("connector.id")),
        sa.Column("provider_kind", sa.Text(), nullable=False),
        sa.Column("base_url", sa.Text()),
        sa.Column("default_model", sa.Text()),
        sa.Column("auth_type", sa.Text()),
        sa.Column("secret_alias", sa.Text()),
        sa.Column("operation_id", sa.Text()),
        sa.Column("invoke_method", sa.Text()),
        sa.Column("invoke_path", sa.Text()),
        sa.Column("request_template_json", sa.Text()),
        sa.Column("response_extractors_json", sa.Text()),
        sa.Column("capabilities_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("enabled", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("last_tested_at", sa.Text()),
        sa.Column("last_test_result_json", sa.Text()),
        sa.Column("created_at", sa.Text(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.Text(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_table(
        "dataset_version",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("dataset_id", sa.Text(), sa.ForeignKey("dataset.id", ondelete="CASCADE"), nullable=False),
        sa.Column("version_no", sa.Integer(), nullable=False),
        sa.Column("storage_path", sa.Text(), nullable=False),
        sa.Column("normalized_payload_path", sa.Text()),
        sa.Column("checksum", sa.Text()),
        sa.Column("row_count", sa.Integer()),
        sa.Column("metadata_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.Text(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.UniqueConstraint("dataset_id", "version_no"),
    )
    op.create_table(
        "import_record",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("dataset_id", sa.Text(), sa.ForeignKey("dataset.id")),
        sa.Column("import_type", sa.Text(), nullable=False),
        sa.Column("original_filename", sa.Text()),
        sa.Column("storage_path", sa.Text(), nullable=False),
        sa.Column("parser_used", sa.Text()),
        sa.Column("media_type", sa.Text()),
        sa.Column("byte_size", sa.Integer()),
        sa.Column("checksum", sa.Text()),
        sa.Column("status", sa.Text(), nullable=False, server_default="created"),
        sa.Column("details_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.Text(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_table(
        "scheduled_job",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("workflow_id", sa.Text(), sa.ForeignKey("workflow.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("cron_expr", sa.Text(), nullable=False),
        sa.Column("timezone", sa.Text(), nullable=False, server_default="America/New_York"),
        sa.Column("enabled", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("timeout_seconds", sa.Integer(), nullable=False, server_default="1800"),
        sa.Column("max_retries", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("retry_backoff_seconds", sa.Integer(), nullable=False, server_default="60"),
        sa.Column("concurrency_policy", sa.Text(), nullable=False, server_default="forbid"),
        sa.Column("last_run_at", sa.Text()),
        sa.Column("next_run_at", sa.Text()),
        sa.Column("created_at", sa.Text(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.Text(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_table(
        "run",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("parent_run_id", sa.Text(), sa.ForeignKey("run.id")),
        sa.Column("run_type", sa.Text(), nullable=False),
        sa.Column("source", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False, server_default="queued"),
        sa.Column("workflow_id", sa.Text(), sa.ForeignKey("workflow.id")),
        sa.Column("job_id", sa.Text(), sa.ForeignKey("scheduled_job.id")),
        sa.Column("dataset_id", sa.Text(), sa.ForeignKey("dataset.id")),
        sa.Column("provider_id", sa.Text(), sa.ForeignKey("llm_provider.id")),
        sa.Column("connector_id", sa.Text(), sa.ForeignKey("connector.id")),
        sa.Column("summary", sa.Text()),
        sa.Column("input_ref", sa.Text()),
        sa.Column("output_ref", sa.Text()),
        sa.Column("metadata_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("error_text", sa.Text()),
        sa.Column("started_at", sa.Text()),
        sa.Column("finished_at", sa.Text()),
        sa.Column("created_at", sa.Text(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_table(
        "run_step",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("run_id", sa.Text(), sa.ForeignKey("run.id", ondelete="CASCADE"), nullable=False),
        sa.Column("step_index", sa.Integer(), nullable=False),
        sa.Column("step_type", sa.Text(), nullable=False),
        sa.Column("step_name", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False, server_default="queued"),
        sa.Column("input_json", sa.Text()),
        sa.Column("output_json", sa.Text()),
        sa.Column("metadata_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("error_text", sa.Text()),
        sa.Column("started_at", sa.Text()),
        sa.Column("finished_at", sa.Text()),
        sa.Column("created_at", sa.Text(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_table(
        "artifact",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("run_id", sa.Text(), sa.ForeignKey("run.id", ondelete="CASCADE")),
        sa.Column("artifact_type", sa.Text(), nullable=False),
        sa.Column("label", sa.Text(), nullable=False),
        sa.Column("storage_path", sa.Text(), nullable=False),
        sa.Column("media_type", sa.Text()),
        sa.Column("size_bytes", sa.Integer()),
        sa.Column("checksum", sa.Text()),
        sa.Column("metadata_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.Text(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_table(
        "export_record",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("run_id", sa.Text(), sa.ForeignKey("run.id", ondelete="CASCADE"), nullable=False),
        sa.Column("export_type", sa.Text(), nullable=False),
        sa.Column("target_name", sa.Text()),
        sa.Column("storage_path", sa.Text(), nullable=False),
        sa.Column("media_type", sa.Text()),
        sa.Column("created_at", sa.Text(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_table(
        "chat_session",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("provider_id", sa.Text(), nullable=False),
        sa.Column("model_name", sa.Text()),
        sa.Column("system_prompt", sa.Text()),
        sa.Column("provider_conversation_id", sa.Text()),
        sa.Column("message_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("metadata_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.Text(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.Text(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_table(
        "chat_message",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("session_id", sa.Text(), nullable=False),
        sa.Column("run_id", sa.Text()),
        sa.Column("sequence_no", sa.Integer(), nullable=False),
        sa.Column("role", sa.Text(), nullable=False),
        sa.Column("content_text", sa.Text(), nullable=False),
        sa.Column("provider_message_id", sa.Text()),
        sa.Column("metadata_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.Text(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_table(
        "audit_event",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("occurred_at", sa.Text(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("actor", sa.Text(), nullable=False, server_default="local-user"),
        sa.Column("actor_type", sa.Text(), nullable=False, server_default="user"),
        sa.Column("action", sa.Text(), nullable=False),
        sa.Column("entity_type", sa.Text(), nullable=False),
        sa.Column("entity_id", sa.Text()),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("source", sa.Text(), nullable=False),
        sa.Column("request_id", sa.Text()),
        sa.Column("correlation_id", sa.Text()),
        sa.Column("run_id", sa.Text(), sa.ForeignKey("run.id")),
        sa.Column("session_id", sa.Text()),
        sa.Column("message", sa.Text()),
        sa.Column("before_json", sa.Text()),
        sa.Column("after_json", sa.Text()),
        sa.Column("metadata_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("redaction_level", sa.Text(), nullable=False, server_default="standard"),
    )
    op.create_table(
        "llm_interaction",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("run_id", sa.Text(), sa.ForeignKey("run.id", ondelete="CASCADE"), nullable=False),
        sa.Column("provider_id", sa.Text(), sa.ForeignKey("llm_provider.id")),
        sa.Column("model_name", sa.Text()),
        sa.Column("request_json", sa.Text()),
        sa.Column("response_json", sa.Text()),
        sa.Column("request_artifact_id", sa.Text(), sa.ForeignKey("artifact.id")),
        sa.Column("response_artifact_id", sa.Text(), sa.ForeignKey("artifact.id")),
        sa.Column("prompt_tokens", sa.Integer()),
        sa.Column("completion_tokens", sa.Integer()),
        sa.Column("total_tokens", sa.Integer()),
        sa.Column("latency_ms", sa.Integer()),
        sa.Column("finish_reason", sa.Text()),
        sa.Column("created_at", sa.Text(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_table(
        "connector_call",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("run_id", sa.Text(), sa.ForeignKey("run.id", ondelete="CASCADE"), nullable=False),
        sa.Column("connector_id", sa.Text(), sa.ForeignKey("connector.id")),
        sa.Column("plugin_action", sa.Text(), nullable=False),
        sa.Column("request_json", sa.Text()),
        sa.Column("response_json", sa.Text()),
        sa.Column("request_artifact_id", sa.Text(), sa.ForeignKey("artifact.id")),
        sa.Column("response_artifact_id", sa.Text(), sa.ForeignKey("artifact.id")),
        sa.Column("status_code", sa.Integer()),
        sa.Column("latency_ms", sa.Integer()),
        sa.Column("error_text", sa.Text()),
        sa.Column("created_at", sa.Text(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("idx_chat_session_updated_at", "chat_session", ["updated_at"], unique=False)
    op.create_index("idx_chat_session_provider_id", "chat_session", ["provider_id"], unique=False)
    op.create_index("idx_chat_message_session_id", "chat_message", ["session_id", "sequence_no"], unique=False)
    op.create_index("idx_chat_message_run_id", "chat_message", ["run_id"], unique=False)
    op.create_index("idx_audit_event_occurred_at", "audit_event", ["occurred_at"], unique=False)
    op.create_index("idx_audit_event_action", "audit_event", ["action"], unique=False)
    op.create_index("idx_audit_event_correlation_id", "audit_event", ["correlation_id"], unique=False)
    op.create_index("idx_run_status", "run", ["status"], unique=False)
    op.create_index("idx_run_created_at", "run", ["created_at"], unique=False)
    op.create_index("idx_run_job_id", "run", ["job_id"], unique=False)
    op.create_index("idx_run_workflow_id", "run", ["workflow_id"], unique=False)
    op.create_index("idx_run_step_run_id", "run_step", ["run_id", "step_index"], unique=False)
    op.create_index("idx_dataset_version_dataset_id", "dataset_version", ["dataset_id", "version_no"], unique=False)
    op.create_index("idx_llm_interaction_run_id", "llm_interaction", ["run_id"], unique=False)
    op.create_index("idx_connector_call_run_id", "connector_call", ["run_id"], unique=False)


def downgrade() -> None:
    op.drop_index("idx_connector_call_run_id", table_name="connector_call")
    op.drop_index("idx_llm_interaction_run_id", table_name="llm_interaction")
    op.drop_index("idx_dataset_version_dataset_id", table_name="dataset_version")
    op.drop_index("idx_run_step_run_id", table_name="run_step")
    op.drop_index("idx_run_workflow_id", table_name="run")
    op.drop_index("idx_run_job_id", table_name="run")
    op.drop_index("idx_run_created_at", table_name="run")
    op.drop_index("idx_run_status", table_name="run")
    op.drop_index("idx_audit_event_correlation_id", table_name="audit_event")
    op.drop_index("idx_audit_event_action", table_name="audit_event")
    op.drop_index("idx_audit_event_occurred_at", table_name="audit_event")
    op.drop_index("idx_chat_message_run_id", table_name="chat_message")
    op.drop_index("idx_chat_message_session_id", table_name="chat_message")
    op.drop_index("idx_chat_session_provider_id", table_name="chat_session")
    op.drop_index("idx_chat_session_updated_at", table_name="chat_session")
    for table in [
        "connector_call",
        "llm_interaction",
        "audit_event",
        "export_record",
        "artifact",
        "chat_message",
        "chat_session",
        "run_step",
        "run",
        "scheduled_job",
        "import_record",
        "dataset_version",
        "llm_provider",
        "connector",
        "workflow",
        "dataset",
        "prompt_template",
        "openapi_spec",
        "plugin_registry",
        "settings",
    ]:
        op.drop_table(table)
