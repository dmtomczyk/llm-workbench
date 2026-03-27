from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import AsyncIterator
from uuid import uuid4

from fastapi import HTTPException
from math import ceil

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
from app.db.models import ChatMessage, ChatSession, Dataset, DatasetVersion, LLMProvider, Run
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
            session, user_message, provider_messages, context_info, run, selected_model = self._prepare_completion(session_id, payload, action_prefix='chat.stream')
            yield self._sse(
                'metadata',
                {
                    'sessionId': session.id,
                    'runId': run.id,
                    'contextInfo': context_info,
                    'messageId': None,
                },
            )
            cumulative = ''
            finalized = None
            async for event in self.provider_service.invoke_stream(
                session.provider_id,
                {
                    'run_id': run.id,
                    'model': selected_model,
                    'messages': provider_messages,
                    'max_output_tokens': context_info.get('max_output_tokens'),
                },
            ):
                event_type = event.get('event')
                if event_type == 'delta':
                    delta = str(event.get('delta') or '')
                    cumulative += delta
                    yield self._sse('chunk', {'delta': delta, 'content': cumulative, 'contextInfo': context_info})
                elif event_type == 'error':
                    self._mark_run_failed(run, session, 'chat.stream', event.get('message') or 'Streaming provider invocation failed', status_code=500)
                    yield self._sse('error', self._error_payload(event.get('detail') or event.get('message') or 'Streaming provider invocation failed', status_code=500))
                    return
                elif event_type == 'finalized':
                    finalized = event
            if finalized is None:
                finalized = {
                    'summary': 'Provider streaming completed',
                    'status': 'success',
                    'payload': {'type': 'text_bundle', 'title': 'LLM output', 'items': [{'name': 'response.txt', 'text': cumulative}], 'metadata': {}},
                    'raw': {'text': cumulative},
                    'metrics': {},
                    'warnings': [],
                    'audit_id': None,
                    'run_id': run.id,
                }
            provider_result = {
                'summary': finalized.get('summary'),
                'status': finalized.get('status'),
                'payload': finalized.get('payload'),
                'raw': finalized.get('raw'),
                'metrics': finalized.get('metrics'),
                'warnings': finalized.get('warnings'),
                'audit_id': finalized.get('audit_id'),
                'run_id': run.id,
                'context_info': context_info,
            }
            assistant_text = cumulative or self._assistant_text(provider_result)
            assistant_message = self.add_message(
                session.id,
                ChatMessageCreate(role='assistant', content=assistant_text, metadata={'provider_result_status': provider_result.get('status')}),
                run_id=run.id,
            )
            session.model_name = payload.model or session.model_name
            session.updated_at = datetime.now(UTC).isoformat()
            self.db.add(session)
            self.db.commit()
            audit = self.audit.record(
                AuditEventCreate(
                    action='chat.stream_finished',
                    entity_type='chat_session',
                    entity_id=session.id,
                    session_id=session.id,
                    run_id=run.id,
                    status='success' if provider_result.get('status') == 'success' else 'failed',
                    after={'assistant_message_id': assistant_message.id, 'provider_status': provider_result.get('status'), 'context_info': context_info},
                )
            )
            yield self._sse(
                'done',
                {
                    'sessionId': session.id,
                    'runId': run.id,
                    'auditId': audit.id,
                    'messageId': assistant_message.id,
                    'content': assistant_message.content,
                    'contextInfo': context_info,
                },
            )
        except HTTPException as exc:
            yield self._sse('error', self._error_payload(exc.detail, status_code=exc.status_code))
        except Exception as exc:  # noqa: BLE001
            yield self._sse('error', self._error_payload(exc))

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
        session, user_message, provider_messages, context_info, run, selected_model = self._prepare_completion(session_id, payload, action_prefix)
        try:
            provider_result = await self.provider_service.invoke(
                session.provider_id,
                {
                    'run_id': run.id,
                    'model': selected_model,
                    'messages': provider_messages,
                    'max_output_tokens': context_info.get('max_output_tokens'),
                },
            )
        except HTTPException as exc:
            self._mark_run_failed(run, session, action_prefix, exc.detail, status_code=exc.status_code)
            raise
        except Exception as exc:  # noqa: BLE001
            detail = {
                'message': str(exc) or 'Provider invocation failed',
                'type': exc.__class__.__name__,
                'run_id': run.id,
                'provider_id': session.provider_id,
            }
            self._mark_run_failed(run, session, action_prefix, detail, status_code=500)
            raise HTTPException(status_code=500, detail=detail) from exc
        provider_result['context_info'] = context_info
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
                after={'assistant_message_id': assistant_message.id, 'provider_status': provider_result.get('status'), 'context_info': context_info},
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

    def _prepare_completion(self, session_id: str, payload: ChatCompleteRequest, action_prefix: str) -> tuple[ChatSession, ChatMessageRead | None, list[dict[str, str]], dict[str, int | bool | None], Run, str | None]:
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
        provider = self._provider_row(session.provider_id)
        selected_model = payload.model or session.model_name or provider.default_model
        provider_messages, context_info = self._build_provider_messages(
            session.system_prompt,
            messages,
            provider,
            selected_model,
            session_metadata=json.loads(session.metadata_json or '{}'),
        )
        run = Run(
            id=f'run_{uuid4().hex}',
            run_type='chat_completion',
            source='ui',
            status='running',
            provider_id=session.provider_id,
            summary=f'Chat completion for {session.id}',
            started_at=datetime.now(UTC).isoformat(),
            metadata_json=json.dumps(
                {
                    'chat_session_id': session.id,
                    'message_count': len(provider_messages),
                    'mode': action_prefix,
                    'context_info': context_info,
                }
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
                after={'provider_id': session.provider_id, 'message_count': len(provider_messages), 'context_info': context_info},
            )
        )
        return session, user_message, provider_messages, context_info, run, selected_model

    def _session_row(self, session_id: str) -> ChatSession:
        row = self.db.get(ChatSession, session_id)
        if row is None:
            raise HTTPException(status_code=404, detail='Chat session not found')
        return row

    def _build_provider_messages(
        self,
        system_prompt: str | None,
        messages: list[ChatMessageRead],
        provider: LLMProvider,
        model: str | None,
        session_metadata: dict | None = None,
    ) -> tuple[list[dict[str, str]], dict[str, int | bool | None | str]]:
        capabilities = json.loads(provider.capabilities_json or '{}') if provider.capabilities_json else {}
        model_settings = ((capabilities.get('model_settings') or {}) if isinstance(capabilities, dict) else {})
        selected_settings = model_settings.get(model or '', {}) if isinstance(model_settings, dict) and model else {}
        context_window = selected_settings.get('context_window') if isinstance(selected_settings, dict) else None
        max_output_tokens = selected_settings.get('max_output_tokens') if isinstance(selected_settings, dict) else None

        provider_messages: list[dict[str, str]] = []
        grounding_message, grounding_info = self._grounding_system_message(session_metadata or {})
        if system_prompt:
            provider_messages.append({'role': 'system', 'content': system_prompt})
        if grounding_message:
            provider_messages.append({'role': 'system', 'content': grounding_message})

        if not context_window:
            provider_messages.extend({'role': message.role, 'content': message.content} for message in messages)
            return provider_messages, {
                'context_window': None,
                'max_output_tokens': max_output_tokens if isinstance(max_output_tokens, int) else None,
                'trimmed': False,
                'estimated_input_tokens': self._estimate_messages_tokens(provider_messages),
                'messages_included': len(messages),
                'messages_total': len(messages),
                **grounding_info,
            }

        reserve = max_output_tokens if isinstance(max_output_tokens, int) and max_output_tokens > 0 else max(1024, int(context_window * 0.2))
        input_budget = max(512, int(context_window) - reserve)
        system_tokens = self._estimate_text_tokens(system_prompt or '') if system_prompt else 0
        running_tokens = system_tokens
        kept: list[ChatMessageRead] = []
        for message in reversed(messages):
            message_tokens = self._estimate_text_tokens(message.content)
            if kept and running_tokens + message_tokens > input_budget:
                break
            if not kept and running_tokens + message_tokens > input_budget:
                kept.append(message)
                running_tokens += message_tokens
                break
            kept.append(message)
            running_tokens += message_tokens
        kept.reverse()
        provider_messages.extend({'role': message.role, 'content': message.content} for message in kept)
        return provider_messages, {
            'context_window': int(context_window),
            'max_output_tokens': max_output_tokens if isinstance(max_output_tokens, int) else None,
            'trimmed': len(kept) < len(messages),
            'estimated_input_tokens': self._estimate_messages_tokens(provider_messages),
            'messages_included': len(kept),
            'messages_total': len(messages),
            **grounding_info,
        }

    @staticmethod
    def _estimate_text_tokens(text: str) -> int:
        return max(1, ceil(len(text) / 4)) if text else 0

    def _estimate_messages_tokens(self, messages: list[dict[str, str]]) -> int:
        return sum(self._estimate_text_tokens(message.get('content', '')) + 4 for message in messages)

    def _grounding_system_message(self, session_metadata: dict) -> tuple[str | None, dict[str, str | bool | None]]:
        grounding = session_metadata.get('grounding') if isinstance(session_metadata, dict) else None
        if not isinstance(grounding, dict):
            return None, {'grounded': False, 'grounding_dataset_id': None}
        dataset_id = grounding.get('dataset_id')
        if not isinstance(dataset_id, str) or not dataset_id:
            return None, {'grounded': False, 'grounding_dataset_id': None}
        dataset = self.db.get(Dataset, dataset_id)
        if dataset is None:
            return None, {'grounded': False, 'grounding_dataset_id': dataset_id}
        version = self.db.scalar(select(DatasetVersion).where(DatasetVersion.dataset_id == dataset.id).order_by(desc(DatasetVersion.version_no)).limit(1))
        preview_text = 'No preview available.'
        row_count = None
        if version is not None:
            row_count = version.row_count
            try:
                metadata = json.loads(version.metadata_json or '{}')
                preview = metadata.get('preview')
                if preview is not None:
                    preview_text = json.dumps(preview, ensure_ascii=False)[:4000]
            except Exception:
                pass
        grounding_message = (
            'Use the attached dataset context below as a primary grounding source for this chat. '
            'Prefer answers supported by this dataset. If the answer is not present in the attached dataset, say that clearly.\n\n'
            f'Dataset ID: {dataset.id}\n'
            f'Dataset Name: {dataset.name}\n'
            f'Row Count: {row_count if row_count is not None else "unknown"}\n'
            f'Dataset Preview: {preview_text}'
        )
        return grounding_message, {'grounded': True, 'grounding_dataset_id': dataset.id}

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

    def _mark_run_failed(self, run: Run, session: ChatSession, action_prefix: str, detail: object, status_code: int = 500) -> None:
        run.status = 'failed'
        run.finished_at = datetime.now(UTC).isoformat()
        run.error_text = self._error_summary(detail)
        self.db.add(run)
        self.db.commit()
        self.audit.record(
            AuditEventCreate(
                action=f'{action_prefix}_finished',
                entity_type='chat_session',
                entity_id=session.id,
                session_id=session.id,
                run_id=run.id,
                status='failed',
                message=run.error_text,
                after={'provider_status': 'failed', 'status_code': status_code, 'error': self._error_payload(detail, status_code=status_code)},
            )
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
    def _error_summary(detail: object) -> str:
        if isinstance(detail, dict):
            for key in ('message', 'detail', 'error'):
                value = detail.get(key)
                if value:
                    return str(value)
            return json.dumps(detail, ensure_ascii=False)
        return str(detail)

    @classmethod
    def _error_payload(cls, detail: object, status_code: int | None = None) -> dict:
        payload = {
            'message': cls._error_summary(detail) or 'Request failed',
            'statusCode': status_code,
        }
        if isinstance(detail, dict):
            payload['detail'] = detail
        elif detail is not None:
            payload['detail'] = {'raw': str(detail)}
        return payload

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
