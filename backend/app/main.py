from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import get_settings
from app.core.request_context import RequestContextMiddleware
from app.db.bootstrap import bootstrap_database
from app.db.session import init_engine
from app.plugins.service import PluginService
from app.templates.service import TemplateService


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    settings.ensure_storage_dirs()
    init_engine(settings.database_url_resolved)
    bootstrap_database()
    TemplateService().seed_defaults()
    plugin_service = PluginService()
    app.state.plugin_service = plugin_service
    plugin_service.sync_registry()
    yield


settings = get_settings()
app = FastAPI(title=settings.app.name, version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.server.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestContextMiddleware)
app.include_router(api_router, prefix="/api")


@app.get("/")
async def root() -> dict[str, str]:
    return {"name": settings.app.name, "status": "ok"}
