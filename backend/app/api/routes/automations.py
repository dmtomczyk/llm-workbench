from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_plugin_service
from app.automations.schemas import AutomationCreate, AutomationRead, AutomationRunDetailResponse, AutomationRunResponse, AutomationRunsResponse, AutomationUpdate
from app.automations.service import AutomationService
from app.db.session import get_db
from app.plugins.service import PluginService
from app.providers.service import ProviderService

router = APIRouter()


@router.get('/automations', response_model=list[AutomationRead])
def list_automations(db: Session = Depends(get_db), plugin_service: PluginService = Depends(get_plugin_service)):
    return AutomationService(db, ProviderService(db, plugin_service)).list()


@router.post('/automations', response_model=AutomationRead)
def create_automation(payload: AutomationCreate, db: Session = Depends(get_db), plugin_service: PluginService = Depends(get_plugin_service)):
    return AutomationService(db, ProviderService(db, plugin_service)).create(payload)


@router.get('/automations/{automation_id}', response_model=AutomationRead)
def get_automation(automation_id: str, db: Session = Depends(get_db), plugin_service: PluginService = Depends(get_plugin_service)):
    return AutomationService(db, ProviderService(db, plugin_service)).get(automation_id)


@router.patch('/automations/{automation_id}', response_model=AutomationRead)
def update_automation(automation_id: str, payload: AutomationUpdate, db: Session = Depends(get_db), plugin_service: PluginService = Depends(get_plugin_service)):
    return AutomationService(db, ProviderService(db, plugin_service)).update(automation_id, payload)


@router.delete('/automations/{automation_id}')
def delete_automation(automation_id: str, db: Session = Depends(get_db), plugin_service: PluginService = Depends(get_plugin_service)):
    return AutomationService(db, ProviderService(db, plugin_service)).delete(automation_id)


@router.post('/automations/{automation_id}/run', response_model=AutomationRunResponse)
async def run_automation_now(automation_id: str, db: Session = Depends(get_db), plugin_service: PluginService = Depends(get_plugin_service)):
    return await AutomationService(db, ProviderService(db, plugin_service)).run_now(automation_id)


@router.get('/automations/{automation_id}/runs', response_model=AutomationRunsResponse)
def list_automation_runs(automation_id: str, db: Session = Depends(get_db), plugin_service: PluginService = Depends(get_plugin_service)):
    return AutomationService(db, ProviderService(db, plugin_service)).list_runs(automation_id)


@router.get('/automation-runs/{run_id}', response_model=AutomationRunDetailResponse)
def get_automation_run_detail(run_id: str, db: Session = Depends(get_db), plugin_service: PluginService = Depends(get_plugin_service)):
    return AutomationService(db, ProviderService(db, plugin_service)).get_run_detail(run_id)
