from __future__ import annotations

import base64
import hashlib
import json
import secrets
from datetime import UTC, datetime, timedelta
from functools import lru_cache
from typing import Any
from urllib.parse import urlencode, urljoin

import httpx
import jwt
from fastapi import HTTPException, Request
from fastapi.responses import RedirectResponse
from jwt import PyJWKClient
from sqlalchemy.orm import Session

from app.audit.schemas import AuditEventCreate
from app.audit.service import AuditService
from app.auth.schemas import AuthAdminConfig, AuthFrontendConfig, AuthSessionResponse, AuthUser
from app.core.config import AuthSettings, get_settings
from app.db.models import SettingsEntry

AUTH_CONFIG_KEY = 'auth.config'
PKCE_VERIFIER_COOKIE = 'bridge_oidc_verifier'
OIDC_STATE_COOKIE = 'bridge_oidc_state'
OIDC_NONCE_COOKIE = 'bridge_oidc_nonce'
OIDC_NEXT_COOKIE = 'bridge_oidc_next'


@lru_cache(maxsize=8)
def _jwks_client(jwks_uri: str) -> PyJWKClient:
    return PyJWKClient(jwks_uri)


class AuthService:
    def __init__(self, db: Session | None = None):
        self.db = db
        self.audit = AuditService(db) if db is not None else None

    def get_effective_config(self) -> AuthSettings:
        base = get_settings().auth.model_dump()
        if self.db is not None:
            row = self.db.get(SettingsEntry, AUTH_CONFIG_KEY)
            if row and row.value_json:
                override = json.loads(row.value_json)
                base = self._deep_merge(base, override)
        return AuthSettings.model_validate(base)

    def get_frontend_config(self) -> AuthFrontendConfig:
        config = self.get_effective_config()
        return AuthFrontendConfig(
            enabled=config.enabled,
            mode=config.mode,
            local_dev_bypass=bool(config.local_dev_bypass),
        )

    def get_admin_config(self) -> AuthAdminConfig:
        config = self.get_effective_config()
        return AuthAdminConfig(
            enabled=config.enabled,
            mode=config.mode,
            local_dev_bypass=config.local_dev_bypass,
            local_dev_bypass_subject=config.local_dev_bypass_subject,
            local_dev_bypass_email=config.local_dev_bypass_email,
            local_dev_bypass_name=config.local_dev_bypass_name,
            session_cookie_name=config.session_cookie_name,
            session_jwt_secret='',
            session_jwt_secret_configured=bool(config.session_jwt_secret),
            session_ttl_seconds=config.session_ttl_seconds,
            oidc={
                'issuer_url': config.oidc.issuer_url,
                'discovery_url': config.oidc.discovery_url,
                'client_id': config.oidc.client_id,
                'client_secret': '',
                'client_secret_configured': bool(config.oidc.client_secret),
                'audience': config.oidc.audience,
                'scopes': config.oidc.scopes,
                'frontend_base_url': config.oidc.frontend_base_url,
                'redirect_path': config.oidc.redirect_path,
            },
        )

    def patch_admin_config(self, payload: dict[str, Any]) -> AuthAdminConfig:
        if self.db is None or self.audit is None:
            raise RuntimeError('Database-backed auth config patching requires a db session')
        current = self.get_effective_config().model_dump()
        incoming = dict(payload)
        oidc_patch = incoming.get('oidc') if isinstance(incoming.get('oidc'), dict) else {}
        if not oidc_patch.get('client_secret'):
            oidc_patch.pop('client_secret', None)
        if oidc_patch:
            incoming['oidc'] = oidc_patch
        else:
            incoming.pop('oidc', None)
        if not incoming.get('session_jwt_secret'):
            incoming.pop('session_jwt_secret', None)
        merged = self._deep_merge(current, incoming)
        row = self.db.get(SettingsEntry, AUTH_CONFIG_KEY) or SettingsEntry(key=AUTH_CONFIG_KEY)
        row.value_json = json.dumps(merged)
        self.db.add(row)
        self.db.commit()
        self.audit.record(AuditEventCreate(
            action='auth.config_updated',
            entity_type='settings',
            entity_id='auth',
            after={'enabled': merged.get('enabled'), 'mode': merged.get('mode')},
        ))
        return self.get_admin_config()

    async def begin_oidc_login(self, request: Request, next_path: str = '/') -> RedirectResponse:
        config = self.get_effective_config()
        if not config.enabled:
            raise HTTPException(status_code=400, detail='Authentication is not enabled.')
        self._validate_oidc_config(config)
        metadata = await self._oidc_metadata(config)
        verifier = self._pkce_verifier()
        challenge = self._pkce_challenge(verifier)
        state = secrets.token_urlsafe(24)
        nonce = secrets.token_urlsafe(24)
        redirect_uri = self._redirect_uri(config, request)
        params = {
            'response_type': 'code',
            'client_id': config.oidc.client_id,
            'redirect_uri': redirect_uri,
            'scope': ' '.join(config.oidc.scopes),
            'state': state,
            'nonce': nonce,
            'code_challenge': challenge,
            'code_challenge_method': 'S256',
        }
        if config.oidc.audience:
            params['audience'] = config.oidc.audience
        authorize_url = f"{metadata['authorization_endpoint']}?{urlencode(params)}"
        response = RedirectResponse(authorize_url, status_code=302)
        max_age = 600
        self._set_transient_cookie(response, PKCE_VERIFIER_COOKIE, verifier, max_age)
        self._set_transient_cookie(response, OIDC_STATE_COOKIE, state, max_age)
        self._set_transient_cookie(response, OIDC_NONCE_COOKIE, nonce, max_age)
        self._set_transient_cookie(response, OIDC_NEXT_COOKIE, next_path or '/', max_age)
        return response

    async def complete_oidc_login(self, request: Request) -> RedirectResponse:
        if self.db is None:
            raise RuntimeError('Database-backed auth callback requires a db session')
        next_path = request.cookies.get(OIDC_NEXT_COOKIE) or '/'
        try:
            config = self.get_effective_config()
            self._validate_oidc_config(config)
            state = request.query_params.get('state') or ''
            code = request.query_params.get('code') or ''
            if not code or not state:
                raise HTTPException(status_code=400, detail='Missing OIDC callback parameters.')
            expected_state = request.cookies.get(OIDC_STATE_COOKIE) or ''
            verifier = request.cookies.get(PKCE_VERIFIER_COOKIE) or ''
            nonce = request.cookies.get(OIDC_NONCE_COOKIE) or ''
            if state != expected_state or not verifier:
                raise HTTPException(status_code=400, detail='OIDC login state is invalid or expired.')
            metadata = await self._oidc_metadata(config)
            redirect_uri = self._redirect_uri(config, request)
            token_payload = {
                'grant_type': 'authorization_code',
                'code': code,
                'redirect_uri': redirect_uri,
                'client_id': config.oidc.client_id,
                'code_verifier': verifier,
            }
            if config.oidc.client_secret:
                token_payload['client_secret'] = config.oidc.client_secret
            async with httpx.AsyncClient(timeout=15.0) as client:
                token_response = await client.post(metadata['token_endpoint'], data=token_payload)
                token_response.raise_for_status()
                token_data = token_response.json()
            id_token = token_data.get('id_token')
            if not id_token:
                raise HTTPException(status_code=400, detail='OIDC provider did not return an id_token.')
            user = self._verify_oidc_id_token(id_token, metadata['jwks_uri'], config, nonce)
            session_token = self._create_session_jwt(config, user)
            response = RedirectResponse(self._frontend_redirect_url(config, next_path, request), status_code=302)
            self._set_session_cookie(response, config, session_token)
            self._clear_transient_cookie(response, PKCE_VERIFIER_COOKIE)
            self._clear_transient_cookie(response, OIDC_STATE_COOKIE)
            self._clear_transient_cookie(response, OIDC_NONCE_COOKIE)
            self._clear_transient_cookie(response, OIDC_NEXT_COOKIE)
            if self.audit is not None:
                self.audit.record(AuditEventCreate(
                    action='auth.login_completed',
                    entity_type='auth_session',
                    entity_id=user.sub,
                    after={'email': user.email, 'name': user.name, 'source': user.auth_source},
                ))
            return response
        except Exception:
            response = RedirectResponse(self._frontend_redirect_url(self.get_effective_config(), f'/login?error=callback&next={next_path.lstrip("/")}', request), status_code=302)
            self._clear_transient_cookie(response, PKCE_VERIFIER_COOKIE)
            self._clear_transient_cookie(response, OIDC_STATE_COOKIE)
            self._clear_transient_cookie(response, OIDC_NONCE_COOKIE)
            self._clear_transient_cookie(response, OIDC_NEXT_COOKIE)
            return response

    def start_dev_bypass(self, request: Request, next_path: str = '/') -> RedirectResponse:
        config = self.get_effective_config()
        if not config.local_dev_bypass:
            raise HTTPException(status_code=403, detail='Local dev bypass is disabled.')
        user = AuthUser(
            sub=config.local_dev_bypass_subject,
            email=config.local_dev_bypass_email,
            name=config.local_dev_bypass_name,
            roles=['admin'],
            auth_source='dev-bypass',
        )
        token = self._create_session_jwt(config, user)
        response = RedirectResponse(self._frontend_redirect_url(config, next_path, request), status_code=302)
        self._set_session_cookie(response, config, token)
        return response

    def logout(self, request: Request) -> RedirectResponse:
        config = self.get_effective_config()
        next_path = request.query_params.get('next') or '/login'
        response = RedirectResponse(self._frontend_redirect_url(config, next_path, request), status_code=302)
        response.delete_cookie(config.session_cookie_name, path='/')
        return response

    def session_from_request(self, request: Request, required: bool = True) -> AuthUser | None:
        config = self.get_effective_config()
        if not config.enabled:
            return AuthUser(sub='local-user', email=None, name='Local User', roles=['admin'], auth_source='disabled')
        token = request.cookies.get(config.session_cookie_name)
        if not token:
            auth_header = request.headers.get('authorization', '')
            if auth_header.lower().startswith('bearer '):
                token = auth_header[7:].strip()
        if not token:
            if required:
                raise HTTPException(status_code=401, detail='Authentication required.')
            return None
        try:
            payload = jwt.decode(
                token,
                config.session_jwt_secret,
                algorithms=['HS256'],
                audience='bridge',
                issuer='bridge-auth',
            )
        except Exception as exc:
            if required:
                raise HTTPException(status_code=401, detail=f'Invalid session token: {exc}') from exc
            return None
        return AuthUser(
            sub=str(payload.get('sub') or ''),
            email=payload.get('email'),
            name=payload.get('name'),
            roles=list(payload.get('roles') or []),
            auth_source=str(payload.get('auth_source') or 'oidc'),
        )

    def session_response(self, request: Request) -> AuthSessionResponse:
        user = self.session_from_request(request, required=False)
        return AuthSessionResponse(authenticated=user is not None, user=user)

    @staticmethod
    def _deep_merge(base: dict[str, Any], override: dict[str, Any]) -> dict[str, Any]:
        merged = dict(base)
        for key, value in override.items():
            if isinstance(value, dict) and isinstance(merged.get(key), dict):
                merged[key] = AuthService._deep_merge(merged[key], value)
            else:
                merged[key] = value
        return merged

    @staticmethod
    def _validate_oidc_config(config: AuthSettings) -> None:
        if not config.oidc.client_id.strip():
            raise HTTPException(status_code=400, detail='OIDC client_id is required.')
        if not (config.oidc.discovery_url or config.oidc.issuer_url):
            raise HTTPException(status_code=400, detail='OIDC issuer_url or discovery_url is required.')
        if not config.session_jwt_secret.strip():
            raise HTTPException(status_code=400, detail='A session JWT signing secret is required when auth is enabled.')

    async def _oidc_metadata(self, config: AuthSettings) -> dict[str, Any]:
        discovery_url = config.oidc.discovery_url or urljoin(config.oidc.issuer_url.rstrip('/') + '/', '.well-known/openid-configuration')
        if not discovery_url:
            raise HTTPException(status_code=400, detail='OIDC discovery URL or issuer URL must be configured.')
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(discovery_url)
            response.raise_for_status()
            return response.json()

    def _verify_oidc_id_token(self, token: str, jwks_uri: str, config: AuthSettings, nonce: str) -> AuthUser:
        signing_key = _jwks_client(jwks_uri).get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=['RS256', 'ES256'],
            audience=config.oidc.client_id,
            issuer=config.oidc.issuer_url or None,
        )
        if nonce and payload.get('nonce') != nonce:
            raise HTTPException(status_code=400, detail='OIDC nonce validation failed.')
        return AuthUser(
            sub=str(payload.get('sub') or ''),
            email=payload.get('email'),
            name=payload.get('name') or payload.get('preferred_username'),
            roles=list(payload.get('roles') or payload.get('groups') or []),
            auth_source='oidc',
        )

    def _create_session_jwt(self, config: AuthSettings, user: AuthUser) -> str:
        now = datetime.now(UTC)
        payload = {
            'sub': user.sub,
            'email': user.email,
            'name': user.name,
            'roles': user.roles,
            'auth_source': user.auth_source,
            'iat': int(now.timestamp()),
            'exp': int((now + timedelta(seconds=config.session_ttl_seconds)).timestamp()),
            'iss': 'bridge-auth',
            'aud': 'bridge',
        }
        return jwt.encode(payload, config.session_jwt_secret, algorithm='HS256')

    def _set_session_cookie(self, response: RedirectResponse, config: AuthSettings, token: str) -> None:
        response.set_cookie(
            config.session_cookie_name,
            token,
            httponly=True,
            samesite='lax',
            secure=self._secure_cookie(config),
            max_age=config.session_ttl_seconds,
            path='/',
        )

    def _set_transient_cookie(self, response: RedirectResponse, key: str, value: str, max_age: int) -> None:
        response.set_cookie(key, value, httponly=True, samesite='lax', secure=False, max_age=max_age, path='/')

    def _clear_transient_cookie(self, response: RedirectResponse, key: str) -> None:
        response.delete_cookie(key, path='/')

    def _redirect_uri(self, config: AuthSettings, request: Request) -> str:
        redirect_path = config.oidc.redirect_path or '/api/auth/callback'
        if redirect_path.startswith('http://') or redirect_path.startswith('https://'):
            return redirect_path
        return urljoin(str(request.base_url), redirect_path.lstrip('/'))

    def _frontend_redirect_url(self, config: AuthSettings, next_path: str, request: Request) -> str:
        base = config.oidc.frontend_base_url or (get_settings().server.cors_origins[0] if get_settings().server.cors_origins else str(request.base_url).rstrip('/'))
        return f"{base.rstrip('/')}/{next_path.lstrip('/')}"

    @staticmethod
    def _pkce_verifier() -> str:
        return secrets.token_urlsafe(48)

    @staticmethod
    def _pkce_challenge(verifier: str) -> str:
        digest = hashlib.sha256(verifier.encode('utf-8')).digest()
        return base64.urlsafe_b64encode(digest).decode('utf-8').rstrip('=')

    @staticmethod
    def _secure_cookie(config: AuthSettings) -> bool:
        return get_settings().app.env not in {'local', 'development', 'dev'}
