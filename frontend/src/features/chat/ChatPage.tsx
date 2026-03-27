import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';

import { useShellSubnav } from '../../components/shellSubnav';
import { api } from '../../lib/api';

type Provider = {
  id: string;
  name: string;
  kind: string;
  default_model?: string;
  capabilities?: Record<string, unknown>;
};

type Dataset = { id: string; name: string };

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
  grounded?: boolean;
  grounding_dataset_ids?: string[];
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

type StreamStatus = 'idle' | 'connecting' | 'streaming' | 'finalizing' | 'cancelled' | 'error';

type StreamEvent = {
  runId?: string;
  sessionId?: string;
  messageId?: string | null;
  content?: string;
  delta?: string;
  message?: string;
  statusCode?: number;
  detail?: Record<string, unknown>;
  contextInfo?: ContextInfo;
};

type LinkedGrounding = { dataset_ids?: string[]; dataset_id?: string };

function linkedDatasetIds(metadata: Record<string, unknown> | undefined): string[] {
  const grounding = metadata?.grounding as LinkedGrounding | undefined;
  if (!grounding) return [];
  if (Array.isArray(grounding.dataset_ids)) return grounding.dataset_ids.filter((item): item is string => typeof item === 'string' && item.length > 0);
  if (typeof grounding.dataset_id === 'string' && grounding.dataset_id) return [grounding.dataset_id];
  return [];
}

function sessionGroupLabel(updatedAt: string): string {
  const date = new Date(updatedAt);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((today - target) / 86400000);
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return 'This Week';
  return 'Earlier';
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
        {models.map((model) => <option key={model} value={model}>{model}</option>)}
      </select>
      {customMode ? <input id={inputId} value={value} onChange={(event) => onChange(event.target.value)} placeholder={inputPlaceholder} /> : null}
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

export function ChatPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [streamEnabled, setStreamEnabled] = useState(true);
  const [showSessionSettings, setShowSessionSettings] = useState(false);
  const [showSessionMenuModal, setShowSessionMenuModal] = useState(false);
  const [menuSessionId, setMenuSessionId] = useState('');
  const [showLinkDatasetModal, setShowLinkDatasetModal] = useState(false);
  const [composerText, setComposerText] = useState('');
  const [streamingReply, setStreamingReply] = useState('');
  const [streamStatus, setStreamStatus] = useState<StreamStatus>('idle');
  const [streamStatusText, setStreamStatusText] = useState('');
  const [lastSubmittedText, setLastSubmittedText] = useState('');
  const [newProviderId, setNewProviderId] = useState('');
  const [newModelName, setNewModelName] = useState('');
  const [newSystemPrompt, setNewSystemPrompt] = useState('');
  const [newLinkedDatasetIds, setNewLinkedDatasetIds] = useState<string[]>([]);
  const [datasetSearch, setDatasetSearch] = useState('');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftProviderId, setDraftProviderId] = useState('');
  const [draftModelName, setDraftModelName] = useState('');
  const [draftSystemPrompt, setDraftSystemPrompt] = useState('');
  const [headerLinkedDatasetIds, setHeaderLinkedDatasetIds] = useState<string[]>([]);
  const [providerModels, setProviderModels] = useState<Record<string, ProviderModelCache>>({});
  const [lastContextInfo, setLastContextInfo] = useState<ContextInfo | null>(null);

  const { setSubnav } = useShellSubnav();
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const activeStreamAbortRef = useRef<AbortController | null>(null);

  const selectedSession = useMemo(() => sessions.find((session) => session.id === selectedSessionId) ?? null, [sessions, selectedSessionId]);
  const menuSession = useMemo(() => sessions.find((session) => session.id === menuSessionId) ?? null, [sessions, menuSessionId]);
  const selectedProvider = useMemo(() => providers.find((provider) => provider.id === (selectedSession?.provider_id ?? draftProviderId)) ?? null, [providers, selectedSession?.provider_id, draftProviderId]);
  const selectedLinkedDatasetIds = linkedDatasetIds(selectedSession?.metadata);
  const linkedDatasets = useMemo(() => datasets.filter((dataset) => selectedLinkedDatasetIds.includes(dataset.id)), [datasets, selectedLinkedDatasetIds]);
  const newChatModels = providerModels[newProviderId]?.models ?? [];
  const draftModels = providerModels[draftProviderId]?.models ?? [];
  const newChatModelWarning = modelWarning(newModelName, newChatModels);
  const draftModelWarning = modelWarning(draftModelName, draftModels);
  const effectiveChatModel = draftModelName || selectedSession?.model_name || selectedProvider?.default_model;
  const effectiveModelSettings = getModelSettings(selectedProvider?.capabilities, effectiveChatModel);
  const selectedSessionHasProvider = Boolean(selectedSession?.provider_id);
  const filteredDatasets = useMemo(() => {
    const q = datasetSearch.trim().toLowerCase();
    if (!q) return datasets;
    return datasets.filter((dataset) => dataset.name.toLowerCase().includes(q) || dataset.id.toLowerCase().includes(q));
  }, [datasets, datasetSearch]);
  const groupedSessions = useMemo(() => {
    const sorted = [...sessions].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    const buckets: Record<string, ChatSession[]> = { Today: [], Yesterday: [], 'This Week': [], Earlier: [] };
    for (const session of sorted) {
      buckets[sessionGroupLabel(session.updated_at)].push(session);
    }
    return (['Today', 'Yesterday', 'This Week', 'Earlier'] as const)
      .map((label) => [label, buckets[label]] as const)
      .filter(([, group]) => group.length > 0);
  }, [sessions]);

  const chatSubnav = useMemo(() => (
    <div className="contextual-subnav chat-contextual-subnav">
      <div className="card chat-sidebar-card">
        <div className="chat-subnav-header">
          <button type="button" className="chat-new-button" onClick={() => void onCreateSession()}>+ New Chat</button>
        </div>
        <div className="chat-subnav-list">
          {groupedSessions.map(([label, group]) => (
            <div key={label} className="chat-session-group">
              <div className="muted chat-group-label">{label}</div>
              <ul className="session-list compact-session-list">
                {group.map((session) => {
                  const ids = linkedDatasetIds(session.metadata);
                  return (
                    <li key={session.id} className="session-row-item">
                      <div className={selectedSessionId === session.id ? 'session-row active' : 'session-row'}>
                        <button className={selectedSessionId === session.id ? 'session-button active compact-session-button' : 'session-button compact-session-button'} onClick={() => setSelectedSessionId(session.id)} type="button" title={session.title}>
                          <strong className="session-title-line">{session.title}</strong>
                        </button>
                        <button
                          type="button"
                          className="session-menu-button"
                          aria-label={`Open options for ${session.title}`}
                          title="Session options"
                          onClick={() => {
                            setMenuSessionId(session.id);
                            setShowSessionMenuModal(true);
                          }}
                        >
                          ⋯
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          {sessions.length === 0 ? <div className="muted">No chat sessions yet.</div> : null}
        </div>
      </div>
    </div>
  ), [groupedSessions, selectedSessionId, sessions.length]);

  async function ensureProviderModels(providerId: string, force = false) {
    if (!providerId) return;
    const existing = providerModels[providerId];
    const isFresh = existing && Date.now() - existing.fetchedAt < 5 * 60 * 1000;
    if (!force && isFresh) return;
    try {
      const result = await api<ProviderModelsResponse>(`/api/providers/${providerId}/models`);
      setProviderModels((current) => ({ ...current, [providerId]: { models: result.models, fetchedAt: Date.now(), message: result.message } }));
    } catch {
      // ignore
    }
  }

  async function loadProvidersAndSessions(preferredSessionId?: string) {
    const [providerData, datasetData, sessionData] = await Promise.all([
      api<Provider[]>('/api/providers').catch(() => []),
      api<Dataset[]>('/api/datasets').catch(() => []),
      api<ChatSession[]>('/api/chat/sessions').catch(() => []),
    ]);
    setProviders(providerData);
    setDatasets(datasetData);
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

  useEffect(() => { void loadProvidersAndSessions(); }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const datasetId = params.get('dataset_id') || '';
    if (datasetId) setNewLinkedDatasetIds([datasetId]);
  }, []);

  useEffect(() => { void loadMessages(selectedSessionId); }, [selectedSessionId]);

  useEffect(() => {
    setDraftTitle(selectedSession?.title ?? '');
    setDraftProviderId(selectedSession?.provider_id ?? '');
    setDraftModelName(selectedSession?.model_name ?? '');
    setDraftSystemPrompt(selectedSession?.system_prompt ?? '');
    setHeaderLinkedDatasetIds(linkedDatasetIds(selectedSession?.metadata));
  }, [selectedSession]);

  useEffect(() => { if (newProviderId) void ensureProviderModels(newProviderId); }, [newProviderId]);
  useEffect(() => { if (draftProviderId) void ensureProviderModels(draftProviderId); }, [draftProviderId]);
  useEffect(() => { if (transcriptRef.current) transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight; }, [messages, streamingReply]);
  useEffect(() => { if (selectedSessionId && !sending) window.setTimeout(() => composerRef.current?.focus(), 0); }, [selectedSessionId, sending]);

  useEffect(() => {
    setSubnav(chatSubnav);
    return () => setSubnav(null);
  }, [chatSubnav, setSubnav]);

  function buildMetadata(datasetIds: string[]) {
    return datasetIds.length > 0 ? { grounding: { dataset_ids: datasetIds } } : {};
  }

  async function onCreateSession() {
    setError('');
    try {
      const created = await api<ChatSession>('/api/chat/sessions', {
        method: 'POST',
        body: JSON.stringify({
          provider_id: newProviderId || '',
          model_name: newModelName || undefined,
          system_prompt: newSystemPrompt || undefined,
          metadata: buildMetadata(newLinkedDatasetIds),
        }),
      });
      setNewModelName('');
      setNewSystemPrompt('');
      setNewLinkedDatasetIds([]);
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
          metadata: buildMetadata(headerLinkedDatasetIds),
        }),
      });
      setLastContextInfo(null);
      await loadProvidersAndSessions(updated.id);
    } catch (err) {
      setError(formatChatError(err));
    }
  }

  async function onApplyLinkedDatasets() {
    if (!selectedSession) return;
    setError('');
    try {
      const updated = await api<ChatSession>(`/api/chat/sessions/${selectedSession.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: selectedSession.title,
          provider_id: selectedSession.provider_id,
          model_name: selectedSession.model_name || null,
          system_prompt: selectedSession.system_prompt || null,
          metadata: buildMetadata(headerLinkedDatasetIds),
        }),
      });
      setShowLinkDatasetModal(false);
      await loadProvidersAndSessions(updated.id);
      await loadMessages(updated.id);
    } catch (err) {
      setError(formatChatError(err));
    }
  }

  async function onDeleteSession(sessionOverride?: ChatSession | null) {
    const targetSession = sessionOverride ?? selectedSession;
    if (!targetSession) return;
    if (!window.confirm(`Delete chat session "${targetSession.title}"?`)) return;
    setError('');
    try {
      await api(`/api/chat/sessions/${targetSession.id}`, { method: 'DELETE' });
      setMessages([]);
      setStreamingReply('');
      setShowSessionMenuModal(false);
      setMenuSessionId('');
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
    const optimisticMessage: ChatMessage = { id: `temp-user-${Date.now()}`, session_id: selectedSessionId, role: 'user', content, sequence_no: messages.length + 1, created_at: new Date().toISOString() };
    setLastSubmittedText(content);
    setMessages((current) => [...current, optimisticMessage]);
    setSending(true);
    setError('');
    setStreamingReply('');
    setStreamStatus('idle');
    setStreamStatusText('');
    try {
      if (streamEnabled) {
        await streamSend(selectedSessionId, content);
      } else {
        const result = await api<ChatCompleteResponse>(`/api/chat/sessions/${selectedSessionId}/complete`, { method: 'POST', body: JSON.stringify({ content }) });
        setLastContextInfo(result.provider_result.context_info ?? null);
        if (result.provider_result.status !== 'success') throw new Error(`Provider returned ${result.provider_result.status}: ${result.provider_result.summary}`);
      }
      await loadProvidersAndSessions(selectedSessionId);
      await loadMessages(selectedSessionId);
      setStreamingReply('');
      setStreamStatus('idle');
      setStreamStatusText('');
      setComposerText('');
      window.setTimeout(() => composerRef.current?.focus(), 0);
    } catch (err) {
      setError(formatChatError(err));
      await loadMessages(selectedSessionId);
      if (streamEnabled && streamingReply.trim()) {
        setStreamStatus('error');
        setStreamStatusText('Stream interrupted — partial response shown below.');
      } else {
        setStreamingReply('');
        setStreamStatus('idle');
        setStreamStatusText('');
      }
    } finally {
      setSending(false);
    }
  }

  async function streamSend(sessionId: string, content: string) {
    const abortController = new AbortController();
    activeStreamAbortRef.current = abortController;
    setStreamStatus('connecting');
    setStreamStatusText('Connecting to provider…');
    let latestContent = '';
    try {
      const response = await fetch(`/api/chat/sessions/${sessionId}/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
        signal: abortController.signal,
      });
      if (!response.ok || !response.body) throw new Error(await response.text() || 'Streaming request failed');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let sawDone = false;
      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';
        for (const part of parts) {
          const lines = part.split('\n');
          let eventName = 'message';
          const dataLines: string[] = [];
          for (const line of lines) {
            if (line.startsWith('event:')) eventName = line.slice(6).trim();
            if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
          }
          if (dataLines.length === 0) continue;
          const data = JSON.parse(dataLines.join('\n')) as StreamEvent;
          if (data.contextInfo) setLastContextInfo(data.contextInfo);
          if (eventName === 'metadata') {
            setStreamStatus('connecting');
            setStreamStatusText('Connected — waiting for first tokens…');
            continue;
          }
          if (eventName === 'chunk') {
            latestContent = data.content || latestContent;
            setStreamStatus('streaming');
            setStreamStatusText('Streaming response…');
            setStreamingReply(latestContent);
            continue;
          }
          if (eventName === 'done') {
            sawDone = true;
            setStreamStatus('finalizing');
            setStreamStatusText('Finalizing message…');
            continue;
          }
          if (eventName === 'error') {
            const hasPartial = Boolean((data.content || latestContent).trim());
            setStreamStatus('error');
            setStreamStatusText(hasPartial ? 'Stream interrupted — partial response shown below.' : 'Stream failed before any response was received.');
            throw new Error(describeStreamError(data));
          }
        }
        if (done) break;
      }
      if (!sawDone) {
        const hasPartial = Boolean(latestContent.trim());
        setStreamStatus(hasPartial ? 'error' : 'idle');
        setStreamStatusText(hasPartial ? 'Connection closed before the response finished.' : 'Stream ended unexpectedly before any response was received.');
        throw new Error(hasPartial ? 'Stream ended before final confirmation was received.' : 'Stream ended unexpectedly before any response was received.');
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        const hasPartial = Boolean(latestContent.trim());
        setStreamStatus(hasPartial ? 'cancelled' : 'idle');
        setStreamStatusText(hasPartial ? 'Streaming cancelled — partial response shown below.' : 'Streaming cancelled.');
        return;
      }
      throw err;
    } finally {
      activeStreamAbortRef.current = null;
    }
  }

  function onComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter') return;
    if (event.shiftKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  function toggleDatasetSelection(datasetId: string, selectedIds: string[], setSelectedIds: (ids: string[]) => void) {
    setSelectedIds(selectedIds.includes(datasetId) ? selectedIds.filter((id) => id !== datasetId) : [...selectedIds, datasetId]);
  }

  async function copyStreamingReply() {
    if (!streamingReply.trim()) return;
    try {
      await navigator.clipboard.writeText(streamingReply);
      setStreamStatusText('Partial response copied to clipboard.');
    } catch {
      setError('Could not copy the partial response to the clipboard.');
    }
  }

  function cancelStreaming() {
    activeStreamAbortRef.current?.abort();
  }

  async function retryLastSend() {
    if (!selectedSessionId || !lastSubmittedText.trim() || sending) return;
    setComposerText(lastSubmittedText);
    const optimisticMessage: ChatMessage = {
      id: `temp-user-retry-${Date.now()}`,
      session_id: selectedSessionId,
      role: 'user',
      content: lastSubmittedText,
      sequence_no: messages.length + 1,
      created_at: new Date().toISOString(),
    };
    setMessages((current) => [...current, optimisticMessage]);
    setSending(true);
    setError('');
    setStreamingReply('');
    setStreamStatus('idle');
    setStreamStatusText('');
    try {
      if (streamEnabled) {
        await streamSend(selectedSessionId, lastSubmittedText);
      } else {
        const result = await api<ChatCompleteResponse>(`/api/chat/sessions/${selectedSessionId}/complete`, { method: 'POST', body: JSON.stringify({ content: lastSubmittedText }) });
        setLastContextInfo(result.provider_result.context_info ?? null);
        if (result.provider_result.status !== 'success') throw new Error(`Provider returned ${result.provider_result.status}: ${result.provider_result.summary}`);
      }
      await loadProvidersAndSessions(selectedSessionId);
      await loadMessages(selectedSessionId);
      setStreamingReply('');
      setStreamStatus('idle');
      setStreamStatusText('');
      setComposerText('');
      window.setTimeout(() => composerRef.current?.focus(), 0);
    } catch (err) {
      setError(formatChatError(err));
      await loadMessages(selectedSessionId);
      if (streamEnabled && streamingReply.trim()) {
        setStreamStatus('error');
        setStreamStatusText('Stream interrupted — partial response shown below.');
      } else {
        setStreamingReply('');
        setStreamStatus('idle');
        setStreamStatusText('');
      }
    } finally {
      setSending(false);
    }
  }

  const streamBannerClass = streamStatus === 'error' ? 'notice error' : 'notice';
  const submitLabel = sending
    ? (streamEnabled
      ? (streamStatus === 'connecting'
        ? 'Connecting…'
        : streamStatus === 'finalizing'
          ? 'Finalizing…'
          : streamStatus === 'cancelled'
            ? 'Cancelled'
            : 'Streaming…')
      : 'Sending…')
    : (streamEnabled ? 'Send + stream' : 'Send');

  return (
    <div className="stack chat-page-single">
      <div className="card stack chat-main-panel">
        <div className="chat-header-controls stack">
          <div className="row between wrap">
            <div className="stack compact-stack">
              <h2>{selectedSession?.title ?? 'Chat'}</h2>
              <div className="muted">{selectedSession ? `${providers.find((provider) => provider.id === selectedSession.provider_id)?.name ?? selectedSession.provider_id} · ${selectedSession.model_name ?? 'default model'}` : 'Create or select a session'}</div>
              {lastContextInfo ? (
                <div className="muted">
                  Context usage: ~{lastContextInfo.estimated_input_tokens ?? '—'} input tokens
                  {lastContextInfo.context_window ? ` / ${lastContextInfo.context_window}` : ''}
                  {lastContextInfo.max_output_tokens ? ` · reserved out ${lastContextInfo.max_output_tokens}` : ''}
                  {lastContextInfo.trimmed ? ' · older history trimmed' : ' · full history kept'}
                </div>
              ) : null}
            </div>
            <div className="row wrap">
              <button type="button" onClick={() => setShowLinkDatasetModal(true)} disabled={!selectedSession}>Link Dataset</button>
              <button type="button" onClick={() => setShowSessionSettings((current) => !current)} disabled={!selectedSession}>{showSessionSettings ? 'Hide settings' : 'Settings'}</button>
              <button type="button" onClick={() => exportTranscript('markdown')} disabled={!selectedSession}>Export .md</button>
              <button type="button" onClick={() => exportTranscript('txt')} disabled={!selectedSession}>Export .txt</button>
              <button type="button" onClick={() => { void onDeleteSession(); }} disabled={!selectedSession} className="danger-button">Delete</button>
            </div>
          </div>

          <div className="row wrap">
            {linkedDatasets.length > 0 ? linkedDatasets.map((dataset) => (
              <span key={dataset.id} className="pill">{dataset.name}</span>
            )) : <span className="pill">No linked datasets</span>}
          </div>

          {selectedSession && showSessionSettings ? (
            <div className="chat-header-grid">
              <input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} placeholder="Session title" />
              <select value={draftProviderId} onChange={(event) => setDraftProviderId(event.target.value)}>{providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}</select>
              <ModelPicker value={draftModelName} models={draftModels} onChange={setDraftModelName} selectId="draft-chat-model-select" inputId="draft-chat-model-input" inputPlaceholder="Custom model override" />
              {providerModels[draftProviderId]?.fetchedAt ? <div className="muted">Models fetched {new Date(providerModels[draftProviderId].fetchedAt).toLocaleTimeString()}</div> : null}
              {draftModelWarning ? <div className="muted">{draftModelWarning}</div> : null}
              <textarea value={draftSystemPrompt} onChange={(event) => setDraftSystemPrompt(event.target.value)} rows={3} placeholder="System prompt" className="chat-system-prompt" />
              <div className="row between wrap">
                <label className="checkbox-row"><input type="checkbox" checked={streamEnabled} onChange={(event) => setStreamEnabled(event.target.checked)} /><span>Stream responses</span></label>
                <button type="button" onClick={onSaveSession}>Save session settings</button>
              </div>
              <div className="muted">Configured model limits: context {effectiveModelSettings.contextWindow ?? 'not set'} · max output {effectiveModelSettings.maxOutputTokens ?? 'not set'}</div>
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
                {typeof lastContextInfo.messages_included === 'number' && typeof lastContextInfo.messages_total === 'number' ? ` · included ${lastContextInfo.messages_included}/${lastContextInfo.messages_total} messages` : ''}
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
              <div className="message-role">
                assistant · {streamStatus === 'error' ? 'interrupted' : streamStatus === 'cancelled' ? 'cancelled' : streamStatus === 'finalizing' ? 'finalizing' : 'streaming'}
              </div>
              {streamStatusText ? <div className="muted">{streamStatusText}</div> : null}
              <pre>{streamingReply}</pre>
              {(streamStatus === 'error' || streamStatus === 'cancelled') ? (
                <div className="row wrap">
                  <button type="button" onClick={() => void retryLastSend()} disabled={!lastSubmittedText || sending}>Retry send</button>
                  <button type="button" onClick={() => void copyStreamingReply()} disabled={!streamingReply.trim()}>Copy partial</button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <form className="stack chat-composer" onSubmit={onSend}>
          {!selectedSessionHasProvider && selectedSession ? (
            <div className="notice error">
              <strong>Provider required.</strong> This chat was created without a provider. Open <strong>Settings</strong> and choose one before sending messages.
            </div>
          ) : null}
          <textarea ref={composerRef} value={composerText} onChange={(event) => setComposerText(event.target.value)} onKeyDown={onComposerKeyDown} name="content" placeholder={selectedSessionId ? (selectedSessionHasProvider ? 'Type your message…' : 'Choose a provider in Settings to enable chatting') : 'Create or select a chat first'} rows={5} disabled={!selectedSessionId || sending || !selectedSessionHasProvider} />
          {(streamEnabled && streamStatus !== 'idle' && streamStatusText) ? (
            <div className={streamBannerClass}>{streamStatusText}</div>
          ) : null}
          <div className="row between wrap">
            {error ? <pre>{error}</pre> : <span className="muted">Linked datasets are injected into this session’s chat context.</span>}
            <div className="row wrap">
              {sending && streamEnabled ? <button type="button" onClick={cancelStreaming}>Cancel stream</button> : null}
              <button type="submit" disabled={!selectedSessionId || sending || !selectedSessionHasProvider}>{submitLabel}</button>
            </div>
          </div>
        </form>
      </div>

      {showSessionMenuModal ? (
        <div className="modal-backdrop" onClick={() => setShowSessionMenuModal(false)}>
          <div className="modal-card modal-card-sm" onClick={(event) => event.stopPropagation()}>
            <div className="row between wrap">
              <h2>Session Options</h2>
              <button type="button" onClick={() => setShowSessionMenuModal(false)}>Close</button>
            </div>
            <div className="muted">{menuSession?.title ?? 'Selected chat session'}</div>
            <div className="stack">
              <button type="button" onClick={() => {
                if (menuSession) setSelectedSessionId(menuSession.id);
                setShowSessionSettings(true);
                setShowSessionMenuModal(false);
              }}>Open settings</button>
              <button type="button" onClick={() => {
                if (menuSession) setSelectedSessionId(menuSession.id);
                setShowLinkDatasetModal(true);
                setShowSessionMenuModal(false);
              }}>Link datasets</button>
              <button type="button" onClick={() => {
                if (!menuSession) return;
                setSelectedSessionId(menuSession.id);
                exportTranscript('markdown');
                setShowSessionMenuModal(false);
              }}>Export .md</button>
              <button type="button" onClick={() => {
                if (!menuSession) return;
                setSelectedSessionId(menuSession.id);
                exportTranscript('txt');
                setShowSessionMenuModal(false);
              }}>Export .txt</button>
              <button type="button" className="danger-button" onClick={() => { void onDeleteSession(menuSession); }}>Delete session</button>
            </div>
          </div>
        </div>
      ) : null}

      {showLinkDatasetModal ? (
        <div className="modal-backdrop" onClick={() => setShowLinkDatasetModal(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="row between wrap"><h2>Link Dataset</h2><button type="button" onClick={() => setShowLinkDatasetModal(false)}>Close</button></div>
            <div className="muted">Choose one or more datasets to include in this chat session’s context.</div>
            <input value={datasetSearch} onChange={(event) => setDatasetSearch(event.target.value)} placeholder="Search datasets by name or ID" />
            <div className="row wrap">
              <span className="pill">{filteredDatasets.length} shown</span>
              <span className="pill">{headerLinkedDatasetIds.length} linked</span>
            </div>
            <div className="stack modal-list">
              {filteredDatasets.map((dataset) => (
                <label key={dataset.id} className="checkbox-row modal-checkbox-row">
                  <input type="checkbox" checked={headerLinkedDatasetIds.includes(dataset.id)} onChange={() => toggleDatasetSelection(dataset.id, headerLinkedDatasetIds, setHeaderLinkedDatasetIds)} />
                  <span>{dataset.name}</span>
                  <span className="muted">{dataset.id}</span>
                </label>
              ))}
              {filteredDatasets.length === 0 ? <div className="muted">No datasets match your search.</div> : null}
            </div>
            <div className="row between wrap">
              <button type="button" onClick={() => setHeaderLinkedDatasetIds([])}>Clear all</button>
              <button type="button" onClick={() => void onApplyLinkedDatasets()} disabled={!selectedSession}>Apply linked datasets</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
