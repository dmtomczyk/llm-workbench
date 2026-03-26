"""automation and schema catch-up

Revision ID: 20260325_0002
Revises: 20260325_0001
Create Date: 2026-03-25 23:35:00
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260325_0002"
down_revision = "20260325_0001"
branch_labels = None
depends_on = None


def _has_table(inspector, table_name: str) -> bool:
    return table_name in set(inspector.get_table_names())


def _has_column(inspector, table_name: str, column_name: str) -> bool:
    return column_name in {column["name"] for column in inspector.get_columns(table_name)}


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not _has_table(inspector, "automation"):
        op.create_table(
            "automation",
            sa.Column("id", sa.Text(), primary_key=True),
            sa.Column("name", sa.Text(), nullable=False),
            sa.Column("enabled", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("schedule_type", sa.Text(), nullable=False),
            sa.Column("interval_seconds", sa.Integer()),
            sa.Column("run_at", sa.Text()),
            sa.Column("time_of_day", sa.Text()),
            sa.Column("timezone", sa.Text(), nullable=False, server_default="America/New_York"),
            sa.Column("target_type", sa.Text(), nullable=False),
            sa.Column("workflow_id", sa.Text()),
            sa.Column("provider_id", sa.Text()),
            sa.Column("template_id", sa.Text()),
            sa.Column("dataset_id", sa.Text()),
            sa.Column("model", sa.Text()),
            sa.Column("system_prompt", sa.Text()),
            sa.Column("prompt_text", sa.Text()),
            sa.Column("variables_json", sa.Text(), nullable=False, server_default="{}"),
            sa.Column("last_run_at", sa.Text()),
            sa.Column("next_run_at", sa.Text()),
            sa.Column("created_at", sa.Text(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("updated_at", sa.Text(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        )
        inspector = sa.inspect(bind)

    for column_name in ("time_of_day", "template_id", "dataset_id"):
        if _has_table(inspector, "automation") and not _has_column(inspector, "automation", column_name):
            op.add_column("automation", sa.Column(column_name, sa.Text(), nullable=True))
            inspector = sa.inspect(bind)


def downgrade() -> None:
    # Safe downgrade is intentionally conservative for alpha-era local SQLite installs.
    # We avoid destructive column drops here; dropping the table is only done if it exists.
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if _has_table(inspector, "automation"):
        op.drop_table("automation")
