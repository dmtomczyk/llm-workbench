from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.settings.service import SettingsService

router = APIRouter()


@router.get('/settings')
def get_settings_route(db: Session = Depends(get_db)) -> dict[str, Any]:
    return SettingsService(db).read()


@router.patch('/settings')
def patch_settings_route(payload: dict[str, Any], db: Session = Depends(get_db)) -> dict[str, Any]:
    return SettingsService(db).patch(payload)
