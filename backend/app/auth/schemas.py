from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class AuthFrontendConfig(BaseModel):
    enabled: bool
    mode: str = 'oidc'
    login_path: str = '/api/auth/login'
    logout_path: str = '/api/auth/logout'
    local_dev_bypass: bool = False


class AuthUser(BaseModel):
    sub: str
    email: str | None = None
    name: str | None = None
    roles: list[str] = Field(default_factory=list)
    auth_source: str = 'oidc'


class AuthSessionResponse(BaseModel):
    authenticated: bool
    user: AuthUser | None = None


class AuthAdminOIDCConfig(BaseModel):
    issuer_url: str = ''
    discovery_url: str | None = None
    client_id: str = ''
    client_secret: str = ''
    audience: str | None = None
    scopes: list[str] = Field(default_factory=lambda: ['openid', 'profile', 'email'])
    frontend_base_url: str | None = None
    redirect_path: str = '/api/auth/callback'
    client_secret_configured: bool = False


class AuthAdminConfig(BaseModel):
    enabled: bool = False
    mode: str = 'oidc'
    local_dev_bypass: bool = True
    local_dev_bypass_subject: str = 'dev-user'
    local_dev_bypass_email: str = 'dev@localhost'
    local_dev_bypass_name: str = 'Local Developer'
    session_cookie_name: str = 'bridge_session'
    session_jwt_secret: str = ''
    session_jwt_secret_configured: bool = False
    session_ttl_seconds: int = 28800
    oidc: AuthAdminOIDCConfig = Field(default_factory=AuthAdminOIDCConfig)


class AuthConfigPatch(BaseModel):
    enabled: bool | None = None
    mode: str | None = None
    local_dev_bypass: bool | None = None
    local_dev_bypass_subject: str | None = None
    local_dev_bypass_email: str | None = None
    local_dev_bypass_name: str | None = None
    session_cookie_name: str | None = None
    session_jwt_secret: str | None = None
    session_ttl_seconds: int | None = None
    oidc: dict[str, Any] | None = None
