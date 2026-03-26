from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_plugin_service
from app.db.session import get_db
from app.plugins.service import PluginService
from app.providers.service import ProviderService
from app.workbench.schemas import WorkbenchRunRequest, WorkbenchRunResponse, WorkbenchRunStatusResponse
from app.workbench.service import WorkbenchService

router = APIRouter()


@router.post('/workbench/run', response_model=WorkbenchRunResponse)
async def run_workbench(payload: WorkbenchRunRequest, db: Session = Depends(get_db), plugin_service: PluginService = Depends(get_plugin_service)):
    service = WorkbenchService(db, ProviderService(db, plugin_service))
    return await service.run(payload)


@router.post('/workbench/run/stream')
async def stream_workbench(payload: WorkbenchRunRequest, db: Session = Depends(get_db), plugin_service: PluginService = Depends(get_plugin_service)):
    service = WorkbenchService(db, ProviderService(db, plugin_service))
    return StreamingResponse(service.stream_run(payload), media_type='text/event-stream')


@router.get('/workbench/runs/{run_id}', response_model=WorkbenchRunStatusResponse)
def get_workbench_run(run_id: str, db: Session = Depends(get_db), plugin_service: PluginService = Depends(get_plugin_service)):
    service = WorkbenchService(db, ProviderService(db, plugin_service))
    return service.get_run_status(run_id)
