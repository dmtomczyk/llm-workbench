"""http import recipe support

Revision ID: 20260326_0004
Revises: 20260326_0003
Create Date: 2026-03-26 22:40:00
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260326_0004"
down_revision = "20260326_0003"
branch_labels = None
depends_on = None


def _has_table(inspector, table_name: str) -> bool:
    return table_name in set(inspector.get_table_names())


def _has_column(inspector, table_name: str, column_name: str) -> bool:
    return column_name in {column["name"] for column in inspector.get_columns(table_name)}


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if _has_table(inspector, "import_recipe") and not _has_column(inspector, "import_recipe", "source_config_json"):
        op.add_column("import_recipe", sa.Column("source_config_json", sa.Text(), nullable=False, server_default="{}"))


def downgrade() -> None:
    # Conservative alpha-era downgrade: leave additive column in place.
    return
