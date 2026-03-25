from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

_engine = None
_SessionLocal = None


def init_engine(database_url: str):
    global _engine, _SessionLocal
    if _engine is None:
        connect_args = {"check_same_thread": False} if database_url.startswith("sqlite") else {}
        _engine = create_engine(database_url, future=True, connect_args=connect_args)
        _SessionLocal = sessionmaker(bind=_engine, autoflush=False, autocommit=False, future=True)
    return _engine


def get_engine():
    if _engine is None:
        raise RuntimeError("Database engine not initialized")
    return _engine


def get_db() -> Generator[Session, None, None]:
    if _SessionLocal is None:
        raise RuntimeError("Database session factory not initialized")
    db = _SessionLocal()
    try:
        yield db
    finally:
        db.close()
