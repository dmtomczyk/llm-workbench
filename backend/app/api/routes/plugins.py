from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_plugin_service
from app.plugins.schemas import PluginRead, PluginSyncResult
from app.plugins.service import PluginService

router = APIRouter()


@router.get('/plugins', response_model=list[PluginRead])
def list_plugins(plugin_service: PluginService = Depends(get_plugin_service)):
    return plugin_service.list_plugins()


@router.get('/plugins/{plugin_id}', response_model=PluginRead)
def get_plugin(plugin_id: str, plugin_service: PluginService = Depends(get_plugin_service)):
    plugin = plugin_service.get_plugin(plugin_id)
    if plugin is None:
        raise HTTPException(status_code=404, detail='Plugin not found')
    return plugin


@router.post('/plugins/reload', response_model=PluginSyncResult)
def reload_plugins(plugin_service: PluginService = Depends(get_plugin_service)):
    return plugin_service.sync_registry()
