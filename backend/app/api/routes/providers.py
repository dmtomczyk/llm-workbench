from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_plugin_service
from app.core.request_context import get_request_context
from app.db.session import get_db
from app.plugins.service import PluginService
from app.providers.schemas import ProviderCreate, ProviderInvokeRequest, ProviderInvokeResponse, ProviderRead, ProviderUpdate
from app.providers.service import ProviderService

router = APIRouter()


@router.get('/providers', response_model=list[ProviderRead])
def list_providers(db: Session = Depends(get_db), plugin_service: PluginService = Depends(get_plugin_service)):
    return ProviderService(db, plugin_service).list()


@router.post('/providers', response_model=ProviderRead)
def create_provider(payload: ProviderCreate, db: Session = Depends(get_db), plugin_service: PluginService = Depends(get_plugin_service)):
    return ProviderService(db, plugin_service).create(payload)


@router.get('/providers/{provider_id}', response_model=ProviderRead)
def get_provider(provider_id: str, db: Session = Depends(get_db), plugin_service: PluginService = Depends(get_plugin_service)):
    return ProviderService(db, plugin_service).get(provider_id)


@router.patch('/providers/{provider_id}', response_model=ProviderRead)
def update_provider(provider_id: str, payload: ProviderUpdate, db: Session = Depends(get_db), plugin_service: PluginService = Depends(get_plugin_service)):
    return ProviderService(db, plugin_service).update(provider_id, payload)


@router.post('/providers/{provider_id}/test')
async def test_provider(provider_id: str, db: Session = Depends(get_db), plugin_service: PluginService = Depends(get_plugin_service)):
    return await ProviderService(db, plugin_service).test(provider_id)


@router.post('/providers/{provider_id}/invoke', response_model=ProviderInvokeResponse)
async def invoke_provider(provider_id: str, payload: ProviderInvokeRequest, db: Session = Depends(get_db), plugin_service: PluginService = Depends(get_plugin_service)):
    data = await ProviderService(db, plugin_service).invoke(provider_id, payload.model_dump(exclude_none=True))
    return ProviderInvokeResponse(ok=True, data=data, audit_id=data.get('audit_id'), correlation_id=get_request_context().correlation_id)
