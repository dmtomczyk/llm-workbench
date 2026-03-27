"""import recipes and runs

Revision ID: 20260326_0003
Revises: 20260325_0002
Create Date: 2026-03-26 22:15:00
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260326_0003"
down_revision = "20260325_0002"
branch_labels = None
depends_on = None


def _has_table(inspector, table_name: str) -> bool:
    return table_name in set(inspector.get_table_names())


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not _has_table(inspector, "import_recipe"):
        op.create_table(
            "import_recipe",
            sa.Column("id", sa.Text(), primary_key=True),
            sa.Column("name", sa.Text(), nullable=False),
            sa.Column("description", sa.Text()),
            sa.Column("enabled", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("source_type", sa.Text(), nullable=False),
            sa.Column("target_mode", sa.Text(), nullable=False),
            sa.Column("target_dataset_id", sa.Text()),
            sa.Column("dataset_name_template", sa.Text()),
            sa.Column("parser_options_json", sa.Text(), nullable=False, server_default="{}"),
            sa.Column("transform_rules_json", sa.Text(), nullable=False, server_default="{}"),
            sa.Column("preview_config_json", sa.Text(), nullable=False, server_default="{}"),
            sa.Column("last_run_at", sa.Text()),
            sa.Column("last_run_status", sa.Text()),
            sa.Column("created_at", sa.Text(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("updated_at", sa.Text(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        )
        inspector = sa.inspect(bind)

    if not _has_table(inspector, "import_run"):
        op.create_table(
            "import_run",
            sa.Column("id", sa.Text(), primary_key=True),
            sa.Column("recipe_id", sa.Text(), nullable=False),
            sa.Column("dataset_id", sa.Text()),
            sa.Column("dataset_version_id", sa.Text()),
            sa.Column("status", sa.Text(), nullable=False, server_default="created"),
            sa.Column("source_type", sa.Text(), nullable=False),
            sa.Column("original_filename", sa.Text()),
            sa.Column("storage_path", sa.Text()),
            sa.Column("parser_used", sa.Text()),
            sa.Column("media_type", sa.Text()),
            sa.Column("byte_size", sa.Integer()),
            sa.Column("checksum", sa.Text()),
            sa.Column("warning_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("error_text", sa.Text()),
            sa.Column("details_json", sa.Text(), nullable=False, server_default="{}"),
            sa.Column("started_at", sa.Text()),
            sa.Column("finished_at", sa.Text()),
            sa.Column("created_at", sa.Text(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if _has_table(inspector, "import_run"):
        op.drop_table("import_run")
        inspector = sa.inspect(bind)
    if _has_table(inspector, "import_recipe"):
        op.drop_table("import_recipe")
