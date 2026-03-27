from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.auth.schemas import AuthAdminConfig, AuthConfigPatch, AuthFrontendConfig, AuthSessionResponse
from app.auth.service import AuthService
from app.db.session import get_db

router = APIRouter()


def _service(db: Session | None = None) -> AuthService:
    return AuthService(db)


@router.get('/auth/config', response_model=AuthFrontendConfig)
def auth_config(db: Session = Depends(get_db)):
    return _service(db).get_frontend_config()


@router.get('/auth/me', response_model=AuthSessionResponse)
def auth_me(request: Request, db: Session = Depends(get_db)):
    return _service(db).session_response(request)


@router.get('/auth/admin/config', response_model=AuthAdminConfig)
def auth_admin_config(db: Session = Depends(get_db)):
    return _service(db).get_admin_config()


@router.patch('/auth/admin/config', response_model=AuthAdminConfig)
def patch_auth_admin_config(payload: AuthConfigPatch, db: Session = Depends(get_db)):
    return _service(db).patch_admin_config(payload.model_dump(exclude_none=True))


@router.get('/auth/login')
async def auth_login(request: Request, next: str = Query(default='/'), db: Session = Depends(get_db)):
    return await _service(db).begin_oidc_login(request, next)


@router.get('/auth/callback', name='auth_callback')
async def auth_callback(request: Request, db: Session = Depends(get_db)):
    return await _service(db).complete_oidc_login(request)


@router.get('/auth/dev-bypass')
def auth_dev_bypass(request: Request, next: str = Query(default='/'), db: Session = Depends(get_db)):
    return _service(db).start_dev_bypass(request, next)


@router.get('/auth/logout')
def auth_logout(request: Request, next: str = Query(default='/login'), db: Session = Depends(get_db)):
    return _service(db).logout(request)
