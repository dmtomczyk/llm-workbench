import { FormEvent, useEffect, useMemo, useState } from 'react';

import { api } from '../../lib/api';

type Provider = { id: string; name: string; kind: string; default_model?: string };
type ChatSession = {
  id: string;
  title: string;
  provider_id: string;
  model_name?: string;
  system_prompt?: string;
  message_count: number;
  last_message_preview?: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
};
type ChatMessage = {
  id: string;
  session_id: string;
  role: string;
  content: string;
  sequence_no: number;
  created_at: string;
};

type ChatCompleteResponse = {
  ok: boolean;
  run_id: string;
  provider_result: { status: string; summary: string };
};

type StreamEvent = {
  sessionId?: string;
  runId?: string;
  auditId?: string;
  messageId?: string;
  content?: string;
  delta?: string;
  message?: string;
};

export function ChatPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string>('');
  const [sending, setSending] = useState(false);
  const [streamEnabled, setStreamEnabled] = useState(true);
  const [streamingReply, setStreamingReply] = useState('');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftProviderId, setDraftProviderId] = useState('');
  const [draftModelName, setDraftModelName] = useState('');
  const [draftSystemPrompt, setDraftSystemPrompt] = useState('');

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) ?? null,
    [sessions, selectedSessionId],
  );

  async function loadProvidersAndSessions(preferredSessionId?: string) {
    const [providerData, sessionData] = await Promise.all([
      api<Provider[]>('/api/providers').catch(() => []),
      api<ChatSession[]>('/api/chat/sessions').catch(() => []),
    ]);
    setProviders(providerData);
    setSessions(sessionData);
    setSelectedSessionId((current) => {
      const preferred = preferredSessionId ?? current;
      if (preferred && sessionData.some((session) => session.id === preferred)) return preferred;
      return sessionData[0]?.id || '';
    });
  }

  async function loadMessages(sessionId: string) {
    if (!sessionId) {
      setMessages([]);
      return;
    }
    const data = await api<ChatMessage[]>(`/api/chat/sessions/${sessionId}/messages`).catch(() => []);
    setMessages(data);
  }

  useEffect(() => {
    void loadProvidersAndSessions();
  }, []);

  useEffect(() => {
    void loadMessages(selectedSessionId);
  }, [selectedSessionId]);

  useEffect(() => {
    setDraftTitle(selectedSession?.title ?? '');
    setDraftProviderId(selectedSession?.provider_id ?? '');
    setDraftModelName(selectedSession?.model_name ?? '');
    setDraftSystemPrompt(selectedSession?.system_prompt ?? '');
  }, [selectedSession]);

  async function onCreateSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    setError('');
    try {
      const created = await api<ChatSession>('/api/chat/sessions', {
        method: 'POST',
        body: JSON.stringify({
          title: form.get('title') || undefined,
          provider_id: form.get('provider_id'),
          model_name: form.get('model_name') || undefined,
          system_prompt: form.get('system_prompt') || undefined,
        }),
      });
      await loadProvidersAndSessions(created.id);
      formEl.reset();
    } catch (err) {
      setError(String(err));
    }
  }

  async function onSaveSession() {
    if (!selectedSession) return;
    setError('');
    try {
      const updated = await api<ChatSession>(`/api/chat/sessions/${selectedSession.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: draftTitle,
          provider_id: draftProviderId,
          model_name: draftModelName || null,
          system_prompt: draftSystemPrompt || null,
        }),
      });
      await loadProvidersAndSessions(updated.id);
    } catch (err) {
      setError(String(err));
    }
  }

  async function onDeleteSession() {
    if (!selectedSession) return;
    if (!window.confirm(`Delete chat session "${selectedSession.title}"?`)) return;
    setError('');
    try {
      await api(`/api/chat/sessions/${selectedSession.id}`, { method: 'DELETE' });
      setMessages([]);
      setStreamingReply('');
      await loadProvidersAndSessions();
    } catch (err) {
      setError(String(err));
    }
  }

  function exportTranscript(format: 'markdown' | 'txt') {
    if (!selectedSession) return;
    const link = document.createElement('a');
    link.href = `/api/chat/sessions/${selectedSession.id}/export?format=${format}`;
    link.download = '';
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async function onSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSessionId) return;
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const content = String(form.get('content') || '').trim();
    if (!content) return;
    const optimisticMessage: ChatMessage = {
      id: `temp-user-${Date.now()}`,
      session_id: selectedSessionId,
      role: 'user',
      content,
      sequence_no: messages.length + 1,
      created_at: new Date().toISOString(),
    };
    setMessages((current) => [...current, optimisticMessage]);
    setSending(true);
    setError('');
    setStreamingReply('');
    try {
      if (streamEnabled) {
        await streamSend(selectedSessionId, content);
      } else {
        await api<ChatCompleteResponse>(`/api/chat/sessions/${selectedSessionId}/complete`, {
          method: 'POST',
          body: JSON.stringify({ content }),
        });
      }
      await loadProvidersAndSessions(selectedSessionId);
      await loadMessages(selectedSessionId);
      setStreamingReply('');
      formEl.reset();
    } catch (err) {
      setError(String(err));
      await loadMessages(selectedSessionId);
      setStreamingReply('');
    } finally {
      setSending(false);
    }
  }

  async function streamSend(sessionId: string, content: string) {
    const response = await fetch(`/api/chat/sessions/${sessionId}/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (!response.ok || !response.body) {
      throw new Error((await response.text()) || 'Streaming request failed');
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';
      for (const part of parts) {
        processSseEvent(part, (eventName, data) => {
          if (eventName === 'chunk') {
            setStreamingReply(data.content || '');
          } else if (eventName === 'error') {
            throw new Error(data.message || 'Streaming failed');
          }
        });
      }
      if (done) break;
    }
  }

  function processSseEvent(block: string, onEvent: (eventName: string, data: StreamEvent) => void) {
    const lines = block.split('\n');
    let eventName = 'message';
    const dataLines: string[] = [];
    for (const line of lines) {
      if (line.startsWith('event:')) eventName = line.slice(6).trim();
      if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
    }
    if (dataLines.length === 0) return;
    onEvent(eventName, JSON.parse(dataLines.join('\n')) as StreamEvent);
  }

  return (
    <div className="grid chat-layout">
      <div className="stack">
        <div className="card">
          <h2>New chat</h2>
          <form className="stack" onSubmit={onCreateSession}>
            <input name="title" placeholder="Optional title" />
            <select name="provider_id" required defaultValue={providers[0]?.id ?? ''}>
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>{provider.name}</option>
              ))}
            </select>
            <input name="model_name" placeholder="Optional model override" />
            <textarea name="system_prompt" placeholder="Optional system prompt" rows={4} />
            <button type="submit">Create chat</button>
          </form>
          <p className="muted">For a no-setup test, pick <strong>demo-mock</strong>. For a real local model, try <strong>ollama-local</strong>.</p>
        </div>

        <div className="card">
          <h2>Sessions</h2>
          <ul className="list session-list">
            {sessions.map((session) => (
              <li key={session.id}>
                <button
                  className={selectedSessionId === session.id ? 'session-button active' : 'session-button'}
                  onClick={() => setSelectedSessionId(session.id)}
                  type="button"
                >
                  <strong>{session.title}</strong>
                  <div className="muted">{providers.find((provider) => provider.id === session.provider_id)?.name ?? session.provider_id}</div>
                  <div className="muted">{session.last_message_preview ?? 'No messages yet'}</div>
                </button>
              </li>
            ))}
            {sessions.length === 0 ? <li>No chat sessions yet.</li> : null}
          </ul>
        </div>
      </div>

      <div className="card stack">
        <div className="chat-header-controls stack">
          <div className="row between">
            <div>
              <h2>{selectedSession?.title ?? 'Chat'}</h2>
              <div className="muted">{selectedSession ? `${providers.find((provider) => provider.id === selectedSession.provider_id)?.name ?? selectedSession.provider_id} · ${selectedSession.model_name ?? 'default model'}` : 'Create or select a session'}</div>
            </div>
            <div className="row wrap">
              <button type="button" onClick={() => exportTranscript('markdown')} disabled={!selectedSession}>Export .md</button>
              <button type="button" onClick={() => exportTranscript('txt')} disabled={!selectedSession}>Export .txt</button>
              <button type="button" onClick={onDeleteSession} disabled={!selectedSession} className="danger-button">Delete</button>
            </div>
          </div>

          {selectedSession ? (
            <div className="chat-header-grid">
              <input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} placeholder="Session title" />
              <select value={draftProviderId} onChange={(event) => setDraftProviderId(event.target.value)}>
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>{provider.name}</option>
                ))}
              </select>
              <input value={draftModelName} onChange={(event) => setDraftModelName(event.target.value)} placeholder="Model override" />
              <textarea value={draftSystemPrompt} onChange={(event) => setDraftSystemPrompt(event.target.value)} rows={3} placeholder="System prompt" className="chat-system-prompt" />
              <div className="row between">
                <label className="checkbox-row">
                  <input type="checkbox" checked={streamEnabled} onChange={(event) => setStreamEnabled(event.target.checked)} />
                  <span>Stream responses</span>
                </label>
                <button type="button" onClick={onSaveSession}>Save session settings</button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="chat-transcript">
          {messages.length === 0 ? <p className="muted">No messages yet.</p> : messages.map((message) => (
            <div key={message.id} className={message.role === 'assistant' ? 'message assistant' : message.role === 'system' ? 'message system' : 'message user'}>
              <div className="message-role">{message.role}</div>
              <pre>{message.content}</pre>
            </div>
          ))}
          {streamingReply ? (
            <div className="message assistant streaming-message">
              <div className="message-role">assistant · streaming</div>
              <pre>{streamingReply}</pre>
            </div>
          ) : null}
        </div>

        <form className="stack" onSubmit={onSend}>
          <textarea name="content" placeholder={selectedSessionId ? 'Type your message…' : 'Create or select a chat first'} rows={5} disabled={!selectedSessionId || sending} />
          <div className="row between wrap">
            {error ? <span>{error}</span> : <span className="muted">Each send creates run, llm_interaction, chat_message, and audit records.</span>}
            <button type="submit" disabled={!selectedSessionId || sending}>{sending ? (streamEnabled ? 'Streaming…' : 'Sending…') : (streamEnabled ? 'Send + stream' : 'Send')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
