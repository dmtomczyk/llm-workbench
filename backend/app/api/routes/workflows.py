from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_plugin_service
from app.db.session import get_db
from app.plugins.service import PluginService
from app.providers.service import ProviderService
from app.workflows.schemas import (
    WorkflowCreate,
    WorkflowRead,
    WorkflowRunRequest,
    WorkflowRunResponse,
    WorkflowRunStatusResponse,
    WorkflowUpdate,
)
from app.workflows.service import WorkflowService

router = APIRouter()


@router.get('/workflows', response_model=list[WorkflowRead])
def list_workflows(db: Session = Depends(get_db), plugin_service: PluginService = Depends(get_plugin_service)):
    return WorkflowService(db, ProviderService(db, plugin_service)).list()


@router.post('/workflows', response_model=WorkflowRead)
def create_workflow(payload: WorkflowCreate, db: Session = Depends(get_db), plugin_service: PluginService = Depends(get_plugin_service)):
    return WorkflowService(db, ProviderService(db, plugin_service)).create(payload)


@router.get('/workflows/{workflow_id}', response_model=WorkflowRead)
def get_workflow(workflow_id: str, db: Session = Depends(get_db), plugin_service: PluginService = Depends(get_plugin_service)):
    return WorkflowService(db, ProviderService(db, plugin_service)).get(workflow_id)


@router.patch('/workflows/{workflow_id}', response_model=WorkflowRead)
def update_workflow(workflow_id: str, payload: WorkflowUpdate, db: Session = Depends(get_db), plugin_service: PluginService = Depends(get_plugin_service)):
    return WorkflowService(db, ProviderService(db, plugin_service)).update(workflow_id, payload)


@router.delete('/workflows/{workflow_id}')
def delete_workflow(workflow_id: str, db: Session = Depends(get_db), plugin_service: PluginService = Depends(get_plugin_service)):
    return WorkflowService(db, ProviderService(db, plugin_service)).delete(workflow_id)


@router.post('/workflows/{workflow_id}/run', response_model=WorkflowRunResponse)
async def run_workflow(workflow_id: str, payload: WorkflowRunRequest, db: Session = Depends(get_db), plugin_service: PluginService = Depends(get_plugin_service)):
    return await WorkflowService(db, ProviderService(db, plugin_service)).run(workflow_id, payload)


@router.get('/workflow-runs/{run_id}', response_model=WorkflowRunStatusResponse)
def get_workflow_run(run_id: str, db: Session = Depends(get_db), plugin_service: PluginService = Depends(get_plugin_service)):
    return WorkflowService(db, ProviderService(db, plugin_service)).get_run_status(run_id)
