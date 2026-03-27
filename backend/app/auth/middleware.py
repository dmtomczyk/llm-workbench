from __future__ import annotations

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.auth.service import AuthService
from app.db.session import open_db_session


class AuthRequiredMiddleware(BaseHTTPMiddleware):
    EXEMPT_API_PATHS = {
        '/api/health',
        '/api/version',
        '/api/about',
        '/api/auth/config',
        '/api/auth/login',
        '/api/auth/callback',
        '/api/auth/logout',
        '/api/auth/dev-bypass',
        '/api/auth/me',
    }

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if request.method == 'OPTIONS' or not path.startswith('/api') or path in self.EXEMPT_API_PATHS:
            return await call_next(request)
        db = open_db_session()
        try:
            service = AuthService(db)
            config = service.get_effective_config()
            if not config.enabled:
                return await call_next(request)
            user = service.session_from_request(request, required=False)
            if user is None:
                return JSONResponse({'detail': 'Authentication required.'}, status_code=401)
            request.state.auth_user = user
            return await call_next(request)
        finally:
            db.close()
