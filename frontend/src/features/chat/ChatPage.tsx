import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';

import { useShellSubnav } from '../../components/shellSubnav';
import { Alert } from '../../design-system/components/Alert';
import { Modal } from '../../design-system/components/Modal';
import { MultiLineTextField } from '../../design-system/components/MultiLineTextField';
import { Popover } from '../../design-system/components/Popover';
import { StatusChip } from '../../design-system/components/StatusChip';
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
  created_at: string;
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
  metadata?: Record<string, unknown>;
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
  grounding_dataset_names?: string[];
  grounding_dataset_count?: number;
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
type SendMode = 'send' | 'regenerate';

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

function parseSessionTimestamp(value: string): number {
  const text = value.trim();
  const normalized = /[zZ]|[+-]\d\d:\d\d$/.test(text)
    ? text
    : (text.includes('T') ? `${text}Z` : `${text.replace(' ', 'T')}Z`);
  const parsed = new Date(normalized).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function sessionGroupLabel(updatedAt: string): string {
  const date = new Date(parseSessionTimestamp(updatedAt));
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((today - target) / 86400000);
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return 'This Week';
  return 'Earlier';
}

function isAutoTitle(session: ChatSession | null | undefined): boolean {
  return Boolean(session?.metadata && session.metadata.title_auto);
}

function displaySessionTitle(session: ChatSession | null | undefined): string {
  if (!session) return 'Chat';
  return session.message_count === 0 && isAutoTitle(session) ? 'New chat' : session.title;
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

function formatLinkedDatasetsLabel(names: string[]): string {
  if (names.length === 0) return 'Linked Datasets';
  if (names.length <= 2) return `Linked Datasets: ${names.join(', ')}`;
  return `Linked Datasets: ${names.slice(0, 2).join(', ')} +${names.length - 2} more`;
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
  const [pendingDeleteSessionId, setPendingDeleteSessionId] = useState('');
  const [renamingSessionId, setRenamingSessionId] = useState('');
  const [renamingTitle, setRenamingTitle] = useState('');
  const [composerText, setComposerText] = useState('');
  const [streamingReply, setStreamingReply] = useState('');
  const [streamStatus, setStreamStatus] = useState<StreamStatus>('idle');
  const [streamStatusText, setStreamStatusText] = useState('');
  const [lastSubmittedText, setLastSubmittedText] = useState('');
  const [lastSendMode, setLastSendMode] = useState<SendMode>('send');
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
  const composerFormRef = useRef<HTMLFormElement | null>(null);
  const activeStreamAbortRef = useRef<AbortController | null>(null);
  const sessionMenuRef = useRef<HTMLDivElement | null>(null);
  const sessionSettingsTitleRef = useRef<HTMLInputElement | null>(null);

  const selectedSession = useMemo(() => sessions.find((session) => session.id === selectedSessionId) ?? null, [sessions, selectedSessionId]);
  const menuSession = useMemo(() => sessions.find((session) => session.id === menuSessionId) ?? null, [sessions, menuSessionId]);
  const pendingDeleteSession = useMemo(() => sessions.find((session) => session.id === pendingDeleteSessionId) ?? null, [sessions, pendingDeleteSessionId]);
  const selectedProvider = useMemo(() => providers.find((provider) => provider.id === (selectedSession?.provider_id ?? draftProviderId)) ?? null, [providers, selectedSession?.provider_id, draftProviderId]);
  const selectedLinkedDatasetIds = linkedDatasetIds(selectedSession?.metadata);
  const linkedDatasets = useMemo(() => datasets.filter((dataset) => selectedLinkedDatasetIds.includes(dataset.id)), [datasets, selectedLinkedDatasetIds]);
  const requestedDatasetId = useMemo(() => new URLSearchParams(window.location.search).get('dataset_id') || '', []);
  const requestedProviderId = useMemo(() => new URLSearchParams(window.location.search).get('provider_id') || '', []);
  const requestedModelName = useMemo(() => new URLSearchParams(window.location.search).get('model') || '', []);
  const requestedDataset = useMemo(() => datasets.find((dataset) => dataset.id === requestedDatasetId) ?? null, [datasets, requestedDatasetId]);
  const requestedProvider = useMemo(() => providers.find((provider) => provider.id === requestedProviderId) ?? null, [providers, requestedProviderId]);
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
    const sorted = [...sessions].sort((a, b) => {
      const updatedDiff = parseSessionTimestamp(b.updated_at) - parseSessionTimestamp(a.updated_at);
      if (updatedDiff !== 0) return updatedDiff;
      const createdDiff = parseSessionTimestamp(b.created_at) - parseSessionTimestamp(a.created_at);
      if (createdDiff !== 0) return createdDiff;
      return b.id.localeCompare(a.id);
    });
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
          <StatusChip text="+ New Chat" tone="selected" chipStyle="box" backgroundEffect="glow" haloBoost={1.25} clickable onClick={() => void onCreateSession()} />
        </div>
        <div className="chat-subnav-list">
          {groupedSessions.map(([label, group]) => (
            <div key={label} className="chat-session-group">
              <div className="muted chat-group-label">{label}</div>
              <ul className="session-list compact-session-list">
                {group.map((session) => {
                  const ids = linkedDatasetIds(session.metadata);
                  const providerName = providers.find((provider) => provider.id === session.provider_id)?.name ?? session.provider_id;
                  return (
                    <li key={session.id} className="session-row-item">
                      <div className={selectedSessionId === session.id ? 'session-row active' : 'session-row'}>
                        {renamingSessionId === session.id ? (
                          <input
                            autoFocus
                            value={renamingTitle}
                            onChange={(event) => setRenamingTitle(event.target.value)}
                            onBlur={() => void submitRenamingSession(session)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault();
                                void submitRenamingSession(session);
                              } else if (event.key === 'Escape') {
                                event.preventDefault();
                                cancelRenamingSession();
                              }
                            }}
                            placeholder="Rename chat"
                          />
                        ) : (
                          <button
                            className={selectedSessionId === session.id ? 'session-button active compact-session-button' : 'session-button compact-session-button'}
                            onClick={() => setSelectedSessionId(session.id)}
                            onDoubleClick={() => startRenamingSession(session)}
                            type="button"
                            title={session.title}
                          >
                            <span className="session-copy">
                              <strong className="session-title-line">{displaySessionTitle(session)}</strong>
                              <span className="muted session-meta-line">
                                {providerName} · {ids.length > 0 ? `${ids.length} dataset${ids.length === 1 ? '' : 's'}` : 'no datasets'}
                              </span>
                            </span>
                          </button>
                        )}
                        <div className="session-menu-anchor" ref={showSessionMenuModal && menuSessionId === session.id ? sessionMenuRef : null}>
                          <button
                            type="button"
                            className="session-menu-button"
                            aria-label={`Open options for ${session.title}`}
                            title="Session options"
                            onClick={() => {
                              if (showSessionMenuModal && menuSessionId === session.id) {
                                setShowSessionMenuModal(false);
                                return;
                              }
                              setMenuSessionId(session.id);
                              setShowSessionMenuModal(true);
                            }}
                          >
                            ⋯
                          </button>
                          <Popover open={showSessionMenuModal && menuSessionId === session.id}>
                            <button type="button" onClick={() => startRenamingSession(session)}>Rename</button>
                            <button type="button" onClick={() => openSessionSettings(session)}>Edit settings</button>
                            <button type="button" onClick={() => {
                              setSelectedSessionId(session.id);
                              setShowLinkDatasetModal(true);
                              setShowSessionMenuModal(false);
                            }}>Link datasets</button>
                            <button type="button" onClick={() => {
                              setSelectedSessionId(session.id);
                              exportTranscript('markdown');
                              setShowSessionMenuModal(false);
                            }}>Export .md</button>
                            <button type="button" onClick={() => {
                              setSelectedSessionId(session.id);
                              exportTranscript('txt');
                              setShowSessionMenuModal(false);
                            }}>Export .txt</button>
                            <button type="button" className="danger-button" onClick={() => requestDeleteSession(session)}>Delete session</button>
                          </Popover>
                        </div>
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
  ), [groupedSessions, selectedSessionId, sessions.length, renamingSessionId, renamingTitle, showSessionMenuModal, menuSessionId]);

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
      const search = new URLSearchParams(window.location.search);
      const requestedSessionId = search.get('session_id') || '';
      const requestedDatasetId = search.get('dataset_id') || '';
      const requestedProviderId = search.get('provider_id') || '';
      const requestedModel = search.get('model') || '';
      const hasLaunchContext = Boolean(requestedDatasetId || requestedProviderId || requestedModel);
      const preferred = preferredSessionId || requestedSessionId || current;
      if (preferred && sessionData.some((session) => session.id === preferred)) return preferred;
      if (!requestedSessionId && hasLaunchContext) return '';
      return sessionData[0]?.id || '';
    });
    setNewProviderId((current) => {
      const search = new URLSearchParams(window.location.search);
      const requestedProviderId = search.get('provider_id') || '';
      if (requestedProviderId && providerData.some((provider) => provider.id === requestedProviderId)) return requestedProviderId;
      return current || providerData[0]?.id || '';
    });
    setNewModelName((current) => {
      const search = new URLSearchParams(window.location.search);
      return search.get('model') || current;
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

  useEffect(() => { void loadProvidersAndSessions(); }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const datasetId = params.get('dataset_id') || '';
    if (datasetId) {
      setNewLinkedDatasetIds([datasetId]);
      setHeaderLinkedDatasetIds([datasetId]);
      setShowLinkDatasetModal(false);
    }
  }, []);

  useEffect(() => { void loadMessages(selectedSessionId); }, [selectedSessionId]);

  useEffect(() => {
    setDraftTitle(selectedSession?.title ?? '');
    setDraftProviderId(selectedSession?.provider_id ?? '');
    setDraftModelName(selectedSession?.model_name ?? '');
    setDraftSystemPrompt(selectedSession?.system_prompt ?? '');
    setHeaderLinkedDatasetIds(linkedDatasetIds(selectedSession?.metadata));
  }, [selectedSession]);

  useEffect(() => {
    if (!selectedSessionId) return;
    if (sessions.some((session) => session.id === selectedSessionId)) return;
    setSelectedSessionId('');
    setShowSessionSettings(false);
    setShowSessionMenuModal(false);
    setMenuSessionId('');
    setPendingDeleteSessionId('');
    setMessages([]);
    setStreamingReply('');
    setLastContextInfo(null);
  }, [sessions, selectedSessionId]);

  useEffect(() => { if (newProviderId) void ensureProviderModels(newProviderId); }, [newProviderId]);
  useEffect(() => { if (draftProviderId) void ensureProviderModels(draftProviderId); }, [draftProviderId]);
  useEffect(() => { if (transcriptRef.current) transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight; }, [messages, streamingReply]);
  useEffect(() => { if (selectedSessionId && !sending) window.setTimeout(() => composerRef.current?.focus(), 0); }, [selectedSessionId, sending]);

  useEffect(() => {
    if (!showSessionMenuModal) return;
    const onPointerDown = (event: MouseEvent) => {
      if (sessionMenuRef.current && !sessionMenuRef.current.contains(event.target as Node)) {
        setShowSessionMenuModal(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [showSessionMenuModal]);

  useEffect(() => {
    if (!showSessionSettings) return;
    window.setTimeout(() => sessionSettingsTitleRef.current?.focus(), 0);
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setShowSessionSettings(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [showSessionSettings]);

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

  async function onCreateDatasetLinkedChat(datasetId: string) {
    setError('');
    setNewLinkedDatasetIds(datasetId ? [datasetId] : []);
    try {
      const created = await api<ChatSession>('/api/chat/sessions', {
        method: 'POST',
        body: JSON.stringify({
          provider_id: newProviderId || '',
          model_name: newModelName || undefined,
          system_prompt: newSystemPrompt || undefined,
          metadata: buildMetadata(datasetId ? [datasetId] : []),
        }),
      });
      await loadProvidersAndSessions(created.id);
      window.setTimeout(() => composerRef.current?.focus(), 0);
    } catch (err) {
      setError(formatChatError(err));
    }
  }

  async function onSaveSession(): Promise<boolean> {
    if (!selectedSession) return false;
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
      return true;
    } catch (err) {
      setError(formatChatError(err));
      return false;
    }
  }

  function openSessionSettings(sessionOverride?: ChatSession | null) {
    const targetSession = sessionOverride ?? selectedSession;
    if (!targetSession) return;
    setSelectedSessionId(targetSession.id);
    setShowSessionMenuModal(false);
    setShowSessionSettings(true);
  }

  function startRenamingSession(session: ChatSession) {
    setRenamingSessionId(session.id);
    setRenamingTitle(session.message_count === 0 && isAutoTitle(session) ? '' : session.title);
    setMenuSessionId(session.id);
    setSelectedSessionId(session.id);
    setShowSessionMenuModal(false);
  }

  function cancelRenamingSession() {
    setRenamingSessionId('');
    setRenamingTitle('');
  }

  async function submitRenamingSession(session: ChatSession) {
    const nextTitle = renamingTitle.trim();
    if (!nextTitle) {
      cancelRenamingSession();
      return;
    }
    setError('');
    try {
      const updated = await api<ChatSession>(`/api/chat/sessions/${session.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: nextTitle }),
      });
      cancelRenamingSession();
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

  function requestDeleteSession(sessionOverride?: ChatSession | null) {
    const targetSession = sessionOverride ?? selectedSession;
    if (!targetSession) return;
    setPendingDeleteSessionId(targetSession.id);
    setShowSessionMenuModal(false);
  }

  function cancelDeleteSession() {
    setPendingDeleteSessionId('');
  }

  async function onDeleteSession(sessionOverride?: ChatSession | null) {
    const targetSession = sessionOverride ?? selectedSession;
    if (!targetSession) return;
    setError('');
    try {
      await api(`/api/chat/sessions/${targetSession.id}`, { method: 'DELETE' });
      setMessages([]);
      setStreamingReply('');
      setShowSessionMenuModal(false);
      setMenuSessionId('');
      setPendingDeleteSessionId('');
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
    setLastSendMode('send');
    setMessages((current) => [...current, optimisticMessage]);
    setSending(true);
    setError('');
    setStreamingReply('');
    setStreamStatus('idle');
    setStreamStatusText('');
    try {
      if (streamEnabled) {
        await streamSend(selectedSessionId, { content, regenerate: false });
      } else {
        const result = await api<ChatCompleteResponse>(`/api/chat/sessions/${selectedSessionId}/complete`, { method: 'POST', body: JSON.stringify({ content, regenerate: false }) });
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

  async function streamSend(sessionId: string, request: { content?: string; regenerate?: boolean }) {
    const abortController = new AbortController();
    activeStreamAbortRef.current = abortController;
    setStreamStatus('connecting');
    setStreamStatusText('Connecting to provider…');
    let latestContent = '';
    try {
      const response = await fetch(`/api/chat/sessions/${sessionId}/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
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

  async function regenerateLastResponse() {
    if (!selectedSessionId || sending) return;
    setLastSendMode('regenerate');
    setSending(true);
    setError('');
    setStreamingReply('');
    setStreamStatus('idle');
    setStreamStatusText('');
    try {
      if (streamEnabled) {
        await streamSend(selectedSessionId, { regenerate: true });
      } else {
        const result = await api<ChatCompleteResponse>(`/api/chat/sessions/${selectedSessionId}/complete`, { method: 'POST', body: JSON.stringify({ regenerate: true }) });
        setLastContextInfo(result.provider_result.context_info ?? null);
        if (result.provider_result.status !== 'success') throw new Error(`Provider returned ${result.provider_result.status}: ${result.provider_result.summary}`);
      }
      await loadProvidersAndSessions(selectedSessionId);
      await loadMessages(selectedSessionId);
      setStreamingReply('');
      setStreamStatus('idle');
      setStreamStatusText('');
      window.setTimeout(() => composerRef.current?.focus(), 0);
    } catch (err) {
      setError(formatChatError(err));
      await loadMessages(selectedSessionId);
      if (streamEnabled && streamingReply.trim()) {
        setStreamStatus('error');
        setStreamStatusText('Stream interrupted — partial regenerated response shown below.');
      } else {
        setStreamingReply('');
        setStreamStatus('idle');
        setStreamStatusText('');
      }
    } finally {
      setSending(false);
    }
  }

  async function retryLastSend() {
    if (!selectedSessionId || sending) return;
    if (lastSendMode === 'regenerate') {
      await regenerateLastResponse();
      return;
    }
    if (!lastSubmittedText.trim()) return;
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
        await streamSend(selectedSessionId, { content: lastSubmittedText, regenerate: false });
      } else {
        const result = await api<ChatCompleteResponse>(`/api/chat/sessions/${selectedSessionId}/complete`, { method: 'POST', body: JSON.stringify({ content: lastSubmittedText, regenerate: false }) });
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
              <h2>{displaySessionTitle(selectedSession)}</h2>
              <div className="muted">Use Chat for dataset-linked exploration first. Link datasets, ask questions, then branch into workbench or workflows when the process becomes more structured.</div>
              {selectedSession ? (
                <div className="muted" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <span><strong>Provider:</strong> {providers.find((provider) => provider.id === selectedSession.provider_id)?.name ?? selectedSession.provider_id}</span>
                  <span>·</span>
                  <span><strong>Model:</strong> {selectedSession.model_name ?? 'default model'}</span>
                </div>
              ) : <div className="muted">Create or select a session</div>}
              {lastContextInfo ? (
                <div className="muted">
                  Context usage: ~{lastContextInfo.estimated_input_tokens ?? '—'} input tokens
                  {lastContextInfo.context_window ? ` / ${lastContextInfo.context_window}` : ''}
                  {lastContextInfo.max_output_tokens ? ` · reserved out ${lastContextInfo.max_output_tokens}` : ''}
                  {lastContextInfo.trimmed ? ' · older history trimmed' : ' · full history kept'}
                  {lastContextInfo.grounded ? ` · ${formatLinkedDatasetsLabel(lastContextInfo.grounding_dataset_names ?? [])}` : ''}
                </div>
              ) : null}
            </div>
            <div className="row wrap">
              <button type="button" onClick={() => setShowLinkDatasetModal(true)} disabled={!selectedSession}>Link Dataset</button>
              <button type="button" onClick={() => openSessionSettings()} disabled={!selectedSession}>Settings</button>
              <button type="button" onClick={() => void regenerateLastResponse()} disabled={!selectedSession || sending}>Regenerate</button>
              <button type="button" onClick={() => exportTranscript('markdown')} disabled={!selectedSession}>Export .md</button>
              <button type="button" onClick={() => exportTranscript('txt')} disabled={!selectedSession}>Export .txt</button>
              <button type="button" onClick={() => requestDeleteSession()} disabled={!selectedSession} className="danger-button">Delete</button>
            </div>
          </div>

          <div className="stack compact-stack">
            <div className="row wrap between">
              <div className="row wrap" style={{ gap: 8, alignItems: 'center' }}>
                <strong>Linked Datasets:</strong>
                <span className="muted">
                  {linkedDatasets.length > 0 ? linkedDatasets.map((dataset) => dataset.name).join(', ') : 'No linked datasets'}
                </span>
              </div>
              {selectedSession ? <button type="button" onClick={() => setShowLinkDatasetModal(true)}>{linkedDatasets.length > 0 ? 'Change Datasets' : 'Link Dataset'}</button> : null}
            </div>
            {linkedDatasets.length > 0 ? <div className="muted">These datasets are included in the chat context for new responses.</div> : null}
          </div>

          <Modal
            open={Boolean(selectedSession && showSessionSettings)}
            onClose={() => setShowSessionSettings(false)}
            title="Chat settings"
            footer={
              <div className="row wrap" style={{ justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowSessionSettings(false)}>Cancel</button>
                <button type="button" onClick={async () => { const ok = await onSaveSession(); if (ok) setShowSessionSettings(false); }}>Save changes</button>
              </div>
            }
          >
            <div className="chat-header-grid">
              <input ref={sessionSettingsTitleRef} value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} placeholder="Session title" />
              <select value={draftProviderId} onChange={(event) => setDraftProviderId(event.target.value)}>{providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}</select>
              <ModelPicker value={draftModelName} models={draftModels} onChange={setDraftModelName} selectId="draft-chat-model-select" inputId="draft-chat-model-input" inputPlaceholder="Custom model override" />
              {providerModels[draftProviderId]?.fetchedAt ? <div className="muted">Models fetched {new Date(providerModels[draftProviderId].fetchedAt).toLocaleTimeString()}</div> : null}
              {draftModelWarning ? <div className="muted">{draftModelWarning}</div> : null}
              <MultiLineTextField label="System prompt" value={draftSystemPrompt} onChange={setDraftSystemPrompt} lines={4} placeholder="System prompt" scrollable resizable={false} />
              <div className="muted">Configured model limits: context {effectiveModelSettings.contextWindow ?? 'not set'} · max output {effectiveModelSettings.maxOutputTokens ?? 'not set'}</div>
              <div className="row between wrap">
                <label className="checkbox-row"><input type="checkbox" checked={streamEnabled} onChange={(event) => setStreamEnabled(event.target.checked)} /><span>Stream responses</span></label>
              </div>
            </div>
          </Modal>
        </div>

        <div className="chat-transcript" ref={transcriptRef}>
          {!selectedSession ? (
            <div className="card stack">
              <div>
                <h3>Start a chat</h3>
                <p className="muted">Chat is the main surface in BRIDGE. Start blank, start with a dataset, or jump back into a recent conversation.</p>
              </div>
              {(requestedDataset || requestedProvider || requestedModelName) ? (
                <Alert>
                  <div>
                    {requestedDataset ? <>Ready to start from dataset <strong>{requestedDataset.name}</strong>.</> : <>Ready to start a new chat from the selected context.</>}
                  </div>
                  <div className="muted" style={{ marginTop: '0.75rem' }}>
                    {[requestedDataset ? `Dataset: ${requestedDataset.name}` : null, requestedProvider ? `Provider: ${requestedProvider.name}` : null, requestedModelName ? `Model: ${requestedModelName}` : null].filter(Boolean).join(' · ')}
                  </div>
                  <div className="row wrap" style={{ marginTop: '0.75rem' }}>
                    <button type="button" onClick={() => void onCreateDatasetLinkedChat(requestedDataset?.id || '')}>Start chat with this context</button>
                    <a className="button-link" href="/datasets">Browse all datasets</a>
                  </div>
                </Alert>
              ) : null}
              <div className="row wrap">
                <button type="button" onClick={() => void onCreateSession()} disabled={!newProviderId}>Start blank chat</button>
                {(requestedDataset || requestedProvider || requestedModelName)
                  ? <button type="button" onClick={() => void onCreateDatasetLinkedChat(requestedDataset?.id || '')} disabled={!newProviderId}>Start with current selection</button>
                  : (datasets[0] ? <button type="button" onClick={() => void onCreateDatasetLinkedChat(datasets[0].id)} disabled={!newProviderId}>Start with a dataset</button> : null)}
                <a className="button-link" href="/datasets">Choose a dataset first</a>
              </div>
              {sessions.length > 0 ? (
                <div className="stack">
                  <div className="muted">Recent chats</div>
                  <div className="row wrap">
                    {sessions.slice(0, 4).map((session) => (
                      <button key={session.id} type="button" onClick={() => setSelectedSessionId(session.id)}>{session.title}</button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
          {lastContextInfo ? (
            <div className={lastContextInfo.trimmed ? 'chat-context-banner warning' : 'chat-context-banner'}>
              <strong>Context budget</strong>
              <span>
                ~{lastContextInfo.estimated_input_tokens ?? '—'} input tokens
                {lastContextInfo.context_window ? ` / ${lastContextInfo.context_window}` : ''}
                {lastContextInfo.max_output_tokens ? ` · reserved out ${lastContextInfo.max_output_tokens}` : ''}
                {typeof lastContextInfo.messages_included === 'number' && typeof lastContextInfo.messages_total === 'number' ? ` · included ${lastContextInfo.messages_included}/${lastContextInfo.messages_total} messages` : ''}
                {lastContextInfo.grounded ? ` · ${formatLinkedDatasetsLabel(lastContextInfo.grounding_dataset_names ?? [])}` : ''}
              </span>
            </div>
          ) : null}
          {selectedSession && messages.length === 0 ? <p className="muted">No messages yet. Ask a question, or link a dataset to give the chat more context.</p> : null}
          {messages.map((message) => {
            const interrupted = message.role === 'assistant' && message.metadata?.stream_interrupted;
            const regenerated = message.role === 'assistant' && message.metadata?.regenerated;
            const groundedIds = Array.isArray(message.metadata?.grounding_dataset_ids)
              ? (message.metadata?.grounding_dataset_ids as string[])
              : [];
            const groundedNames = Array.isArray(message.metadata?.grounding_dataset_names)
              ? (message.metadata?.grounding_dataset_names as string[])
              : [];
            return (
              <div key={message.id} className={message.role === 'assistant' ? 'message assistant' : message.role === 'system' ? 'message system' : 'message user'}>
                <div className="message-role">{message.role}</div>
                {(interrupted || regenerated || groundedIds.length > 0) ? (
                  <div className="row wrap" style={{ gap: 8 }}>
                    {interrupted ? <StatusChip text="Interrupted" tone="warning" chipStyle="rounded" backgroundEffect="glow" haloBoost={1.2} /> : null}
                    {regenerated ? <StatusChip text="Regenerated" tone="selected" chipStyle="rounded" backgroundEffect="glow" haloBoost={1.2} /> : null}
                    {groundedIds.length > 0 ? <StatusChip text={formatLinkedDatasetsLabel(groundedNames)} tone="hover" chipStyle="rounded" backgroundEffect="matte" /> : null}
                  </div>
                ) : null}
                <pre>{message.content}</pre>
              </div>
            );
          })}
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

        <form ref={composerFormRef} className="stack chat-composer" onSubmit={onSend}>
          {!selectedSessionHasProvider && selectedSession ? (
            <div className="notice error">
              <strong>Provider required.</strong> This chat was created without a provider. Open <strong>Settings</strong> and choose one before sending messages.
            </div>
          ) : null}
          <MultiLineTextField
            label="Message"
            textareaRef={composerRef}
            value={composerText}
            onChange={setComposerText}
            onKeyDown={onComposerKeyDown}
            name="content"
            placeholder={selectedSessionId ? (selectedSessionHasProvider ? 'Type your message…' : 'Choose a provider in Settings to enable chatting') : 'Create or select a chat first'}
            lines={5}
            scrollable
            resizable={false}
            disabled={!selectedSessionId || sending || !selectedSessionHasProvider}
          />
          {(streamEnabled && streamStatus !== 'idle' && streamStatusText) ? (
            <Alert variant={streamStatus === 'error' ? 'error' : 'info'}>{streamStatusText}</Alert>
          ) : null}
          <div className="row between wrap">
            {error ? <pre>{error}</pre> : <span className="muted">Linked datasets are included in this chat’s context.</span>}
            <div className="row wrap" style={{ gap: 8 }}>
              {sending && streamEnabled ? <StatusChip text="Cancel Stream" tone="warning" chipStyle="box" backgroundEffect="glow" haloBoost={1.15} clickable onClick={cancelStreaming} /> : null}
              <StatusChip text={submitLabel} tone="selected" chipStyle="box" backgroundEffect="glow" haloBoost={1.25} clickable={!!selectedSessionId && !sending && selectedSessionHasProvider} disabled={!selectedSessionId || sending || !selectedSessionHasProvider} onClick={() => composerFormRef.current?.requestSubmit()} />
            </div>
          </div>
        </form>
      </div>

      <Modal
        open={Boolean(pendingDeleteSession)}
        onClose={cancelDeleteSession}
        title="Delete chat session?"
        size="sm"
        footer={
          <div className="row wrap" style={{ justifyContent: 'flex-end' }}>
            <button type="button" onClick={cancelDeleteSession}>Cancel</button>
            <button type="button" className="danger-button" onClick={() => { if (pendingDeleteSession) void onDeleteSession(pendingDeleteSession); }}>Delete session</button>
          </div>
        }
      >
        <div className="muted">This will permanently delete <strong>{pendingDeleteSession ? displaySessionTitle(pendingDeleteSession) : 'this chat'}</strong> and its messages.</div>
      </Modal>

      <Modal
        open={showLinkDatasetModal}
        onClose={() => setShowLinkDatasetModal(false)}
        title="Link Dataset"
        footer={
          <div className="row between wrap">
            <button type="button" onClick={() => setHeaderLinkedDatasetIds([])}>Clear all</button>
            <button type="button" onClick={() => void onApplyLinkedDatasets()} disabled={!selectedSession}>Apply linked datasets</button>
          </div>
        }
      >
        <div className="muted">Choose one or more datasets to include in this chat session’s context.</div>
        <input value={datasetSearch} onChange={(event) => setDatasetSearch(event.target.value)} placeholder="Search datasets by name or ID" />
        <div className="row wrap" style={{ gap: 8 }}>
          <StatusChip text={`${filteredDatasets.length} shown`} tone="hover" chipStyle="rounded" backgroundEffect="matte" />
          <StatusChip text={`${headerLinkedDatasetIds.length} linked`} tone="selected" chipStyle="rounded" backgroundEffect="glow" haloBoost={1.2} />
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
      </Modal>
    </div>
  );
}
