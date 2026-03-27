import { FormEvent, useEffect, useMemo, useState } from 'react';

import { api } from '../../lib/api';

type Dataset = {
  id: string;
  name: string;
  source_type?: string;
  media_type?: string;
  metadata?: Record<string, unknown>;
  latest_version?: {
    row_count?: number;
    metadata?: Record<string, unknown>;
    created_at?: string;
  };
};
type Provider = { id: string; name: string; kind?: string; default_model?: string | null };
type Template = { id: string; name: string; slug: string; description?: string | null; system_prompt?: string | null; user_prompt_template?: string };
type DatasetPreview = { ok?: boolean; preview?: unknown; rows?: unknown[]; sample?: unknown; [key: string]: unknown } | unknown;

type WorkbenchResult = {
  run_id: string;
  rendered_prompt: { system_prompt?: string; user_prompt: string };
  provider_result: { summary: string; status: string; payload?: { items?: Array<{ text?: string; name?: string }> } };
};

type WorkbenchRunStatus = {
  ok: boolean;
  run: {
    id: string;
    status: string;
    summary?: string | null;
    error_text?: string | null;
    started_at?: string | null;
    finished_at?: string | null;
  };
  steps: Array<{
    id: string;
    step_index: number;
    step_name: string;
    status: string;
    error_text?: string | null;
  }>;
  rendered_prompt?: { system_prompt?: string; user_prompt: string } | null;
  provider_result?: WorkbenchResult['provider_result'] | null;
};

type WorkbenchStreamEvent = {
  run_id?: string;
  status?: string;
  stage?: string;
  message?: string;
  rendered_prompt?: WorkbenchResult['rendered_prompt'];
  provider_result?: WorkbenchResult['provider_result'];
  detail?: unknown;
};

function summarizeDatasetPreview(preview: DatasetPreview | null): string {
  if (!preview) return 'No dataset preview loaded yet.';
  if (Array.isArray(preview)) return `${preview.length} preview rows loaded.`;
  if (typeof preview === 'object') {
    const record = preview as Record<string, unknown>;
    const rows = Array.isArray(record.rows) ? record.rows : Array.isArray(record.preview) ? record.preview : null;
    if (rows) return `${rows.length} preview rows loaded.`;
    const sample = record.sample ?? record.preview;
    if (sample && typeof sample === 'object') return 'Sample object preview loaded.';
    return 'Dataset preview loaded.';
  }
  return 'Dataset preview loaded.';
}

function prettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function extractPreviewRows(preview: DatasetPreview | null): unknown[] {
  if (!preview) return [];
  if (Array.isArray(preview)) return preview.slice(0, 5);
  if (typeof preview === 'object') {
    const record = preview as Record<string, unknown>;
    if (Array.isArray(record.rows)) return record.rows.slice(0, 5);
    if (Array.isArray(record.preview)) return record.preview.slice(0, 5);
    if (record.sample !== undefined) return [record.sample];
  }
  return [];
}

export function WorkbenchPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [result, setResult] = useState<WorkbenchResult | null>(null);
  const [error, setError] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [running, setRunning] = useState(false);
  const [runStartedAt, setRunStartedAt] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const [activeRunId, setActiveRunId] = useState('');
  const [stageMessages, setStageMessages] = useState<string[]>([]);
  const [latestStatus, setLatestStatus] = useState<WorkbenchRunStatus | null>(null);
  const [selectedDatasetId, setSelectedDatasetId] = useState('');
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [modelOverride, setModelOverride] = useState('');
  const [variablesText, setVariablesText] = useState('');
  const [datasetPreview, setDatasetPreview] = useState<DatasetPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const selectedDataset = useMemo(() => datasets.find((dataset) => dataset.id === selectedDatasetId) ?? null, [datasets, selectedDatasetId]);
  const selectedProvider = useMemo(() => providers.find((provider) => provider.id === selectedProviderId) ?? null, [providers, selectedProviderId]);
  const selectedTemplate = useMemo(() => templates.find((template) => template.id === selectedTemplateId) ?? null, [templates, selectedTemplateId]);

  async function loadAll() {
    const [datasetData, providerData, templateData] = await Promise.all([
      api<Dataset[]>('/api/datasets').catch(() => []),
      api<Provider[]>('/api/providers').catch(() => []),
      api<Template[]>('/api/templates').catch(() => []),
    ]);
    setDatasets(datasetData);
    setProviders(providerData);
    setTemplates(templateData);

    const search = new URLSearchParams(window.location.search);
    const datasetParam = search.get('dataset_id') || '';
    const providerParam = search.get('provider_id') || '';
    const templateParam = search.get('template_id') || '';
    const modelParam = search.get('model') || '';

    setSelectedDatasetId((current) => current || datasetParam || datasetData[0]?.id || '');
    setSelectedProviderId((current) => current || providerParam || '');
    setSelectedTemplateId((current) => current || templateParam || templateData[0]?.id || '');
    setModelOverride((current) => current || modelParam || '');
  }

  useEffect(() => {
    void loadAll();
  }, []);

  useEffect(() => {
    async function loadPreview(datasetId: string) {
      setPreviewLoading(true);
      try {
        const preview = await api<DatasetPreview>(`/api/datasets/${datasetId}/preview`);
        setDatasetPreview(preview);
      } catch {
        setDatasetPreview(null);
      } finally {
        setPreviewLoading(false);
      }
    }

    if (selectedDatasetId) void loadPreview(selectedDatasetId);
    else setDatasetPreview(null);
  }, [selectedDatasetId]);

  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => setTick((current) => current + 1), 1000);
    return () => window.clearInterval(interval);
  }, [running]);

  useEffect(() => {
    if (!running || !activeRunId) return;
    const interval = window.setInterval(async () => {
      try {
        const status = await api<WorkbenchRunStatus>(`/api/workbench/runs/${activeRunId}`);
        setLatestStatus(status);
        if (status.run.status !== 'running') {
          setRunning(false);
          if (status.rendered_prompt && status.provider_result) {
            setResult({ run_id: status.run.id, rendered_prompt: status.rendered_prompt, provider_result: status.provider_result });
          }
          if (status.run.error_text) setError(status.run.error_text);
        }
      } catch {
        // best-effort polling fallback
      }
    }, 2000);
    return () => window.clearInterval(interval);
  }, [running, activeRunId]);

  async function onUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const file = form.get('file');
    if (!(file instanceof File)) return;
    setUploading(true);
    setError('');
    try {
      const payload = new FormData();
      payload.append('dataset_name', String(form.get('dataset_name') || ''));
      payload.append('file', file);
      await fetch('/api/imports/files', { method: 'POST', body: payload });
      await loadAll();
      formEl.reset();
    } catch (err) {
      setError(String(err));
    } finally {
      setUploading(false);
    }
  }

  async function onRun(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setResult(null);
    setLatestStatus(null);
    setStageMessages([]);
    setActiveRunId('');
    setRunning(true);
    setRunStartedAt(Date.now());

    const payload = {
      dataset_id: selectedDatasetId,
      provider_id: selectedProviderId,
      template_id: selectedTemplateId,
      model: modelOverride || undefined,
      variables: variablesText ? JSON.parse(variablesText) : {},
    };

    try {
      const response = await fetch('/api/workbench/run/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok || !response.body) {
        const rawText = await response.text();
        throw new Error(rawText || 'Workbench streaming request failed');
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
          const lines = part.split('\n');
          let eventName = 'message';
          const dataLines: string[] = [];
          for (const line of lines) {
            if (line.startsWith('event:')) eventName = line.slice(6).trim();
            if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
          }
          if (dataLines.length === 0) continue;
          const data = JSON.parse(dataLines.join('\n')) as WorkbenchStreamEvent;
          if (data.run_id && !activeRunId) setActiveRunId(data.run_id);
          if (eventName === 'stage') {
            setStageMessages((current) => [...current, `${data.stage}: ${data.message ?? data.status ?? 'updated'}`]);
          } else if (eventName === 'rendered' && data.rendered_prompt && data.run_id) {
            setLatestStatus((current) => current ? { ...current, rendered_prompt: data.rendered_prompt ?? current.rendered_prompt } : current);
          } else if (eventName === 'finished' && data.run_id && data.rendered_prompt && data.provider_result) {
            setResult({ run_id: data.run_id, rendered_prompt: data.rendered_prompt, provider_result: data.provider_result });
            setRunning(false);
          } else if (eventName === 'error') {
            throw new Error(typeof data.detail === 'string' ? data.detail : data.message || 'Workbench run failed');
          }
        }
        if (done) break;
      }
    } catch (err) {
      setError(String(err));
      setRunning(false);
    }
  }

  const previewRows = extractPreviewRows(datasetPreview);
  const elapsedSeconds = runStartedAt ? Math.max(0, Math.round((Date.now() - runStartedAt) / 1000)) : 0;
  void tick;

  return (
    <div className="stack">
      <div className="card stack">
        <div>
          <h2>Workbench</h2>
          <p className="muted">Use Workbench for one-off prompt testing and structured runs before you save the pattern as a workflow or automation.</p>
        </div>
      </div>
      <div className="grid two-col">
      <div className="stack">
        <div className="card">
          <h2>Upload dataset</h2>
          <form className="stack" onSubmit={onUpload}>
            <input name="dataset_name" placeholder="Optional dataset name" />
            <input name="file" type="file" required />
            <button type="submit" disabled={uploading}>{uploading ? 'Uploading…' : 'Upload file'}</button>
          </form>
        </div>

        <div className="card">
          <h2>Run workbench</h2>
          <p className="muted">For a first smoke test, try the seeded <strong>demo-mock</strong> provider. If you run Ollama locally, <strong>ollama-local</strong> is also seeded.</p>
          <form className="stack" onSubmit={onRun}>
            <select value={selectedDatasetId} onChange={(event) => setSelectedDatasetId(event.target.value)} required>
              <option value="" disabled>Select dataset</option>
              {datasets.map((dataset) => <option key={dataset.id} value={dataset.id}>{dataset.name}</option>)}
            </select>
            <select value={selectedProviderId} onChange={(event) => setSelectedProviderId(event.target.value)} required>
              <option value="" disabled>Select provider</option>
              {providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
            </select>
            <select value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)} required>
              <option value="" disabled>Select template</option>
              {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
            </select>
            <input value={modelOverride} onChange={(event) => setModelOverride(event.target.value)} placeholder="Optional model override" />
            <textarea value={variablesText} onChange={(event) => setVariablesText(event.target.value)} placeholder='Optional JSON variables, e.g. {"team_name":"Platform"}' rows={5} />
            <button type="submit" disabled={running || !selectedDatasetId || !selectedProviderId || !selectedTemplateId}>{running ? 'Running…' : 'Run'}</button>
          </form>
          {error ? <p>{error}</p> : null}
        </div>

        <div className="card">
          <h2>Current run setup</h2>
          <div className="row wrap">
            {selectedDatasetId ? <a className="button-link" href={`/chat?dataset_id=${encodeURIComponent(selectedDatasetId)}&provider_id=${encodeURIComponent(selectedProviderId)}&model=${encodeURIComponent(modelOverride || selectedProvider?.default_model || '')}`}>Open in Chat</a> : null}
            {selectedDatasetId ? <a className="button-link" href={`/workflows?dataset_id=${encodeURIComponent(selectedDatasetId)}&provider_id=${encodeURIComponent(selectedProviderId)}&template_id=${encodeURIComponent(selectedTemplateId)}`}>Open in Workflows</a> : null}
            {selectedDatasetId ? <a className="button-link" href={`/automations?target_type=template_prompt&dataset_id=${encodeURIComponent(selectedDatasetId)}&provider_id=${encodeURIComponent(selectedProviderId)}&template_id=${encodeURIComponent(selectedTemplateId)}`}>Seed Automation</a> : null}
          </div>
          <ul className="list">
            <li>
              <strong>Dataset:</strong> {selectedDataset ? selectedDataset.name : 'None selected'}
              {selectedDataset ? <div className="muted">{selectedDataset.latest_version?.row_count ?? '—'} rows · {selectedDataset.media_type ?? selectedDataset.source_type ?? 'unknown type'}</div> : null}
            </li>
            <li>
              <strong>Provider:</strong> {selectedProvider ? selectedProvider.name : 'None selected'}
              {selectedProvider ? <div className="muted">Default model: {selectedProvider.default_model ?? 'not set'}</div> : null}
            </li>
            <li>
              <strong>Template:</strong> {selectedTemplate ? selectedTemplate.name : 'None selected'}
              {selectedTemplate?.description ? <div className="muted">{selectedTemplate.description}</div> : null}
            </li>
            <li><strong>Model:</strong> {modelOverride || selectedProvider?.default_model || 'provider default / unset'}</li>
            {activeRunId ? <li><strong>Run ID:</strong> {activeRunId}</li> : null}
          </ul>
        </div>
      </div>

      <div className="stack">
        <div className="card">
          <h2>Dataset context</h2>
          {!selectedDataset ? <p className="muted">Select a dataset to see what the workbench is actually sending through the template.</p> : (
            <div className="stack">
              <div>
                <strong>{selectedDataset.name}</strong>
                <div className="muted">{selectedDataset.id} · rows: {selectedDataset.latest_version?.row_count ?? '—'}</div>
              </div>
              <div className="muted">{previewLoading ? 'Loading preview…' : summarizeDatasetPreview(datasetPreview)}</div>
              {previewRows.length > 0 ? (
                <details open>
                  <summary>Preview rows / sample</summary>
                  <pre>{prettyJson(previewRows)}</pre>
                </details>
              ) : datasetPreview ? (
                <details>
                  <summary>Raw preview</summary>
                  <pre>{prettyJson(datasetPreview)}</pre>
                </details>
              ) : null}
              {selectedTemplate ? (
                <details>
                  <summary>Template details</summary>
                  <div className="stack">
                    <div><strong>{selectedTemplate.name}</strong> <span className="muted">({selectedTemplate.slug})</span></div>
                    {selectedTemplate.description ? <div className="muted">{selectedTemplate.description}</div> : null}
                    {selectedTemplate.system_prompt ? <details><summary>System prompt</summary><pre>{selectedTemplate.system_prompt}</pre></details> : null}
                    {selectedTemplate.user_prompt_template ? <details><summary>User prompt template</summary><pre>{selectedTemplate.user_prompt_template}</pre></details> : null}
                  </div>
                </details>
              ) : null}
            </div>
          )}
        </div>

        <div className="card stack">
          <div>
            <h2>Output</h2>
            <div className="muted">Use Workbench output to validate a prompt/provider combination first, then continue in chat or promote the pattern into workflows and automations.</div>
          </div>
          {running ? (
            <div className="stack">
              <p><strong>Run in progress…</strong></p>
              <div className="muted">Streaming stage updates and polling run status in the background.</div>
              <ul className="list">
                <li>Dataset: {selectedDataset?.name ?? selectedDatasetId}</li>
                <li>Provider: {selectedProvider?.name ?? selectedProviderId}</li>
                <li>Template: {selectedTemplate?.name ?? selectedTemplateId}</li>
                <li>Model: {modelOverride || selectedProvider?.default_model || 'provider default / unset'}</li>
                <li>Elapsed: ~{elapsedSeconds}s</li>
                {activeRunId ? <li>Run ID: {activeRunId}</li> : null}
              </ul>
              {stageMessages.length > 0 ? (
                <details open>
                  <summary>Stage log</summary>
                  <ul className="list">
                    {stageMessages.map((message, index) => <li key={`${message}-${index}`}>{message}</li>)}
                  </ul>
                </details>
              ) : null}
              {latestStatus?.steps?.length ? (
                <details>
                  <summary>Recorded steps</summary>
                  <ul className="list">
                    {latestStatus.steps.map((step) => <li key={step.id}>{step.step_index}. {step.step_name} · {step.status}{step.error_text ? ` · ${step.error_text}` : ''}</li>)}
                  </ul>
                </details>
              ) : null}
            </div>
          ) : !result ? <p className="muted">Run a dataset through a template and provider to see output here.</p> : (
            <div className="stack">
              <div><strong>Run:</strong> {result.run_id}</div>
              <div><strong>Status:</strong> {result.provider_result.status}</div>
              <div><strong>Summary:</strong> {result.provider_result.summary}</div>
              <div className="row wrap">
                {selectedDatasetId ? <a className="button-link" href={`/chat?dataset_id=${encodeURIComponent(selectedDatasetId)}&provider_id=${encodeURIComponent(selectedProviderId)}&model=${encodeURIComponent(modelOverride || selectedProvider?.default_model || '')}`}>Continue in Chat</a> : null}
                {selectedDatasetId ? <a className="button-link" href={`/workflows?dataset_id=${encodeURIComponent(selectedDatasetId)}&provider_id=${encodeURIComponent(selectedProviderId)}&template_id=${encodeURIComponent(selectedTemplateId)}`}>Promote to Workflow</a> : null}
                {selectedDatasetId ? <a className="button-link" href={`/automations?target_type=template_prompt&dataset_id=${encodeURIComponent(selectedDatasetId)}&provider_id=${encodeURIComponent(selectedProviderId)}&template_id=${encodeURIComponent(selectedTemplateId)}`}>Seed Automation</a> : null}
              </div>
              <details>
                <summary>Rendered prompt</summary>
                <pre>{result.rendered_prompt.user_prompt}</pre>
              </details>
              <details open>
                <summary>LLM output</summary>
                <pre>{result.provider_result.payload?.items?.map((item) => item.text || item.name || JSON.stringify(item)).join('\n\n') ?? '(no payload items)'}</pre>
              </details>
            </div>
          )}
        </div>

        <div className="card">
          <h2>Datasets</h2>
          <ul className="list">
            {datasets.length === 0 ? <li>No datasets yet.</li> : datasets.map((dataset) => (
              <li key={dataset.id}>
                <strong>{dataset.name}</strong>
                <div className="muted">{dataset.id} · rows: {dataset.latest_version?.row_count ?? '—'}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
      </div>
    </div>
  );
}
