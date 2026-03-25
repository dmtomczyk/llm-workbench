from __future__ import annotations

from app.db.base import Base
from app.db import models  # noqa: F401
from app.db.session import get_engine


def bootstrap_database() -> None:
    engine = get_engine()
    Base.metadata.create_all(bind=engine)
