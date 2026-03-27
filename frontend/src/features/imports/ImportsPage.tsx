import { FormEvent, useEffect, useMemo, useState } from 'react';

import { api } from '../../lib/api';

type Dataset = {
  id: string;
  name: string;
  latest_version_no?: number;
};

type SourceType = 'file_upload' | 'http';
type TargetMode = 'create_new_dataset' | 'append_to_dataset';
type ResponseFormatHint = 'auto' | 'json' | 'csv' | 'text';

type HttpAuthMode = 'none' | 'bearer' | 'custom_header' | 'basic';

type ImportRecipe = {
  id: string;
  name: string;
  description?: string | null;
  enabled: boolean;
  source_type: SourceType;
  source_config?: {
    method?: 'GET' | 'POST';
    url?: string;
    headers?: Record<string, string>;
    timeout_seconds?: number;
    response_format_hint?: ResponseFormatHint;
    body?: string | null;
    auth?: {
      mode?: HttpAuthMode;
      secret_alias?: string;
      header_name?: string;
      username?: string;
    };
  };
  target_mode: TargetMode;
  target_dataset_id?: string | null;
  target_dataset_name?: string | null;
  dataset_name_template?: string | null;
  parser_options?: Record<string, unknown>;
  transform_rules?: Record<string, unknown>;
  preview_config?: Record<string, unknown>;
  last_run_at?: string | null;
  last_run_status?: string | null;
  created_at: string;
  updated_at: string;
};

type ImportRun = {
  id: string;
  recipe_id: string;
  dataset_id?: string | null;
  dataset_version_id?: string | null;
  status: 'created' | 'running' | 'success' | 'failed';
  source_type: SourceType;
  original_filename?: string | null;
  storage_path?: string | null;
  parser_used?: string | null;
  media_type?: string | null;
  byte_size?: number | null;
  checksum?: string | null;
  warning_count: number;
  error_text?: string | null;
  details: Record<string, unknown>;
  started_at?: string | null;
  finished_at?: string | null;
  created_at: string;
};

type PreviewResponse = {
  ok: boolean;
  source_type: SourceType;
  parser_used: string;
  media_type?: string | null;
  row_count?: number | null;
  preview: Record<string, unknown>;
  warnings: string[];
  diagnostics: Record<string, unknown>;
};

type RecipeForm = {
  name: string;
  description: string;
  enabled: boolean;
  source_type: SourceType;
  http_method: 'GET' | 'POST';
  http_url: string;
  http_headers_text: string;
  http_timeout_seconds: string;
  http_response_format_hint: ResponseFormatHint;
  http_body: string;
  http_auth_mode: HttpAuthMode;
  http_auth_secret_alias: string;
  http_auth_header_name: string;
  http_auth_username: string;
  rename_fields_text: string;
  drop_fields_text: string;
  keep_fields_text: string;
  add_static_fields_text: string;
  target_mode: TargetMode;
  target_dataset_id: string;
  dataset_name_template: string;
};

const EMPTY_FORM: RecipeForm = {
  name: '',
  description: '',
  enabled: true,
  source_type: 'file_upload',
  http_method: 'GET',
  http_url: '',
  http_headers_text: '{}',
  http_timeout_seconds: '15',
  http_response_format_hint: 'auto',
  http_body: '',
  http_auth_mode: 'none',
  http_auth_secret_alias: '',
  http_auth_header_name: 'X-API-Key',
  http_auth_username: '',
  rename_fields_text: '',
  drop_fields_text: '',
  keep_fields_text: '',
  add_static_fields_text: '',
  target_mode: 'create_new_dataset',
  target_dataset_id: '',
  dataset_name_template: '',
};

function recipeToForm(recipe: ImportRecipe): RecipeForm {
  return {
    name: recipe.name,
    description: recipe.description ?? '',
    enabled: recipe.enabled,
    source_type: recipe.source_type,
    http_method: recipe.source_config?.method ?? 'GET',
    http_url: recipe.source_config?.url ?? '',
    http_headers_text: JSON.stringify(recipe.source_config?.headers ?? {}, null, 2),
    http_timeout_seconds: String(recipe.source_config?.timeout_seconds ?? 15),
    http_response_format_hint: recipe.source_config?.response_format_hint ?? 'auto',
    http_body: recipe.source_config?.body ?? '',
    http_auth_mode: recipe.source_config?.auth?.mode ?? 'none',
    http_auth_secret_alias: recipe.source_config?.auth?.secret_alias ?? '',
    http_auth_header_name: recipe.source_config?.auth?.header_name ?? 'X-API-Key',
    http_auth_username: recipe.source_config?.auth?.username ?? '',
    rename_fields_text: Object.entries((recipe.transform_rules?.rename_fields as Record<string, string> | undefined) ?? {}).map(([from, to]) => `${from}=${to}`).join('\n'),
    drop_fields_text: ((recipe.transform_rules?.drop_fields as string[] | undefined) ?? []).join(', '),
    keep_fields_text: ((recipe.transform_rules?.keep_fields as string[] | undefined) ?? []).join(', '),
    add_static_fields_text: Object.entries((recipe.transform_rules?.add_static_fields as Record<string, string> | undefined) ?? {}).map(([key, value]) => `${key}=${value}`).join('\n'),
    target_mode: recipe.target_mode,
    target_dataset_id: recipe.target_dataset_id ?? '',
    dataset_name_template: recipe.dataset_name_template ?? '',
  };
}

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
          <tr>
            {columns.map((column) => <th key={column}>{column}</th>)}
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index}>
              {columns.map((column) => <td key={column}>{String(item[column] ?? '')}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function buildWorkbenchUrl(params: { datasetId?: string | null; providerId?: string | null; templateId?: string | null; model?: string | null }) {
  const search = new URLSearchParams();
  if (params.datasetId) search.set('dataset_id', params.datasetId);
  if (params.providerId) search.set('provider_id', params.providerId);
  if (params.templateId) search.set('template_id', params.templateId);
  if (params.model) search.set('model', params.model);
  const qs = search.toString();
  return `/workbench${qs ? `?${qs}` : ''}`;
}

function buildWorkflowsUrl(params: { workflowId?: string | null; datasetId?: string | null; providerId?: string | null; templateId?: string | null; model?: string | null }) {
  const search = new URLSearchParams();
  if (params.workflowId) search.set('workflow_id', params.workflowId);
  if (params.datasetId) search.set('dataset_id', params.datasetId);
  if (params.providerId) search.set('provider_id', params.providerId);
  if (params.templateId) search.set('template_id', params.templateId);
  if (params.model) search.set('model', params.model);
  const qs = search.toString();
  return `/workflows${qs ? `?${qs}` : ''}`;
}

function buildAutomationsUrl(params: { targetType: 'workflow' | 'template_prompt'; workflowId?: string | null; datasetId?: string | null; providerId?: string | null; templateId?: string | null; model?: string | null }) {
  const search = new URLSearchParams();
  search.set('target_type', params.targetType);
  if (params.workflowId) search.set('workflow_id', params.workflowId);
  if (params.datasetId) search.set('dataset_id', params.datasetId);
  if (params.providerId) search.set('provider_id', params.providerId);
  if (params.templateId) search.set('template_id', params.templateId);
  if (params.model) search.set('model', params.model);
  return `/automations?${search.toString()}`;
}

function summarizeRun(run: ImportRun): string {
  if (run.status === 'success' && run.dataset_version_id) return `Created ${run.dataset_version_id}`;
  if (run.status === 'failed') return 'Run failed';
  return run.parser_used ?? 'parser pending';
}

function summarizeResponseError(body: unknown, fallback = 'Request failed'): string {
  if (!body || typeof body !== 'object') {
    return typeof body === 'string' && body ? body : fallback;
  }
  const record = body as Record<string, unknown>;
  const detail = record.detail;
  if (typeof detail === 'string') return detail;
  if (detail && typeof detail === 'object') {
    const detailRecord = detail as Record<string, unknown>;
    const parts: string[] = [];
    if (typeof detailRecord.message === 'string') parts.push(detailRecord.message);
    if (typeof detailRecord.type === 'string') parts.push(`type=${detailRecord.type}`);
    const diagnostics = detailRecord.diagnostics;
    if (diagnostics && typeof diagnostics === 'object') {
      const diag = diagnostics as Record<string, unknown>;
      if (typeof diag.status_code === 'number') parts.push(`status=${diag.status_code}`);
      if (typeof diag.url === 'string') parts.push(`url=${diag.url}`);
    }
    if (parts.length > 0) return parts.join(' · ');
  }
  if (typeof record.message === 'string') return record.message;
  return fallback;
}

function buildSourceConfig(form: RecipeForm): Record<string, unknown> {
  if (form.source_type === 'file_upload') return {};
  return {
    method: form.http_method,
    url: form.http_url.trim(),
    headers: form.http_headers_text.trim() ? JSON.parse(form.http_headers_text) : {},
    timeout_seconds: Number(form.http_timeout_seconds || '15'),
    response_format_hint: form.http_response_format_hint,
    body: form.http_body.trim() || null,
    auth: {
      mode: form.http_auth_mode,
      secret_alias: form.http_auth_secret_alias.trim() || null,
      header_name: form.http_auth_mode === 'custom_header' ? (form.http_auth_header_name.trim() || 'X-API-Key') : null,
      username: form.http_auth_mode === 'basic' ? (form.http_auth_username.trim() || null) : null,
    },
  };
}

function parseKeyValueLines(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    const eq = line.indexOf('=');
    if (eq === -1) throw new Error(`Expected key=value line, got: ${line}`);
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    if (!key) throw new Error(`Expected key=value line, got: ${line}`);
    result[key] = value;
  }
  return result;
}

function parseCsvList(text: string): string[] {
  return text.split(',').map((part) => part.trim()).filter(Boolean);
}

function buildTransformRules(form: RecipeForm): Record<string, unknown> {
  return {
    rename_fields: parseKeyValueLines(form.rename_fields_text),
    drop_fields: parseCsvList(form.drop_fields_text),
    keep_fields: parseCsvList(form.keep_fields_text),
    add_static_fields: parseKeyValueLines(form.add_static_fields_text),
  };
}

export function ImportsPage() {
  const [recipes, setRecipes] = useState<ImportRecipe[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState('');
  const [form, setForm] = useState<RecipeForm>(EMPTY_FORM);
  const [runs, setRuns] = useState<ImportRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState('');
  const [runDetail, setRunDetail] = useState<ImportRun | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);

  const selectedRecipe = useMemo(() => recipes.find((recipe) => recipe.id === selectedRecipeId) ?? null, [recipes, selectedRecipeId]);
  const datasetNameById = useMemo(() => Object.fromEntries(datasets.map((dataset) => [dataset.id, dataset.name])), [datasets]);

  async function loadAll() {
    const [recipeData, datasetData] = await Promise.all([
      api<ImportRecipe[]>('/api/import-recipes').catch(() => []),
      api<Dataset[]>('/api/datasets').catch(() => []),
    ]);
    setRecipes(recipeData);
    setDatasets(datasetData);
    setSelectedRecipeId((current) => current || recipeData[0]?.id || '');
  }

  async function loadRuns(recipeId: string) {
    if (!recipeId) {
      setRuns([]);
      setSelectedRunId('');
      setRunDetail(null);
      return;
    }
    const data = await api<{ runs: ImportRun[] }>(`/api/import-recipes/${recipeId}/runs`).catch(() => ({ runs: [] }));
    setRuns(data.runs);
    setSelectedRunId((current) => current || data.runs[0]?.id || '');
  }

  async function loadRunDetail(runId: string) {
    if (!runId) {
      setRunDetail(null);
      return;
    }
    const data = await api<ImportRun>(`/api/import-runs/${runId}`).catch(() => null);
    setRunDetail(data);
  }

  useEffect(() => {
    void loadAll();
  }, []);

  useEffect(() => {
    if (!selectedRecipe) {
      setForm(EMPTY_FORM);
      setRuns([]);
      setSelectedRunId('');
      setRunDetail(null);
      setPreview(null);
      return;
    }
    setForm(recipeToForm(selectedRecipe));
    setPreview(null);
    void loadRuns(selectedRecipe.id);
  }, [selectedRecipe]);

  useEffect(() => {
    if (selectedRunId) void loadRunDetail(selectedRunId);
    else setRunDetail(null);
  }, [selectedRunId]);

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        enabled: form.enabled,
        source_type: form.source_type,
        source_config: buildSourceConfig(form),
        target_mode: form.target_mode,
        target_dataset_id: form.target_mode === 'append_to_dataset' ? (form.target_dataset_id || null) : null,
        dataset_name_template: form.target_mode === 'create_new_dataset' ? (form.dataset_name_template || null) : null,
        parser_options: {},
        transform_rules: buildTransformRules(form),
        preview_config: {},
      };

      if (selectedRecipeId) {
        const updated = await api<ImportRecipe>(`/api/import-recipes/${selectedRecipeId}`, { method: 'PATCH', body: JSON.stringify(payload) });
        setSelectedRecipeId(updated.id);
        setMessage('Import recipe updated');
      } else {
        const created = await api<ImportRecipe>('/api/import-recipes', { method: 'POST', body: JSON.stringify(payload) });
        setSelectedRecipeId(created.id);
        setMessage('Import recipe created');
      }
      await loadAll();
    } catch (err) {
      setError(String(err));
    }
  }

  async function onDelete() {
    if (!selectedRecipeId || !window.confirm('Delete this import recipe?')) return;
    setError('');
    setMessage('');
    try {
      await api(`/api/import-recipes/${selectedRecipeId}`, { method: 'DELETE' });
      setMessage('Import recipe deleted');
      setSelectedRecipeId('');
      setForm(EMPTY_FORM);
      setRuns([]);
      setRunDetail(null);
      setPreview(null);
      await loadAll();
    } catch (err) {
      setError(String(err));
    }
  }

  async function onPreview() {
    setPreviewing(true);
    setError('');
    setMessage('');
    try {
      const response = await api<PreviewResponse>('/api/import-recipes/preview', {
        method: 'POST',
        body: JSON.stringify({
          source_type: form.source_type,
          source_config: buildSourceConfig(form),
          parser_options: {},
          transform_rules: buildTransformRules(form),
          preview_config: {},
        }),
      });
      setPreview(response);
      setMessage('Preview loaded');
    } catch (err) {
      setPreview(null);
      setError(String(err));
    } finally {
      setPreviewing(false);
    }
  }

  async function onRun(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedRecipeId) return;
    const formEl = event.currentTarget;

    setRunning(true);
    setError('');
    setMessage('');
    try {
      let response: Response;
      if (selectedRecipe?.source_type === 'http') {
        response = await fetch(`/api/import-recipes/${selectedRecipeId}/run`, { method: 'POST', body: new FormData() });
      } else {
        const formData = new FormData(formEl);
        const file = formData.get('file');
        if (!(file instanceof File)) throw new Error('Please select a file before running this recipe');
        const payload = new FormData();
        payload.append('file', file);
        response = await fetch(`/api/import-recipes/${selectedRecipeId}/run`, { method: 'POST', body: payload });
      }

      const raw = await response.text();
      let body: unknown = {};
      try {
        body = raw ? JSON.parse(raw) : {};
      } catch {
        body = raw;
      }
      if (!response.ok) {
        throw new Error(summarizeResponseError(body, raw || 'Run failed'));
      }
      const bodyRecord = body && typeof body === 'object' ? body as Record<string, unknown> : {};
      setMessage(typeof bodyRecord.message === 'string' ? bodyRecord.message : 'Import recipe ran successfully');
      formEl.reset();
      await loadAll();
      await loadRuns(selectedRecipeId);
      if (typeof bodyRecord.run_id === 'string') {
        setSelectedRunId(bodyRecord.run_id);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setRunning(false);
    }
  }

  function onNewRecipe() {
    setSelectedRecipeId('');
    setSelectedRunId('');
    setRunDetail(null);
    setPreview(null);
    setForm(EMPTY_FORM);
    setMessage('');
    setError('');
  }

  return (
    <div className="grid two-col">
      <div className="stack">
        <div className="card">
          <div className="row between wrap">
            <h2>Import recipes</h2>
            <button type="button" onClick={onNewRecipe}>New recipe</button>
          </div>
          {message ? <div className="notice success">{message}</div> : null}
          {error ? <div className="notice error"><pre>{error}</pre></div> : null}
          <ul className="list">
            {recipes.length === 0 ? <li>No import recipes yet.</li> : recipes.map((recipe) => (
              <li key={recipe.id}>
                <button type="button" className={selectedRecipeId === recipe.id ? 'session-button active' : 'session-button'} onClick={() => setSelectedRecipeId(recipe.id)}>
                  <strong>{recipe.name}</strong>
                  <div className="muted">{recipe.source_type === 'http' ? `HTTP · ${recipe.source_config?.method ?? 'GET'} ${recipe.source_config?.url ?? ''}` : 'File upload'}</div>
                  <div className="muted">{recipe.target_mode === 'append_to_dataset' ? `Append to ${recipe.target_dataset_name ?? recipe.target_dataset_id}` : 'Create new dataset each run'}</div>
                  <div className="muted">{recipe.last_run_status ?? 'Never run'}{recipe.last_run_at ? ` · ${recipe.last_run_at}` : ''}</div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="stack">
        <div className="card">
          <h2>{selectedRecipeId ? 'Edit import recipe' : 'Create import recipe'}</h2>
          <form className="stack" onSubmit={onSave}>
            <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Ticket CSV refresh" required />
            <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={3} placeholder="Optional description" />
            <label className="checkbox-row">
              <input type="checkbox" checked={form.enabled} onChange={(event) => setForm((current) => ({ ...current, enabled: event.target.checked }))} />
              <span>Enabled</span>
            </label>
            <select value={form.source_type} onChange={(event) => setForm((current) => ({ ...current, source_type: event.target.value as SourceType }))}>
              <option value="file_upload">File upload</option>
              <option value="http">HTTP / internal URL</option>
            </select>

            {form.source_type === 'http' ? (
              <>
                <select value={form.http_method} onChange={(event) => setForm((current) => ({ ...current, http_method: event.target.value as 'GET' | 'POST' }))}>
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                </select>
                <input value={form.http_url} onChange={(event) => setForm((current) => ({ ...current, http_url: event.target.value }))} placeholder="http://internal.service.local/export.json" required />
                <textarea value={form.http_headers_text} onChange={(event) => setForm((current) => ({ ...current, http_headers_text: event.target.value }))} rows={5} placeholder='{"Accept":"application/json"}' />
                <div className="grid two-col">
                  <input value={form.http_timeout_seconds} onChange={(event) => setForm((current) => ({ ...current, http_timeout_seconds: event.target.value }))} placeholder="Timeout seconds" inputMode="numeric" />
                  <select value={form.http_response_format_hint} onChange={(event) => setForm((current) => ({ ...current, http_response_format_hint: event.target.value as ResponseFormatHint }))}>
                    <option value="auto">Auto-detect</option>
                    <option value="json">JSON</option>
                    <option value="csv">CSV</option>
                    <option value="text">Text</option>
                  </select>
                </div>
                <div className="card stack">
                  <h3>HTTP auth</h3>
                  <select value={form.http_auth_mode} onChange={(event) => setForm((current) => ({ ...current, http_auth_mode: event.target.value as HttpAuthMode }))}>
                    <option value="none">No auth</option>
                    <option value="bearer">Bearer token</option>
                    <option value="custom_header">Custom header secret</option>
                    <option value="basic">Basic auth</option>
                  </select>
                  {form.http_auth_mode !== 'none' ? <input value={form.http_auth_secret_alias} onChange={(event) => setForm((current) => ({ ...current, http_auth_secret_alias: event.target.value }))} placeholder="Saved secret alias" /> : null}
                  {form.http_auth_mode === 'custom_header' ? <input value={form.http_auth_header_name} onChange={(event) => setForm((current) => ({ ...current, http_auth_header_name: event.target.value }))} placeholder="Header name" /> : null}
                  {form.http_auth_mode === 'basic' ? <input value={form.http_auth_username} onChange={(event) => setForm((current) => ({ ...current, http_auth_username: event.target.value }))} placeholder="Basic auth username" /> : null}
                  <div className="muted">Secrets are resolved at runtime from saved aliases like <code>secrets.MY_ALIAS</code>. Secret values are not stored in the recipe.</div>
                </div>
                <textarea value={form.http_body} onChange={(event) => setForm((current) => ({ ...current, http_body: event.target.value }))} rows={4} placeholder="Optional raw request body for POST recipes" />
              </>
            ) : null}

            <div className="card stack">
              <h3>Transform rules</h3>
              <textarea value={form.rename_fields_text} onChange={(event) => setForm((current) => ({ ...current, rename_fields_text: event.target.value }))} rows={4} placeholder={"rename fields, one per line\nticketId=ticket_id\nsev=severity"} />
              <input value={form.drop_fields_text} onChange={(event) => setForm((current) => ({ ...current, drop_fields_text: event.target.value }))} placeholder="drop fields (comma-separated)" />
              <input value={form.keep_fields_text} onChange={(event) => setForm((current) => ({ ...current, keep_fields_text: event.target.value }))} placeholder="keep fields (comma-separated)" />
              <textarea value={form.add_static_fields_text} onChange={(event) => setForm((current) => ({ ...current, add_static_fields_text: event.target.value }))} rows={4} placeholder={"static fields, one per line\nsource=jira\nteam=platform"} />
              <div className="muted">Applied in order: rename → drop → keep → add static. Current MVP only transforms record-set payloads.</div>
            </div>

            <select value={form.target_mode} onChange={(event) => setForm((current) => ({ ...current, target_mode: event.target.value as TargetMode }))}>
              <option value="create_new_dataset">Create new dataset each run</option>
              <option value="append_to_dataset">Append to existing dataset</option>
            </select>
            {form.target_mode === 'create_new_dataset' ? (
              <input value={form.dataset_name_template} onChange={(event) => setForm((current) => ({ ...current, dataset_name_template: event.target.value }))} placeholder="Dataset name (required)" required />
            ) : (
              <select value={form.target_dataset_id} onChange={(event) => setForm((current) => ({ ...current, target_dataset_id: event.target.value }))} required>
                <option value="">Select dataset</option>
                {datasets.map((dataset) => <option key={dataset.id} value={dataset.id}>{dataset.name}</option>)}
              </select>
            )}
            <div className="muted">Current MVP supports file uploads plus internal HTTP/HTTPS endpoints with JSON, CSV, or text responses.</div>
            <div className="row between wrap">
              <div className="row wrap">
                <button type="button" onClick={() => void onPreview()} disabled={previewing}>{previewing ? 'Testing…' : 'Test recipe'}</button>
                {selectedRecipeId ? <button type="button" className="danger-button" onClick={() => void onDelete()}>Delete</button> : null}
              </div>
              <button type="submit">{selectedRecipeId ? 'Save recipe' : 'Create recipe'}</button>
            </div>
          </form>
        </div>

        {preview ? (
          <div className="card stack">
            <div className="row between wrap">
              <h2>Preview</h2>
              <span className="muted">{preview.parser_used} · {preview.media_type ?? 'unknown media type'}</span>
            </div>
            <div className="pill-row">
              <span className="pill">Rows: {preview.row_count ?? 'unknown'}</span>
              <span className="pill">Source: {preview.source_type}</span>
            </div>
            {preview.warnings.length > 0 ? <div className="notice error"><pre>{preview.warnings.join('\n')}</pre></div> : null}
            {isRecordArray(preview.preview.sample_items) ? (
              <div className="stack">
                <div className="muted">Sample rows</div>
                {renderRecordTable(preview.preview.sample_items)}
                {preview.preview.transform_summary ? (
                  <details>
                    <summary>Transform summary</summary>
                    <pre>{prettyJson(preview.preview.transform_summary)}</pre>
                  </details>
                ) : null}
              </div>
            ) : (
              <details open>
                <summary>Preview payload</summary>
                <pre>{prettyJson(preview.preview)}</pre>
              </details>
            )}
            <details>
              <summary>Diagnostics</summary>
              <pre>{prettyJson(preview.diagnostics)}</pre>
            </details>
          </div>
        ) : null}

        <div className="card">
          <h2>Run recipe</h2>
          {!selectedRecipe ? <p className="muted">Create or select a recipe first.</p> : (
            <form className="stack" onSubmit={onRun}>
              <div className="muted">Recipe: <strong>{selectedRecipe.name}</strong></div>
              <div className="muted">Source: {selectedRecipe.source_type === 'http' ? `${selectedRecipe.source_config?.method ?? 'GET'} ${selectedRecipe.source_config?.url ?? ''}` : 'File upload'}</div>
              <div className="muted">Mode: {selectedRecipe.target_mode === 'append_to_dataset' ? `append to ${selectedRecipe.target_dataset_name ?? selectedRecipe.target_dataset_id}` : `create new dataset (${selectedRecipe.dataset_name_template ?? selectedRecipe.name})`}</div>
              {selectedRecipe.source_type === 'file_upload' ? <input name="file" type="file" required /> : null}
              <button type="submit" disabled={running}>{running ? 'Running…' : 'Run recipe'}</button>
            </form>
          )}
        </div>

        <div className="card">
          <h2>Recent runs</h2>
          {!selectedRecipe ? <p className="muted">Select a recipe to inspect run history.</p> : (
            <div className="grid two-col">
              <ul className="list">
                {runs.length === 0 ? <li>No runs yet.</li> : runs.map((run) => (
                  <li key={run.id}>
                    <button type="button" className={selectedRunId === run.id ? 'session-button active' : 'session-button'} onClick={() => setSelectedRunId(run.id)}>
                      <strong>{run.status}</strong>
                      <div className="muted">{run.original_filename ?? 'no file recorded'}</div>
                      <div className="muted">{summarizeRun(run)}</div>
                    </button>
                  </li>
                ))}
              </ul>
              <div>
                {!runDetail ? <p className="muted">Select a run to inspect details.</p> : (
                  <div className="stack">
                    <div><strong>Run:</strong> {runDetail.id}</div>
                    <div><strong>Status:</strong> {runDetail.status}</div>
                    <div><strong>Source type:</strong> {runDetail.source_type}</div>
                    <div><strong>Source name:</strong> {runDetail.original_filename ?? '—'}</div>
                    <div><strong>Parser:</strong> {runDetail.parser_used ?? '—'}</div>
                    <div><strong>Media type:</strong> {runDetail.media_type ?? '—'}</div>
                    <div><strong>Warnings:</strong> {runDetail.warning_count}</div>
                    {runDetail.dataset_id ? <div><strong>Dataset:</strong> {datasetNameById[runDetail.dataset_id] ?? runDetail.dataset_id} <span className="muted">({runDetail.dataset_id})</span></div> : null}
                    {runDetail.dataset_version_id ? <div><strong>Dataset version:</strong> {runDetail.dataset_version_id}</div> : null}
                    {runDetail.dataset_id ? (
                      <div className="row wrap">
                        <a className="button-link" href={buildWorkbenchUrl({ datasetId: runDetail.dataset_id })}>Open in Workbench</a>
                        <a className="button-link" href={buildWorkflowsUrl({ datasetId: runDetail.dataset_id })}>Use in Workflows</a>
                        <a className="button-link" href={buildAutomationsUrl({ targetType: 'template_prompt', datasetId: runDetail.dataset_id })}>Seed Automation</a>
                      </div>
                    ) : null}
                    {runDetail.error_text ? <div className="notice error"><pre>{runDetail.error_text}</pre></div> : null}
                    {isRecordArray(runDetail.details.preview && (runDetail.details.preview as Record<string, unknown>).sample_items) ? (
                      <div className="stack">
                        <div className="muted">Sample rows</div>
                        {renderRecordTable((runDetail.details.preview as Record<string, unknown>).sample_items as Record<string, unknown>[])}
                      </div>
                    ) : null}
                    {runDetail.details.preview && (runDetail.details.preview as Record<string, unknown>).transform_summary ? (
                      <details>
                        <summary>Transform summary</summary>
                        <pre>{prettyJson((runDetail.details.preview as Record<string, unknown>).transform_summary)}</pre>
                      </details>
                    ) : null}
                    <details>
                      <summary>Diagnostics</summary>
                      <pre>{prettyJson(runDetail.details.diagnostics ?? {})}</pre>
                    </details>
                    <details>
                      <summary>Details</summary>
                      <pre>{prettyJson(runDetail.details)}</pre>
                    </details>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
