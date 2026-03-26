import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';

import { api } from '../../lib/api';

type Provider = {
  id: string;
  name: string;
  kind: string;
  default_model?: string;
  capabilities?: Record<string, unknown>;
};
type ProviderModelsResponse = { ok: boolean; provider_id: string; models: string[]; source?: string | null; message?: string | null };
type ProviderModelCache = { models: string[]; fetchedAt: number; message?: string | null };
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

type ContextInfo = {
  context_window?: number | null;
  max_output_tokens?: number | null;
  trimmed?: boolean;
  estimated_input_tokens?: number;
  messages_included?: number;
  messages_total?: number;
};

type ChatCompleteResponse = {
  ok: boolean;
  run_id: string;
  provider_result: {
    status: string;
    summary: string;
    raw?: Record<string, unknown>;
    run_id?: string;
    context_info?: ContextInfo;
  };
};

type StreamEvent = {
  sessionId?: string;
  runId?: string;
  auditId?: string;
  messageId?: string;
  content?: string;
  delta?: string;
  message?: string;
  statusCode?: number;
  detail?: Record<string, unknown>;
  contextInfo?: ContextInfo;
};

function ModelPicker({
  value,
  models,
  onChange,
  selectId,
  inputId,
  inputPlaceholder,
}: {
  value: string;
  models: string[];
  onChange: (value: string) => void;
  selectId: string;
  inputId: string;
  inputPlaceholder: string;
}) {
  const listed = value ? models.includes(value) : false;
  const [customMode, setCustomMode] = useState(Boolean(value) && !listed);

  useEffect(() => {
    setCustomMode(Boolean(value) && !models.includes(value));
  }, [value, models]);

  if (models.length === 0) {
    return <input id={inputId} value={value} onChange={(event) => onChange(event.target.value)} placeholder={inputPlaceholder} />;
  }

  return (
    <div className="stack">
      <select
        id={selectId}
        value={customMode ? '__custom__' : value || '__none__'}
        onChange={(event) => {
          const next = event.target.value;
          if (next === '__none__') {
            setCustomMode(false);
            onChange('');
            return;
          }
          if (next === '__custom__') {
            setCustomMode(true);
            return;
          }
          setCustomMode(false);
          onChange(next);
        }}
      >
        <option value="__none__">Default model</option>
        <option value="__custom__">Custom override…</option>
        {models.map((model) => (
          <option key={model} value={model}>{model}</option>
        ))}
      </select>
      {customMode ? (
        <input
          id={inputId}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={inputPlaceholder}
        />
      ) : null}
    </div>
  );
}

function formatChatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function describeStreamError(data: StreamEvent): string {
  const lines = [data.message || 'Streaming failed'];
  if (data.statusCode) lines.push(`status: ${data.statusCode}`);
  if (data.runId) lines.push(`run: ${data.runId}`);
  if (data.detail) lines.push(JSON.stringify(data.detail, null, 2));
  return lines.join('\n');
}

function modelWarning(model: string, models: string[]): string {
  if (!model || models.length === 0) return '';
  return models.includes(model) ? '' : 'Selected model is not in the last fetched provider model list.';
}

function getModelSettings(capabilities: Record<string, unknown> | undefined, model: string | undefined): { contextWindow?: number; maxOutputTokens?: number } {
  if (!capabilities || !model) return {};
  const modelSettings = (capabilities.model_settings as Record<string, unknown> | undefined) ?? {};
  const settings = (modelSettings[model] as Record<string, unknown> | undefined) ?? {};
  return {
    contextWindow: typeof settings.context_window === 'number' ? settings.context_window : undefined,
    maxOutputTokens: typeof settings.max_output_tokens === 'number' ? settings.max_output_tokens : undefined,
  };
}

export function ChatPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string>('');
  const [sending, setSending] = useState(false);
  const [streamEnabled, setStreamEnabled] = useState(true);
  const [showSessionSettings, setShowSessionSettings] = useState(false);
  const [composerText, setComposerText] = useState('');
  const [streamingReply, setStreamingReply] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newProviderId, setNewProviderId] = useState('');
  const [newModelName, setNewModelName] = useState('');
  const [newSystemPrompt, setNewSystemPrompt] = useState('');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftProviderId, setDraftProviderId] = useState('');
  const [draftModelName, setDraftModelName] = useState('');
  const [draftSystemPrompt, setDraftSystemPrompt] = useState('');
  const [providerModels, setProviderModels] = useState<Record<string, ProviderModelCache>>({});
  const [lastContextInfo, setLastContextInfo] = useState<ContextInfo | null>(null);

  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) ?? null,
    [sessions, selectedSessionId],
  );
  const selectedProvider = useMemo(
    () => providers.find((provider) => provider.id === (selectedSession?.provider_id ?? draftProviderId)) ?? null,
    [providers, selectedSession?.provider_id, draftProviderId],
  );

  const newChatModels = providerModels[newProviderId]?.models ?? [];
  const draftModels = providerModels[draftProviderId]?.models ?? [];
  const newChatModelWarning = modelWarning(newModelName, newChatModels);
  const draftModelWarning = modelWarning(draftModelName, draftModels);
  const effectiveChatModel = draftModelName || selectedSession?.model_name || selectedProvider?.default_model;
  const effectiveModelSettings = getModelSettings(selectedProvider?.capabilities, effectiveChatModel);

  async function ensureProviderModels(providerId: string, force = false) {
    if (!providerId) return;
    const existing = providerModels[providerId];
    const isFresh = existing && Date.now() - existing.fetchedAt < 5 * 60 * 1000;
    if (!force && isFresh) return;
    try {
      const result = await api<ProviderModelsResponse>(`/api/providers/${providerId}/models`);
      setProviderModels((current) => ({
        ...current,
        [providerId]: {
          models: result.models,
          fetchedAt: Date.now(),
          message: result.message,
        },
      }));
    } catch {
      // Ignore model list failures in chat setup; freeform entry still works.
    }
  }

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
    setNewProviderId((current) => current || providerData[0]?.id || '');
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

  useEffect(() => {
    if (newProviderId) void ensureProviderModels(newProviderId);
  }, [newProviderId]);

  useEffect(() => {
    if (draftProviderId) void ensureProviderModels(draftProviderId);
  }, [draftProviderId]);

  useEffect(() => {
    if (!transcriptRef.current) return;
    transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
  }, [messages, streamingReply]);

  useEffect(() => {
    if (!selectedSessionId || sending) return;
    window.setTimeout(() => composerRef.current?.focus(), 0);
  }, [selectedSessionId, sending]);

  useEffect(() => {
    if (!selectedSessionId) return;
    window.setTimeout(() => composerRef.current?.focus(), 0);
  }, []);

  async function onCreateSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    try {
      const created = await api<ChatSession>('/api/chat/sessions', {
        method: 'POST',
        body: JSON.stringify({
          title: newTitle || undefined,
          provider_id: newProviderId,
          model_name: newModelName || undefined,
          system_prompt: newSystemPrompt || undefined,
        }),
      });
      setNewTitle('');
      setNewModelName('');
      setNewSystemPrompt('');
      await loadProvidersAndSessions(created.id);
      window.setTimeout(() => composerRef.current?.focus(), 0);
    } catch (err) {
      setError(formatChatError(err));
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
      setLastContextInfo(null);
      await loadProvidersAndSessions(updated.id);
      window.setTimeout(() => composerRef.current?.focus(), 0);
    } catch (err) {
      setError(formatChatError(err));
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
      setError(formatChatError(err));
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
    const content = composerText.trim();
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
        const result = await api<ChatCompleteResponse>(`/api/chat/sessions/${selectedSessionId}/complete`, {
          method: 'POST',
          body: JSON.stringify({ content }),
        });
        setLastContextInfo(result.provider_result.context_info ?? null);
        if (result.provider_result.status !== 'success') {
          throw new Error(`Provider returned ${result.provider_result.status}: ${result.provider_result.summary}`);
        }
      }
      await loadProvidersAndSessions(selectedSessionId);
      await loadMessages(selectedSessionId);
      setStreamingReply('');
      setComposerText('');
      window.setTimeout(() => composerRef.current?.focus(), 0);
    } catch (err) {
      setError(formatChatError(err));
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
      const rawText = await response.text();
      throw new Error(rawText || 'Streaming request failed');
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
          if (data.contextInfo) setLastContextInfo(data.contextInfo);
          if (eventName === 'chunk') {
            setStreamingReply(data.content || '');
          } else if (eventName === 'error') {
            throw new Error(describeStreamError(data));
          }
        });
      }
      if (done) break;
    }
    window.setTimeout(() => composerRef.current?.focus(), 0);
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

  function onComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter') return;
    if (event.shiftKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  return (
    <div className="grid chat-layout chat-page">
      <div className="stack chat-sidebar">
        <div className="card">
          <h2>New chat</h2>
          <form className="stack" onSubmit={onCreateSession}>
            <input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="Optional title" />
            <select value={newProviderId} onChange={(event) => setNewProviderId(event.target.value)} required>
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>{provider.name}</option>
              ))}
            </select>
            <ModelPicker
              value={newModelName}
              models={newChatModels}
              onChange={setNewModelName}
              selectId="new-chat-model-select"
              inputId="new-chat-model-input"
              inputPlaceholder="Custom model override"
            />
            {providerModels[newProviderId]?.fetchedAt ? <div className="muted">Models fetched {new Date(providerModels[newProviderId].fetchedAt).toLocaleTimeString()}</div> : null}
            {newChatModelWarning ? <div className="muted">{newChatModelWarning}</div> : null}
            <textarea value={newSystemPrompt} onChange={(event) => setNewSystemPrompt(event.target.value)} placeholder="Optional system prompt" rows={4} />
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

      <div className="card stack chat-main-panel">
        <div className="chat-header-controls stack">
          <div className="row between">
            <div>
              <h2>{selectedSession?.title ?? 'Chat'}</h2>
              <div className="muted">{selectedSession ? `${providers.find((provider) => provider.id === selectedSession.provider_id)?.name ?? selectedSession.provider_id} · ${selectedSession.model_name ?? 'default model'}` : 'Create or select a session'}</div>
              <div className="muted">
                Effective model: {effectiveChatModel ?? 'provider default / unset'}
                {effectiveChatModel
                  ? (effectiveModelSettings.contextWindow || effectiveModelSettings.maxOutputTokens
                    ? `${effectiveModelSettings.contextWindow ? ` · ctx ${effectiveModelSettings.contextWindow}` : ''}${effectiveModelSettings.maxOutputTokens ? ` · max out ${effectiveModelSettings.maxOutputTokens}` : ''}`
                    : ' · no configured model profile')
                  : ''}
              </div>
              {lastContextInfo ? (
                <div className="muted">
                  Context usage: ~{lastContextInfo.estimated_input_tokens ?? '—'} input tokens
                  {lastContextInfo.context_window ? ` / ${lastContextInfo.context_window}` : ''}
                  {lastContextInfo.max_output_tokens ? ` · reserved out ${lastContextInfo.max_output_tokens}` : ''}
                  {typeof lastContextInfo.messages_included === 'number' && typeof lastContextInfo.messages_total === 'number'
                    ? ` · included ${lastContextInfo.messages_included}/${lastContextInfo.messages_total} messages`
                    : ''}
                  {lastContextInfo.trimmed ? ' · older history trimmed' : ' · full history kept'}
                </div>
              ) : null}
            </div>
            <div className="row wrap">
              <button type="button" onClick={() => setShowSessionSettings((current) => !current)} disabled={!selectedSession}>
                {showSessionSettings ? 'Hide settings' : 'Show settings'}
              </button>
              <button type="button" onClick={() => exportTranscript('markdown')} disabled={!selectedSession}>Export .md</button>
              <button type="button" onClick={() => exportTranscript('txt')} disabled={!selectedSession}>Export .txt</button>
              <button type="button" onClick={onDeleteSession} disabled={!selectedSession} className="danger-button">Delete</button>
            </div>
          </div>

          {selectedSession && showSessionSettings ? (
            <div className="chat-header-grid">
              <input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} placeholder="Session title" />
              <select value={draftProviderId} onChange={(event) => setDraftProviderId(event.target.value)}>
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>{provider.name}</option>
                ))}
              </select>
              <ModelPicker
                value={draftModelName}
                models={draftModels}
                onChange={setDraftModelName}
                selectId="draft-chat-model-select"
                inputId="draft-chat-model-input"
                inputPlaceholder="Custom model override"
              />
              {providerModels[draftProviderId]?.fetchedAt ? <div className="muted">Models fetched {new Date(providerModels[draftProviderId].fetchedAt).toLocaleTimeString()}</div> : null}
              {draftModelWarning ? <div className="muted">{draftModelWarning}</div> : null}
              <textarea value={draftSystemPrompt} onChange={(event) => setDraftSystemPrompt(event.target.value)} rows={3} placeholder="System prompt" className="chat-system-prompt" />
              <div className="row between">
                <label className="checkbox-row">
                  <input type="checkbox" checked={streamEnabled} onChange={(event) => setStreamEnabled(event.target.checked)} />
                  <span>Stream responses</span>
                </label>
                <button type="button" onClick={onSaveSession}>Save session settings</button>
              </div>
              <div className="muted">
                Configured model limits: context {effectiveModelSettings.contextWindow ?? 'not set'} · max output {effectiveModelSettings.maxOutputTokens ?? 'not set'}
              </div>
              <div className="muted">Current chat context handling: saved session history is replayed on each turn, but BRIDGE now trims older messages when a configured context window would be exceeded and passes configured max output tokens to the provider when supported.</div>
              {lastContextInfo ? (
                <div className="muted">Latest send: ~{lastContextInfo.estimated_input_tokens ?? '—'} input tokens · included {lastContextInfo.messages_included ?? '—'}/{lastContextInfo.messages_total ?? '—'} messages{lastContextInfo.trimmed ? ' · trimming active' : ' · no trimming needed'}</div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="chat-transcript" ref={transcriptRef}>
          {lastContextInfo ? (
            <div className={lastContextInfo.trimmed ? 'chat-context-banner warning' : 'chat-context-banner'}>
              <strong>Context budget</strong>
              <span>
                ~{lastContextInfo.estimated_input_tokens ?? '—'} input tokens
                {lastContextInfo.context_window ? ` / ${lastContextInfo.context_window}` : ''}
                {lastContextInfo.max_output_tokens ? ` · reserved out ${lastContextInfo.max_output_tokens}` : ''}
                {typeof lastContextInfo.messages_included === 'number' && typeof lastContextInfo.messages_total === 'number'
                  ? ` · included ${lastContextInfo.messages_included}/${lastContextInfo.messages_total} messages`
                  : ''}
                {lastContextInfo.trimmed
                  ? ` · dropped ${Math.max(0, (lastContextInfo.messages_total ?? 0) - (lastContextInfo.messages_included ?? 0))} older messages`
                  : ' · no trimming needed'}
              </span>
            </div>
          ) : null}
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

        <form className="stack chat-composer" onSubmit={onSend}>
          <textarea ref={composerRef} value={composerText} onChange={(event) => setComposerText(event.target.value)} onKeyDown={onComposerKeyDown} name="content" placeholder={selectedSessionId ? 'Type your message…' : 'Create or select a chat first'} rows={5} disabled={!selectedSessionId || sending} />
          <div className="row between wrap">
            {error ? <pre>{error}</pre> : <span className="muted">Each send creates run, llm_interaction, chat_message, and audit records.</span>}
            <button type="submit" disabled={!selectedSessionId || sending}>{sending ? (streamEnabled ? 'Streaming…' : 'Sending…') : (streamEnabled ? 'Send + stream' : 'Send')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
