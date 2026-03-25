from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_plugin_service
from app.chat.schemas import (
    ChatCompleteRequest,
    ChatCompleteResponse,
    ChatMessageCreate,
    ChatMessageRead,
    ChatSessionCreate,
    ChatSessionRead,
    ChatSessionUpdate,
)
from app.chat.service import ChatService
from app.db.session import get_db
from app.plugins.service import PluginService
from app.providers.service import ProviderService

router = APIRouter()


def _service(db: Session, plugin_service: PluginService) -> ChatService:
    return ChatService(db, ProviderService(db, plugin_service))


@router.get('/chat/sessions', response_model=list[ChatSessionRead])
def list_chat_sessions(db: Session = Depends(get_db), plugin_service: PluginService = Depends(get_plugin_service)):
    return _service(db, plugin_service).list_sessions()


@router.post('/chat/sessions', response_model=ChatSessionRead)
def create_chat_session(payload: ChatSessionCreate, db: Session = Depends(get_db), plugin_service: PluginService = Depends(get_plugin_service)):
    return _service(db, plugin_service).create_session(payload)


@router.get('/chat/sessions/{session_id}', response_model=ChatSessionRead)
def get_chat_session(session_id: str, db: Session = Depends(get_db), plugin_service: PluginService = Depends(get_plugin_service)):
    return _service(db, plugin_service).get_session(session_id)


@router.patch('/chat/sessions/{session_id}', response_model=ChatSessionRead)
def update_chat_session(session_id: str, payload: ChatSessionUpdate, db: Session = Depends(get_db), plugin_service: PluginService = Depends(get_plugin_service)):
    return _service(db, plugin_service).update_session(session_id, payload)


@router.delete('/chat/sessions/{session_id}')
def delete_chat_session(session_id: str, db: Session = Depends(get_db), plugin_service: PluginService = Depends(get_plugin_service)):
    return _service(db, plugin_service).delete_session(session_id)


@router.get('/chat/sessions/{session_id}/messages', response_model=list[ChatMessageRead])
def list_chat_messages(session_id: str, db: Session = Depends(get_db), plugin_service: PluginService = Depends(get_plugin_service)):
    return _service(db, plugin_service).list_messages(session_id)


@router.post('/chat/sessions/{session_id}/messages', response_model=ChatMessageRead)
def add_chat_message(session_id: str, payload: ChatMessageCreate, db: Session = Depends(get_db), plugin_service: PluginService = Depends(get_plugin_service)):
    return _service(db, plugin_service).add_message(session_id, payload)


@router.post('/chat/sessions/{session_id}/complete', response_model=ChatCompleteResponse)
async def complete_chat(session_id: str, payload: ChatCompleteRequest, db: Session = Depends(get_db), plugin_service: PluginService = Depends(get_plugin_service)):
    return await _service(db, plugin_service).complete(session_id, payload)


@router.post('/chat/sessions/{session_id}/stream')
async def stream_chat(session_id: str, payload: ChatCompleteRequest, db: Session = Depends(get_db), plugin_service: PluginService = Depends(get_plugin_service)):
    return StreamingResponse(_service(db, plugin_service).stream_complete_events(session_id, payload), media_type='text/event-stream')


@router.get('/chat/sessions/{session_id}/export')
def export_chat(session_id: str, format: str = Query(default='markdown'), db: Session = Depends(get_db), plugin_service: PluginService = Depends(get_plugin_service)):
    body, media_type, filename = _service(db, plugin_service).export_transcript(session_id, export_format=format)
    return Response(body, media_type=media_type, headers={'Content-Disposition': f'attachment; filename="{filename}"'})
