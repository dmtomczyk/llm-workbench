import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';

import { Alert } from '../../design-system/components/Alert';
import { InstrumentTableRow, InstrumentDataTable } from '../../design-system/components/InstrumentDataTable';
import { Modal } from '../../design-system/components/Modal';
import { MultiLineTextField } from '../../design-system/components/MultiLineTextField';
import { api } from '../../lib/api';

type Dataset = {
  id: string;
  name: string;
  source_type?: string;
  source_ref?: string | null;
  media_type?: string | null;
  latest_version_no?: number;
  metadata?: Record<string, unknown>;
  latest_version?: {
    id: string;
    row_count?: number | null;
    storage_path?: string | null;
    normalized_payload_path?: string | null;
    metadata?: Record<string, unknown>;
    created_at?: string;
  };
  created_at?: string;
  updated_at?: string;
};

type DatasetPreview = {
  dataset_id: string;
  version_id: string;
  preview?: Record<string, unknown>;
  normalized_payload?: { type?: string; items?: unknown[]; metadata?: Record<string, unknown> };
};

type ImportRun = {
  id: string;
  dataset_id?: string | null;
  status: string;
  original_filename?: string | null;
};

type Provider = {
  id: string;
  name: string;
  kind: string;
  default_model?: string;
};

type ChatSession = {
  id: string;
  title: string;
  provider_id: string;
  model_name?: string;
  metadata?: Record<string, unknown>;
};

type ChatMessage = {
  id: string;
  session_id: string;
  role: string;
  content: string;
  created_at: string;
};

type ChatCompleteResponse = {
  ok: boolean;
  run_id: string;
  provider_result: {
    status: string;
    summary: string;
  };
};

type StreamStatus = 'idle' | 'connecting' | 'streaming' | 'finalizing' | 'cancelled' | 'error';

type StreamEvent = {
  content?: string;
  message?: string;
  statusCode?: number;
};

function prettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function isRecordArray(value: unknown): value is Record<string, unknown>[] {
  return Array.isArray(value) && value.every((item) => item && typeof item === 'object' && !Array.isArray(item));
}

function renderRecordTable(items: Record<string, unknown>[]) {
  const columns = Array.from(new Set(items.flatMap((item) => Object.keys(item))));
  return (
    <div className="table-wrap">
      <table className="table compact-table">
        <thead>
          <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index}>{columns.map((column) => <td key={column}>{String(item[column] ?? '')}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatDatasetTimestamp(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

const SUPPORTED_UPLOAD_LABEL = 'Supported now: .csv, .json, .txt, .md, .eml. Allowed but optional-parser-dependent: .xlsx, .docx, .pdf, .msg.';

export function DatasetsPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState('');
  const [preview, setPreview] = useState<DatasetPreview | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [error, setError] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [sourceDatasetId, setSourceDatasetId] = useState('');
  const [quickChatDatasetId, setQuickChatDatasetId] = useState('');
  const [quickChatSessionIds, setQuickChatSessionIds] = useState<Record<string, string>>({});
  const [quickChatMessages, setQuickChatMessages] = useState<ChatMessage[]>([]);
  const [quickChatText, setQuickChatText] = useState('');
  const [quickChatLoading, setQuickChatLoading] = useState(false);
  const [quickChatSending, setQuickChatSending] = useState(false);
  const [quickChatStreamingReply, setQuickChatStreamingReply] = useState('');
  const [quickChatStreamStatus, setQuickChatStreamStatus] = useState<StreamStatus>('idle');
  const [quickChatStreamStatusText, setQuickChatStreamStatusText] = useState('');
  const [quickChatError, setQuickChatError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadDatasetName, setUploadDatasetName] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const quickChatFormRef = useRef<HTMLFormElement | null>(null);
  const quickChatTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const quickChatTranscriptRef = useRef<HTMLDivElement | null>(null);
  const quickChatAbortRef = useRef<AbortController | null>(null);

  const selectedDataset = useMemo(() => datasets.find((dataset) => dataset.id === selectedDatasetId) ?? null, [datasets, selectedDatasetId]);
  const sourceDataset = useMemo(() => datasets.find((dataset) => dataset.id === sourceDatasetId) ?? null, [datasets, sourceDatasetId]);
  const quickChatDataset = useMemo(() => datasets.find((dataset) => dataset.id === quickChatDatasetId) ?? null, [datasets, quickChatDatasetId]);
  const quickChatProvider = useMemo(() => providers[0] ?? null, [providers]);
  const quickChatSessionId = quickChatDatasetId ? (quickChatSessionIds[quickChatDatasetId] ?? '') : '';
  const datasetRows = useMemo<InstrumentTableRow[]>(() => datasets.map((dataset) => ({
    id: dataset.id,
    icon: '◫',
    name: dataset.name,
    category: [dataset.source_type ?? 'unknown source', dataset.media_type ?? '—'].join(' · '),
    status: {
      tone: (dataset.latest_version?.row_count ?? 0) > 0 ? 'green' : 'amber',
      label: (dataset.latest_version?.row_count ?? 0) > 0 ? 'Ready' : 'Sparse',
    },
    date: formatDatasetTimestamp(dataset.updated_at ?? dataset.created_at),
    actions: [
      Math.max(18, Math.min(64, String(dataset.latest_version?.row_count ?? 0).length * 10)),
      Math.max(16, Math.min(42, (dataset.latest_version_no ?? 0) * 8)),
      dataset.source_ref ? 28 : 16,
    ],
    actionContent: (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flexWrap: 'wrap', fontSize: 12.5 }}>
        <button
          type="button"
          onClick={(event) => { event.stopPropagation(); setSelectedDatasetId(dataset.id); setQuickChatDatasetId(dataset.id); setQuickChatText(''); setQuickChatError(''); setQuickChatStreamingReply(''); setQuickChatStreamStatus('idle'); setQuickChatStreamStatusText(''); }}
          style={{ minHeight: 24, padding: '0 8px', borderRadius: 0, border: '1px solid rgba(156,198,216,0.16)', background: 'rgba(24,35,43,0.18)', color: '#c7d7df', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)', transition: 'border-color 140ms ease, background 140ms ease, color 140ms ease, box-shadow 140ms ease' }}
          onMouseEnter={(event) => {
            event.currentTarget.style.borderColor = 'rgba(156,198,216,0.32)';
            event.currentTarget.style.background = 'rgba(37,58,71,0.42)';
            event.currentTarget.style.color = '#e4f0f6';
            event.currentTarget.style.boxShadow = '0 0 0 1px rgba(156,198,216,0.06), inset 0 1px 0 rgba(255,255,255,0.04)';
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.borderColor = 'rgba(156,198,216,0.16)';
            event.currentTarget.style.background = 'rgba(24,35,43,0.18)';
            event.currentTarget.style.color = '#c7d7df';
            event.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.03)';
          }}
          onFocus={(event) => {
            event.currentTarget.style.borderColor = 'rgba(190,228,244,0.46)';
            event.currentTarget.style.background = 'rgba(37,58,71,0.44)';
            event.currentTarget.style.color = '#eef7fd';
            event.currentTarget.style.boxShadow = '0 0 0 1px rgba(156,198,216,0.1), 0 0 10px rgba(116,216,241,0.08)';
          }}
          onBlur={(event) => {
            event.currentTarget.style.borderColor = 'rgba(156,198,216,0.16)';
            event.currentTarget.style.background = 'rgba(24,35,43,0.18)';
            event.currentTarget.style.color = '#c7d7df';
            event.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.03)';
          }}
        >
          Quick Chat
        </button>
        <button
          type="button"
          onClick={(event) => { event.stopPropagation(); setSelectedDatasetId(dataset.id); setSourceDatasetId(dataset.id); }}
          style={{ minHeight: 24, padding: '0 8px', borderRadius: 0, border: '1px solid rgba(156,198,216,0.16)', background: 'rgba(24,35,43,0.18)', color: '#c7d7df', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)', transition: 'border-color 140ms ease, background 140ms ease, color 140ms ease, box-shadow 140ms ease' }}
          onMouseEnter={(event) => {
            event.currentTarget.style.borderColor = 'rgba(156,198,216,0.32)';
            event.currentTarget.style.background = 'rgba(37,58,71,0.42)';
            event.currentTarget.style.color = '#e4f0f6';
            event.currentTarget.style.boxShadow = '0 0 0 1px rgba(156,198,216,0.06), inset 0 1px 0 rgba(255,255,255,0.04)';
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.borderColor = 'rgba(156,198,216,0.16)';
            event.currentTarget.style.background = 'rgba(24,35,43,0.18)';
            event.currentTarget.style.color = '#c7d7df';
            event.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.03)';
          }}
          onFocus={(event) => {
            event.currentTarget.style.borderColor = 'rgba(190,228,244,0.46)';
            event.currentTarget.style.background = 'rgba(37,58,71,0.44)';
            event.currentTarget.style.color = '#eef7fd';
            event.currentTarget.style.boxShadow = '0 0 0 1px rgba(156,198,216,0.1), 0 0 10px rgba(116,216,241,0.08)';
          }}
          onBlur={(event) => {
            event.currentTarget.style.borderColor = 'rgba(156,198,216,0.16)';
            event.currentTarget.style.background = 'rgba(24,35,43,0.18)';
            event.currentTarget.style.color = '#c7d7df';
            event.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.03)';
          }}
        >
          Source
        </button>
        <span aria-hidden="true" style={{ width: 1, height: 16, background: 'rgba(156,198,216,0.18)', margin: '0 2px' }} />
        <a className="button-link" style={{ padding: 0, minHeight: 'auto', background: 'transparent', border: 0, color: '#a7bfcd', textDecoration: 'none', transition: 'color 140ms ease, text-shadow 140ms ease' }} href={`/chat?dataset_id=${encodeURIComponent(dataset.id)}`} onClick={(event) => event.stopPropagation()} onMouseEnter={(event) => { event.currentTarget.style.color = '#dce8ef'; event.currentTarget.style.textShadow = '0 0 8px rgba(116,216,241,0.1)'; }} onMouseLeave={(event) => { event.currentTarget.style.color = '#a7bfcd'; event.currentTarget.style.textShadow = 'none'; }} onFocus={(event) => { event.currentTarget.style.color = '#eef7fd'; event.currentTarget.style.textShadow = '0 0 10px rgba(116,216,241,0.14)'; }} onBlur={(event) => { event.currentTarget.style.color = '#a7bfcd'; event.currentTarget.style.textShadow = 'none'; }}>Chat ↗</a>
        <a className="button-link" style={{ padding: 0, minHeight: 'auto', background: 'transparent', border: 0, color: '#a7bfcd', textDecoration: 'none', transition: 'color 140ms ease, text-shadow 140ms ease' }} href={`/workflows?dataset_id=${encodeURIComponent(dataset.id)}`} onClick={(event) => event.stopPropagation()} onMouseEnter={(event) => { event.currentTarget.style.color = '#dce8ef'; event.currentTarget.style.textShadow = '0 0 8px rgba(116,216,241,0.1)'; }} onMouseLeave={(event) => { event.currentTarget.style.color = '#a7bfcd'; event.currentTarget.style.textShadow = 'none'; }} onFocus={(event) => { event.currentTarget.style.color = '#eef7fd'; event.currentTarget.style.textShadow = '0 0 10px rgba(116,216,241,0.14)'; }} onBlur={(event) => { event.currentTarget.style.color = '#a7bfcd'; event.currentTarget.style.textShadow = 'none'; }}>Workflow ↗</a>
        <a className="button-link" style={{ padding: 0, minHeight: 'auto', background: 'transparent', border: 0, color: '#a7bfcd', textDecoration: 'none', transition: 'color 140ms ease, text-shadow 140ms ease' }} href={`/workbench?dataset_id=${encodeURIComponent(dataset.id)}`} onClick={(event) => event.stopPropagation()} onMouseEnter={(event) => { event.currentTarget.style.color = '#dce8ef'; event.currentTarget.style.textShadow = '0 0 8px rgba(116,216,241,0.1)'; }} onMouseLeave={(event) => { event.currentTarget.style.color = '#a7bfcd'; event.currentTarget.style.textShadow = 'none'; }} onFocus={(event) => { event.currentTarget.style.color = '#eef7fd'; event.currentTarget.style.textShadow = '0 0 10px rgba(116,216,241,0.14)'; }} onBlur={(event) => { event.currentTarget.style.color = '#a7bfcd'; event.currentTarget.style.textShadow = 'none'; }}>Workbench ↗</a>
      </div>
    ),
  })), [datasets]);

  async function loadDatasets() {
    const data = await api<Dataset[]>('/api/datasets').catch(() => []);
    setDatasets(data);
    setSelectedDatasetId((current) => current || data[0]?.id || '');
  }

  async function loadProviders() {
    const data = await api<Provider[]>('/api/providers').catch(() => []);
    setProviders(data);
  }

  async function loadPreview(datasetId: string) {
    if (!datasetId) {
      setPreview(null);
      return;
    }
    const data = await api<DatasetPreview>(`/api/datasets/${datasetId}/preview`).catch(() => null);
    setPreview(data);
  }

  async function onUploadFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError('Choose a file to upload.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      if (uploadDatasetName.trim()) formData.set('dataset_name', uploadDatasetName.trim());
      formData.set('file', file);
      const response = await fetch('/api/imports/files', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(await response.text() || 'Upload failed');
      }
      const result = await response.json() as ImportRun;
      await loadDatasets();
      if (result.dataset_id) {
        setSelectedDatasetId(result.dataset_id);
        await loadPreview(result.dataset_id);
      }
      setUploadDatasetName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setShowUploadModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function loadQuickChatMessages(sessionId: string) {
    const data = await api<ChatMessage[]>(`/api/chat/sessions/${sessionId}/messages`).catch(() => []);
    setQuickChatMessages(data);
  }

  async function ensureQuickChatSession(datasetId: string) {
    if (!datasetId) return;
    if (!quickChatProvider) {
      setQuickChatError('No provider is configured yet. Add a provider before using Quick Chat.');
      return;
    }
    const existingSessionId = quickChatSessionIds[datasetId];
    if (existingSessionId) {
      setQuickChatLoading(true);
      setQuickChatError('');
      try {
        await loadQuickChatMessages(existingSessionId);
        window.setTimeout(() => quickChatTextareaRef.current?.focus(), 0);
      } catch (err) {
        setQuickChatError(err instanceof Error ? err.message : 'Failed to load quick chat.');
      } finally {
        setQuickChatLoading(false);
      }
      return;
    }
    setQuickChatLoading(true);
    setQuickChatError('');
    try {
      const created = await api<ChatSession>('/api/chat/sessions', {
        method: 'POST',
        body: JSON.stringify({
          provider_id: quickChatProvider.id,
          model_name: quickChatProvider.default_model || undefined,
          metadata: { grounding: { dataset_ids: [datasetId] } },
        }),
      });
      setQuickChatSessionIds((current) => ({ ...current, [datasetId]: created.id }));
      await loadQuickChatMessages(created.id);
      window.setTimeout(() => quickChatTextareaRef.current?.focus(), 0);
    } catch (err) {
      setQuickChatError(err instanceof Error ? err.message : 'Failed to start quick chat.');
    } finally {
      setQuickChatLoading(false);
    }
  }

  async function streamQuickChatSend(sessionId: string, content: string) {
    const abortController = new AbortController();
    quickChatAbortRef.current = abortController;
    setQuickChatStreamStatus('connecting');
    setQuickChatStreamStatusText('Connecting to provider…');
    let latestContent = '';
    let sawDone = false;
    try {
      const response = await fetch(`/api/chat/sessions/${sessionId}/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, regenerate: false }),
        signal: abortController.signal,
      });
      if (!response.ok || !response.body) throw new Error(await response.text() || 'Streaming request failed');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
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
          if (eventName === 'metadata') {
            setQuickChatStreamStatus('connecting');
            setQuickChatStreamStatusText('Connected — waiting for first tokens…');
            continue;
          }
          if (eventName === 'chunk') {
            latestContent = data.content || latestContent;
            setQuickChatStreamStatus('streaming');
            setQuickChatStreamStatusText('Streaming response…');
            setQuickChatStreamingReply(latestContent);
            continue;
          }
          if (eventName === 'done') {
            sawDone = true;
            setQuickChatStreamStatus('finalizing');
            setQuickChatStreamStatusText('Finalizing message…');
            continue;
          }
          if (eventName === 'error') {
            const hasPartial = Boolean((data.content || latestContent).trim());
            setQuickChatStreamStatus('error');
            setQuickChatStreamStatusText(hasPartial ? 'Stream interrupted — partial response shown below.' : 'Stream failed before any response was received.');
            throw new Error(data.message || 'Streaming request failed');
          }
        }
        if (done) break;
      }
      if (!sawDone) {
        const hasPartial = Boolean(latestContent.trim());
        setQuickChatStreamStatus(hasPartial ? 'error' : 'idle');
        setQuickChatStreamStatusText(hasPartial ? 'Connection closed before the response finished.' : 'Stream ended unexpectedly before any response was received.');
        throw new Error(hasPartial ? 'Stream ended before final confirmation was received.' : 'Stream ended unexpectedly before any response was received.');
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        const hasPartial = Boolean(latestContent.trim());
        setQuickChatStreamStatus(hasPartial ? 'cancelled' : 'idle');
        setQuickChatStreamStatusText(hasPartial ? 'Streaming cancelled — partial response shown below.' : 'Streaming cancelled.');
        return;
      }
      throw err;
    } finally {
      quickChatAbortRef.current = null;
    }
  }

  async function onSendQuickChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!quickChatSessionId) return;
    const content = quickChatText.trim();
    if (!content) return;
    const optimisticMessage: ChatMessage = {
      id: `quick-user-${Date.now()}`,
      session_id: quickChatSessionId,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };
    setQuickChatMessages((current) => [...current, optimisticMessage]);
    setQuickChatSending(true);
    setQuickChatError('');
    setQuickChatStreamingReply('');
    setQuickChatStreamStatus('idle');
    setQuickChatStreamStatusText('');
    try {
      await streamQuickChatSend(quickChatSessionId, content);
      await loadQuickChatMessages(quickChatSessionId);
      setQuickChatText('');
      setQuickChatStreamingReply('');
      setQuickChatStreamStatus('idle');
      setQuickChatStreamStatusText('');
      window.setTimeout(() => quickChatTextareaRef.current?.focus(), 0);
    } catch (err) {
      setQuickChatError(err instanceof Error ? err.message : 'Quick chat failed.');
      await loadQuickChatMessages(quickChatSessionId);
    } finally {
      setQuickChatSending(false);
      window.setTimeout(() => quickChatTextareaRef.current?.focus(), 0);
    }
  }

  useEffect(() => {
    void loadDatasets();
    void loadProviders();
  }, []);

  useEffect(() => {
    void loadPreview(selectedDatasetId);
  }, [selectedDatasetId]);

  useEffect(() => {
    if (quickChatDatasetId) {
      void ensureQuickChatSession(quickChatDatasetId);
    }
  }, [quickChatDatasetId, quickChatProvider]);

  useEffect(() => {
    if (!quickChatTranscriptRef.current) return;
    quickChatTranscriptRef.current.scrollTop = quickChatTranscriptRef.current.scrollHeight;
  }, [quickChatMessages, quickChatStreamingReply, quickChatDatasetId, quickChatLoading]);

  function onQuickChatComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter') return;
    if (event.shiftKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    quickChatFormRef.current?.requestSubmit();
  }

  const sampleItems = preview?.preview?.sample_items;

  return (
    <div className="stack">
      <Modal
        open={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Upload file"
        size="sm"
        footer={
          <div className="row wrap" style={{ justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setShowUploadModal(false)}>Cancel</button>
            <button type="submit" form="dataset-upload-form" disabled={uploading}>{uploading ? 'Uploading…' : 'Upload file'}</button>
          </div>
        }
      >
        <form id="dataset-upload-form" className="stack" onSubmit={onUploadFile}>
          <input value={uploadDatasetName} onChange={(event) => setUploadDatasetName(event.target.value)} placeholder="Optional dataset name" />
          <input ref={fileInputRef} name="file" type="file" accept=".csv,.json,.txt,.md,.eml,.xlsx,.docx,.pdf,.msg" required />
          <div className="muted">This creates or imports a dataset directly from the uploaded file without requiring a saved recipe.</div>
          <Alert>{SUPPORTED_UPLOAD_LABEL}</Alert>
        </form>
      </Modal>

      <Modal
        open={!!sourceDataset}
        onClose={() => setSourceDatasetId('')}
        title={sourceDataset ? `Source / provenance — ${sourceDataset.name}` : 'Source / provenance'}
        size="md"
        footer={
          <div className="row wrap" style={{ justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setSourceDatasetId('')}>Close</button>
          </div>
        }
      >
        {!sourceDataset ? null : (
          <div className="stack">
            <div className="grid dataset-meta-grid">
              <div><strong>Source type</strong><div className="muted">{sourceDataset.source_type ?? 'unknown'}</div></div>
              <div><strong>Media type</strong><div className="muted">{sourceDataset.media_type ?? '—'}</div></div>
              <div><strong>Updated</strong><div className="muted">{formatDatasetTimestamp(sourceDataset.updated_at ?? sourceDataset.created_at)}</div></div>
              <div><strong>Version created</strong><div className="muted">{formatDatasetTimestamp(sourceDataset.latest_version?.created_at)}</div></div>
              <div><strong>Rows</strong><div className="muted">{sourceDataset.latest_version?.row_count ?? 'unknown'}</div></div>
              <div><strong>Source ref</strong><div className="muted">{sourceDataset.source_ref ?? '—'}</div></div>
            </div>
            <pre>{prettyJson({ source_type: sourceDataset.source_type, source_ref: sourceDataset.source_ref, media_type: sourceDataset.media_type, metadata: sourceDataset.metadata, latest_version: sourceDataset.latest_version })}</pre>
          </div>
        )}
      </Modal>

      <Modal
        open={!!quickChatDataset}
        onClose={() => {
          setQuickChatDatasetId('');
          setQuickChatMessages([]);
          setQuickChatText('');
          setQuickChatStreamingReply('');
          setQuickChatStreamStatus('idle');
          setQuickChatStreamStatusText('');
          setQuickChatError('');
        }}
        title={quickChatDataset ? `Quick Chat — ${quickChatDataset.name}` : 'Quick Chat'}
        size="lg"
        footer={
          <div className="row wrap" style={{ justifyContent: 'space-between', width: '100%' }}>
            <div className="muted">{quickChatProvider ? `Provider: ${quickChatProvider.name}` : 'No provider configured'}</div>
            {quickChatDataset ? <a className="button-link" href={quickChatSessionId ? `/chat?session_id=${encodeURIComponent(quickChatSessionId)}&dataset_id=${encodeURIComponent(quickChatDataset.id)}` : `/chat?dataset_id=${encodeURIComponent(quickChatDataset.id)}`}>Open full Chat</a> : null}
          </div>
        }
      >
        <div className="stack" style={{ minHeight: 520 }}>
          {quickChatError ? <Alert variant="error">{quickChatError}</Alert> : null}
          {(quickChatStreamStatus !== 'idle' && quickChatStreamStatusText) ? <Alert variant={quickChatStreamStatus === 'error' ? 'error' : 'info'}>{quickChatStreamStatusText}</Alert> : null}
          <div className="muted">Ask a few quick dataset-scoped questions here without leaving the Datastores page.</div>
          <div ref={quickChatTranscriptRef} className="card stack" style={{ minHeight: 280, maxHeight: 280, overflow: 'auto' }}>
            {quickChatLoading ? <div className="muted">Starting quick chat…</div> : quickChatMessages.length === 0 && !quickChatStreamingReply ? <div className="muted">No messages yet. Ask a first question about this dataset.</div> : null}
            {quickChatMessages.map((message) => (
              <div key={message.id} className={`message ${message.role === 'assistant' ? 'assistant' : 'user'}`}>
                <div className="message-meta">{message.role}</div>
                <pre>{message.content}</pre>
              </div>
            ))}
            {quickChatStreamingReply ? (
              <div className="message assistant streaming-message">
                <div className="message-meta">assistant · {quickChatStreamStatus === 'error' ? 'interrupted' : quickChatStreamStatus === 'cancelled' ? 'cancelled' : quickChatStreamStatus === 'finalizing' ? 'finalizing' : 'streaming'}</div>
                <pre>{quickChatStreamingReply}</pre>
              </div>
            ) : null}
          </div>
          <form ref={quickChatFormRef} className="stack" onSubmit={onSendQuickChat}>
            <MultiLineTextField
              label="Quick question"
              textareaRef={quickChatTextareaRef}
              value={quickChatText}
              onChange={setQuickChatText}
              onKeyDown={onQuickChatComposerKeyDown}
              placeholder={quickChatDataset ? `Ask about ${quickChatDataset.name}…` : 'Ask a quick question…'}
              lines={7}
              scrollable
              resizable
              disabled={!quickChatSessionId || quickChatSending || quickChatLoading || !quickChatProvider}
            />
            <div className="row wrap" style={{ justifyContent: 'flex-end', gap: 8 }}>
              {quickChatSending ? <button type="button" onClick={() => quickChatAbortRef.current?.abort()}>Cancel stream</button> : null}
              <button type="submit" disabled={!quickChatSessionId || quickChatSending || quickChatLoading || !quickChatProvider || !quickChatText.trim()}>{quickChatSending ? 'Sending…' : 'Send + stream'}</button>
            </div>
          </form>
        </div>
      </Modal>

      <div className="card stack">
        <div className="row between wrap">
          <div>
            <h2>Datasets</h2>
            <p className="muted">Datasets are the core handoff object in BRIDGE: inspect the data here, then launch into chat, workbench, workflows, imports, or automations.</p>
          </div>
          <div className="stack compact-stack" style={{ alignItems: 'flex-end' }}>
            <div className="row wrap">
              <button type="button" onClick={() => setShowUploadModal(true)}>Upload file</button>
              <a className="button-link" href="/recipes">Open imports</a>
            </div>
            <div className="muted" style={{ maxWidth: '28rem', textAlign: 'right' }}>{SUPPORTED_UPLOAD_LABEL}</div>
          </div>
        </div>
      </div>
      <div className="stack">
        {error ? <pre>{error}</pre> : null}
        {datasets.length === 0 ? (
          <div className="card">
            <div className="muted">No datasets yet.</div>
          </div>
        ) : (
          <InstrumentDataTable
            title="Available Datastores"
            rows={datasetRows}
            selectable={false}
            pageSize={25}
            defaultSortKey="date"
            defaultSortDir="desc"
            selectedRowId={selectedDatasetId}
            onRowClick={(row) => setSelectedDatasetId(row.id)}
            columnWidths={{
              name: 'minmax(0, 0.84fr)',
              category: 'minmax(0, 0.95fr)',
              status: '120px',
              date: '156px',
              actions: 'minmax(400px, 2.35fr)',
            }}
          />
        )}

        <div className="card stack">
          <div className="row between wrap">
            <div>
              <h2>Latest preview</h2>
              <div className="muted">Inspect the current version here before branching into chat, workbench, or workflows.</div>
            </div>
            {selectedDataset ? <div className="muted">Previewing: {selectedDataset.name}</div> : null}
          </div>
          {!selectedDataset ? <p className="muted">Select a datastore row to preview it.</p> : !preview ? <p className="muted">No preview available.</p> : isRecordArray(sampleItems) ? renderRecordTable(sampleItems) : <pre>{prettyJson(preview.preview ?? preview.normalized_payload ?? {})}</pre>}
        </div>
      </div>
    </div>
  );
}
