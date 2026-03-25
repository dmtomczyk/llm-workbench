from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import AsyncIterator
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.audit.schemas import AuditEventCreate
from app.audit.service import AuditService
from app.chat.schemas import (
    ChatCompleteRequest,
    ChatCompleteResponse,
    ChatMessageCreate,
    ChatMessageRead,
    ChatSessionCreate,
    ChatSessionRead,
    ChatSessionUpdate,
)
from app.db.models import ChatMessage, ChatSession, LLMProvider, Run
from app.providers.service import ProviderService


WELCOME_SESSION_ID = 'chat_demo_welcome'
WELCOME_MESSAGE_ID = 'chatmsg_demo_welcome'
WELCOME_TEXT = (
    'Welcome — this is the seeded demo chat. Try sending a message here with the '
    '`demo-mock` provider, or start a new session against `ollama-local` if you have Ollama running.'
)


@dataclass(slots=True)
class CompletionResult:
    session: ChatSessionRead
    user_message: ChatMessageRead | None
    assistant_message: ChatMessageRead
    run_id: str
    audit_id: str | None
    provider_result: dict


class ChatService:
    def __init__(self, db: Session, provider_service: ProviderService):
        self.db = db
        self.provider_service = provider_service
        self.audit = AuditService(db)

    def seed_defaults(self) -> None:
        provider = self.db.get(LLMProvider, 'prv_demo_mock')
        if provider is None:
            return
        session = self.db.get(ChatSession, WELCOME_SESSION_ID)
        if session is None:
            session = ChatSession(
                id=WELCOME_SESSION_ID,
                title='Welcome chat',
                provider_id=provider.id,
                model_name=provider.default_model,
                system_prompt='You are a helpful demo assistant for first-run product verification.',
                message_count=1,
                metadata_json=json.dumps({'seeded': True, 'demo': True}),
            )
            self.db.add(session)
            self.db.flush()
            message = ChatMessage(
                id=WELCOME_MESSAGE_ID,
                session_id=session.id,
                sequence_no=1,
                role='assistant',
                content_text=WELCOME_TEXT,
                metadata_json=json.dumps({'seeded': True, 'demo': True}),
            )
            self.db.add(message)
            self.db.commit()
            self.audit.record(
                AuditEventCreate(
                    action='chat.session_seeded',
                    entity_type='chat_session',
                    entity_id=session.id,
                    session_id=session.id,
                    after={'title': session.title, 'provider_id': session.provider_id},
                    source='system',
                )
            )

    def list_sessions(self) -> list[ChatSessionRead]:
        rows = self.db.scalars(select(ChatSession).order_by(desc(ChatSession.updated_at))).all()
        return [self._session_to_read(row) for row in rows]

    def create_session(self, payload: ChatSessionCreate) -> ChatSessionRead:
        provider = self._provider_row(payload.provider_id)
        title = (payload.title or '').strip() or f'Chat with {provider.name}'
        row = ChatSession(
            id=f'chat_{uuid4().hex}',
            title=title,
            provider_id=provider.id,
            model_name=payload.model_name or provider.default_model,
            system_prompt=payload.system_prompt,
            metadata_json=json.dumps(payload.metadata or {}),
        )
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        read = self._session_to_read(row)
        self.audit.record(
            AuditEventCreate(
                action='chat.session_created',
                entity_type='chat_session',
                entity_id=row.id,
                session_id=row.id,
                after=read.model_dump(),
            )
        )
        return read

    def get_session(self, session_id: str) -> ChatSessionRead:
        return self._session_to_read(self._session_row(session_id))

    def update_session(self, session_id: str, payload: ChatSessionUpdate) -> ChatSessionRead:
        row = self._session_row(session_id)
        before = self._session_to_read(row).model_dump()
        if payload.provider_id is not None:
            provider = self._provider_row(payload.provider_id)
            row.provider_id = provider.id
            if payload.model_name is None and not row.model_name:
                row.model_name = provider.default_model
        if payload.title is not None:
            row.title = payload.title.strip() or row.title
        if payload.model_name is not None:
            row.model_name = payload.model_name or None
        if payload.system_prompt is not None:
            row.system_prompt = payload.system_prompt or None
        if payload.metadata is not None:
            row.metadata_json = json.dumps(payload.metadata)
        row.updated_at = datetime.now(UTC).isoformat()
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        read = self._session_to_read(row)
        self.audit.record(
            AuditEventCreate(
                action='chat.session_updated',
                entity_type='chat_session',
                entity_id=row.id,
                session_id=row.id,
                before=before,
                after=read.model_dump(),
            )
        )
        return read

    def delete_session(self, session_id: str) -> dict[str, bool]:
        row = self._session_row(session_id)
        before = self._session_to_read(row).model_dump()
        messages = self.db.scalars(select(ChatMessage).where(ChatMessage.session_id == session_id)).all()
        for message in messages:
            self.db.delete(message)
        self.db.delete(row)
        self.db.commit()
        self.audit.record(
            AuditEventCreate(
                action='chat.session_deleted',
                entity_type='chat_session',
                entity_id=session_id,
                session_id=session_id,
                before=before,
            )
        )
        return {'ok': True}

    def list_messages(self, session_id: str) -> list[ChatMessageRead]:
        self._session_row(session_id)
        rows = self.db.scalars(
            select(ChatMessage).where(ChatMessage.session_id == session_id).order_by(ChatMessage.sequence_no)
        ).all()
        return [self._message_to_read(row) for row in rows]

    def add_message(self, session_id: str, payload: ChatMessageCreate, run_id: str | None = None) -> ChatMessageRead:
        session = self._session_row(session_id)
        sequence_no = self._next_sequence_no(session.id)
        row = ChatMessage(
            id=f'chatmsg_{uuid4().hex}',
            session_id=session.id,
            run_id=run_id,
            sequence_no=sequence_no,
            role=payload.role,
            content_text=payload.content,
            metadata_json=json.dumps(payload.metadata or {}),
        )
        session.message_count = sequence_no
        session.updated_at = datetime.now(UTC).isoformat()
        if session.title.startswith('Chat with') and payload.role == 'user':
            derived = payload.content.strip().splitlines()[0][:80]
            if derived:
                session.title = derived
        self.db.add_all([row, session])
        self.db.commit()
        self.db.refresh(row)
        self.audit.record(
            AuditEventCreate(
                action='chat.message_created',
                entity_type='chat_message',
                entity_id=row.id,
                session_id=session.id,
                run_id=run_id,
                after={'role': row.role, 'sequence_no': row.sequence_no},
            )
        )
        return self._message_to_read(row)

    async def complete(self, session_id: str, payload: ChatCompleteRequest) -> ChatCompleteResponse:
        result = await self._complete_impl(session_id, payload, action_prefix='chat.completion')
        return ChatCompleteResponse(
            ok=True,
            session=result.session,
            user_message=result.user_message,
            assistant_message=result.assistant_message,
            run_id=result.run_id,
            audit_id=result.audit_id,
            provider_result=result.provider_result,
        )

    async def stream_complete_events(self, session_id: str, payload: ChatCompleteRequest) -> AsyncIterator[str]:
        try:
            result = await self._complete_impl(session_id, payload, action_prefix='chat.stream')
            yield self._sse(
                'metadata',
                {
                    'sessionId': result.session.id,
                    'runId': result.run_id,
                    'auditId': result.audit_id,
                    'messageId': result.assistant_message.id,
                },
            )
            cumulative = ''
            for chunk in self._chunk_text(result.assistant_message.content):
                cumulative += chunk
                yield self._sse('chunk', {'delta': chunk, 'content': cumulative})
            yield self._sse(
                'done',
                {
                    'sessionId': result.session.id,
                    'runId': result.run_id,
                    'auditId': result.audit_id,
                    'messageId': result.assistant_message.id,
                    'content': result.assistant_message.content,
                },
            )
        except Exception as exc:  # noqa: BLE001
            yield self._sse('error', {'message': str(exc)})

    def export_transcript(self, session_id: str, export_format: str = 'markdown') -> tuple[str, str, str]:
        session = self._session_row(session_id)
        messages = self.list_messages(session_id)
        export_format = export_format.lower()
        if export_format not in {'markdown', 'txt'}:
            raise HTTPException(status_code=400, detail='Unsupported export format')
        title = session.title.replace('/', '-').replace('\\', '-')[:80] or 'chat'
        if export_format == 'markdown':
            body = self._render_markdown_export(session, messages)
            media_type = 'text/markdown; charset=utf-8'
            filename = f'{title}.md'
        else:
            body = self._render_text_export(session, messages)
            media_type = 'text/plain; charset=utf-8'
            filename = f'{title}.txt'
        self.audit.record(
            AuditEventCreate(
                action='chat.transcript_exported',
                entity_type='chat_session',
                entity_id=session.id,
                session_id=session.id,
                after={'format': export_format, 'message_count': len(messages)},
            )
        )
        return body, media_type, filename

    async def _complete_impl(self, session_id: str, payload: ChatCompleteRequest, action_prefix: str) -> CompletionResult:
        session = self._session_row(session_id)
        user_message = None
        if payload.content and payload.content.strip():
            user_message = self.add_message(
                session.id,
                ChatMessageCreate(role='user', content=payload.content.strip(), metadata=payload.metadata),
            )
        messages = self.list_messages(session.id)
        if not messages and not session.system_prompt:
            raise HTTPException(status_code=400, detail='Chat session has no messages to complete')
        provider_messages: list[dict[str, str]] = []
        if session.system_prompt:
            provider_messages.append({'role': 'system', 'content': session.system_prompt})
        provider_messages.extend({'role': message.role, 'content': message.content} for message in messages)
        run = Run(
            id=f'run_{uuid4().hex}',
            run_type='chat_completion',
            source='ui',
            status='running',
            provider_id=session.provider_id,
            summary=f'Chat completion for {session.id}',
            started_at=datetime.now(UTC).isoformat(),
            metadata_json=json.dumps(
                {'chat_session_id': session.id, 'message_count': len(provider_messages), 'mode': action_prefix}
            ),
        )
        self.db.add(run)
        self.db.commit()
        self.audit.record(
            AuditEventCreate(
                action=f'{action_prefix}_started',
                entity_type='chat_session',
                entity_id=session.id,
                session_id=session.id,
                run_id=run.id,
                after={'provider_id': session.provider_id, 'message_count': len(provider_messages)},
            )
        )
        provider_result = await self.provider_service.invoke(
            session.provider_id,
            {
                'run_id': run.id,
                'model': payload.model or session.model_name,
                'messages': provider_messages,
            },
        )
        assistant_text = self._assistant_text(provider_result)
        assistant_message = self.add_message(
            session.id,
            ChatMessageCreate(
                role='assistant',
                content=assistant_text,
                metadata={'provider_result_status': provider_result.get('status')},
            ),
            run_id=run.id,
        )
        session.model_name = payload.model or session.model_name
        session.updated_at = datetime.now(UTC).isoformat()
        self.db.add(session)
        self.db.commit()
        audit = self.audit.record(
            AuditEventCreate(
                action=f'{action_prefix}_finished',
                entity_type='chat_session',
                entity_id=session.id,
                session_id=session.id,
                run_id=run.id,
                status='success' if provider_result.get('status') == 'success' else 'failed',
                after={'assistant_message_id': assistant_message.id, 'provider_status': provider_result.get('status')},
            )
        )
        return CompletionResult(
            session=self._session_to_read(session),
            user_message=user_message,
            assistant_message=assistant_message,
            run_id=run.id,
            audit_id=audit.id,
            provider_result=provider_result,
        )

    def _session_row(self, session_id: str) -> ChatSession:
        row = self.db.get(ChatSession, session_id)
        if row is None:
            raise HTTPException(status_code=404, detail='Chat session not found')
        return row

    def _provider_row(self, provider_id: str) -> LLMProvider:
        row = self.db.get(LLMProvider, provider_id)
        if row is None:
            raise HTTPException(status_code=404, detail='Provider not found')
        return row

    def _next_sequence_no(self, session_id: str) -> int:
        current = self.db.scalar(select(func.max(ChatMessage.sequence_no)).where(ChatMessage.session_id == session_id))
        return int(current or 0) + 1

    def _session_to_read(self, row: ChatSession) -> ChatSessionRead:
        last_message = self.db.scalar(
            select(ChatMessage).where(ChatMessage.session_id == row.id).order_by(desc(ChatMessage.sequence_no)).limit(1)
        )
        preview = None
        if last_message is not None:
            preview = last_message.content_text[:120]
        return ChatSessionRead(
            id=row.id,
            title=row.title,
            provider_id=row.provider_id,
            model_name=row.model_name,
            system_prompt=row.system_prompt,
            provider_conversation_id=row.provider_conversation_id,
            message_count=row.message_count,
            metadata=json.loads(row.metadata_json or '{}'),
            last_message_preview=preview,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )

    @staticmethod
    def _message_to_read(row: ChatMessage) -> ChatMessageRead:
        return ChatMessageRead(
            id=row.id,
            session_id=row.session_id,
            run_id=row.run_id,
            sequence_no=row.sequence_no,
            role=row.role,
            content=row.content_text,
            provider_message_id=row.provider_message_id,
            metadata=json.loads(row.metadata_json or '{}'),
            created_at=row.created_at,
        )

    @staticmethod
    def _assistant_text(provider_result: dict) -> str:
        payload = provider_result.get('payload') or {}
        items = payload.get('items') or []
        chunks = []
        for item in items:
            if isinstance(item, dict):
                if item.get('text'):
                    chunks.append(str(item['text']))
                elif item.get('name'):
                    chunks.append(str(item['name']))
                else:
                    chunks.append(json.dumps(item, ensure_ascii=False))
            else:
                chunks.append(str(item))
        if chunks:
            return '\n\n'.join(chunks)
        return provider_result.get('summary') or '(no assistant output)'

    @staticmethod
    def _chunk_text(text: str, chunk_size: int = 32) -> list[str]:
        if not text:
            return ['']
        return [text[i:i + chunk_size] for i in range(0, len(text), chunk_size)]

    @staticmethod
    def _sse(event: str, data: dict) -> str:
        return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"

    def _render_markdown_export(self, session: ChatSession, messages: list[ChatMessageRead]) -> str:
        lines = [f'# {session.title}', '', f'- Provider: {session.provider_id}', f'- Model: {session.model_name or "default"}']
        if session.system_prompt:
            lines.extend(['', '## System prompt', '', session.system_prompt])
        lines.extend(['', '## Transcript', ''])
        for message in messages:
            lines.extend([f'### {message.role.title()}', '', message.content, ''])
        return '\n'.join(lines).strip() + '\n'

    def _render_text_export(self, session: ChatSession, messages: list[ChatMessageRead]) -> str:
        lines = [session.title, '=' * len(session.title), '', f'Provider: {session.provider_id}', f'Model: {session.model_name or "default"}']
        if session.system_prompt:
            lines.extend(['', 'System prompt:', session.system_prompt])
        lines.append('')
        for message in messages:
            lines.extend([f'[{message.role.upper()}]', message.content, ''])
        return '\n'.join(lines).strip() + '\n'
