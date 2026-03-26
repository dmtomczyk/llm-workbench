from __future__ import annotations

from sqlalchemy import inspect

from app.db.base import Base
from app.db import models  # noqa: F401
from app.db.session import get_engine


_SQLITE_AUTOMATION_BACKFILL_COLUMNS = {
    'time_of_day': 'TEXT',
    'template_id': 'TEXT',
    'dataset_id': 'TEXT',
}


def bootstrap_database() -> None:
    engine = get_engine()
    # Temporary alpha-era behavior:
    # - create_all keeps fresh local installs easy
    # - targeted SQLite backfills keep a few existing dev DBs alive
    # Long-term pre-alpha goal: move existing installs onto Alembic-first upgrades.
    Base.metadata.create_all(bind=engine)
    _backfill_sqlite_columns(engine)


def _backfill_sqlite_columns(engine) -> None:
    if engine.dialect.name != 'sqlite':
        return
    inspector = inspect(engine)
    table_names = set(inspector.get_table_names())
    if 'automation' not in table_names:
        return
    existing_columns = {column['name'] for column in inspector.get_columns('automation')}
    missing = {name: ddl for name, ddl in _SQLITE_AUTOMATION_BACKFILL_COLUMNS.items() if name not in existing_columns}
    if not missing:
        return
    with engine.begin() as conn:
        for column_name, ddl in missing.items():
            conn.exec_driver_sql(f'ALTER TABLE automation ADD COLUMN {column_name} {ddl}')
