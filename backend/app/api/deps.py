from __future__ import annotations

from fastapi import Request

from app.plugins.service import PluginService


def get_plugin_service(request: Request) -> PluginService:
    return request.app.state.plugin_service
