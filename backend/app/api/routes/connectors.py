from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_plugin_service
from app.connectors.schemas import ConnectorActionRequest, ConnectorCreate, ConnectorRead, ConnectorUpdate
from app.connectors.service import ConnectorService
from app.db.session import get_db
from app.plugins.service import PluginService

router = APIRouter()


@router.get('/connectors', response_model=list[ConnectorRead])
def list_connectors(db: Session = Depends(get_db), plugin_service: PluginService = Depends(get_plugin_service)):
    return ConnectorService(db, plugin_service).list()


@router.post('/connectors', response_model=ConnectorRead)
def create_connector(payload: ConnectorCreate, db: Session = Depends(get_db), plugin_service: PluginService = Depends(get_plugin_service)):
    return ConnectorService(db, plugin_service).create(payload)


@router.get('/connectors/{connector_id}', response_model=ConnectorRead)
def get_connector(connector_id: str, db: Session = Depends(get_db), plugin_service: PluginService = Depends(get_plugin_service)):
    return ConnectorService(db, plugin_service).get(connector_id)


@router.patch('/connectors/{connector_id}', response_model=ConnectorRead)
def update_connector(connector_id: str, payload: ConnectorUpdate, db: Session = Depends(get_db), plugin_service: PluginService = Depends(get_plugin_service)):
    return ConnectorService(db, plugin_service).update(connector_id, payload)


@router.post('/connectors/{connector_id}/test')
async def test_connector(connector_id: str, db: Session = Depends(get_db), plugin_service: PluginService = Depends(get_plugin_service)):
    return await ConnectorService(db, plugin_service).test(connector_id)


@router.post('/connectors/{connector_id}/actions/{action_name}')
async def connector_action(connector_id: str, action_name: str, payload: ConnectorActionRequest, db: Session = Depends(get_db), plugin_service: PluginService = Depends(get_plugin_service)):
    return await ConnectorService(db, plugin_service).execute_action(connector_id, action_name, payload.params)
