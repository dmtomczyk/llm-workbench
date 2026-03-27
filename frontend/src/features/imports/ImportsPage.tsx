import { FormEvent, useEffect, useMemo, useState } from 'react';

import { api } from '../../lib/api';

type Dataset = {
  id: string;
  name: string;
  latest_version_no?: number;
};

type ImportRecipe = {
  id: string;
  name: string;
  description?: string | null;
  enabled: boolean;
  source_type: 'file_upload';
  target_mode: 'create_new_dataset' | 'append_to_dataset';
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
  source_type: 'file_upload';
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

type RecipeForm = {
  name: string;
  description: string;
  enabled: boolean;
  target_mode: 'create_new_dataset' | 'append_to_dataset';
  target_dataset_id: string;
  dataset_name_template: string;
};

const EMPTY_FORM: RecipeForm = {
  name: '',
  description: '',
  enabled: true,
  target_mode: 'create_new_dataset',
  target_dataset_id: '',
  dataset_name_template: '',
};

function recipeToForm(recipe: ImportRecipe): RecipeForm {
  return {
    name: recipe.name,
    description: recipe.description ?? '',
    enabled: recipe.enabled,
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

function summarizeRun(run: ImportRun): string {
  if (run.status === 'success' && run.dataset_version_id) return `Created ${run.dataset_version_id}`;
  if (run.status === 'failed') return 'Run failed';
  return run.parser_used ?? 'parser pending';
}

export function ImportsPage() {
  const [recipes, setRecipes] = useState<ImportRecipe[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState('');
  const [form, setForm] = useState<RecipeForm>(EMPTY_FORM);
  const [runs, setRuns] = useState<ImportRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState('');
  const [runDetail, setRunDetail] = useState<ImportRun | null>(null);
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
      return;
    }
    setForm(recipeToForm(selectedRecipe));
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

    const payload = {
      name: form.name,
      description: form.description || null,
      enabled: form.enabled,
      source_type: 'file_upload' as const,
      target_mode: form.target_mode,
      target_dataset_id: form.target_mode === 'append_to_dataset' ? (form.target_dataset_id || null) : null,
      dataset_name_template: form.target_mode === 'create_new_dataset' ? (form.dataset_name_template || null) : null,
      parser_options: {},
      transform_rules: {},
      preview_config: {},
    };

    try {
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
      await loadAll();
    } catch (err) {
      setError(String(err));
    }
  }

  async function onRun(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedRecipeId) return;
    const formEl = event.currentTarget;
    const formData = new FormData(formEl);
    const file = formData.get('file');
    if (!(file instanceof File)) return;

    setRunning(true);
    setError('');
    setMessage('');
    try {
      const payload = new FormData();
      payload.append('file', file);
      const response = await fetch(`/api/import-recipes/${selectedRecipeId}/run`, { method: 'POST', body: payload });
      const raw = await response.text();
      const body = raw ? JSON.parse(raw) : {};
      if (!response.ok) {
        throw new Error(typeof body?.detail === 'string' ? body.detail : raw || 'Run failed');
      }
      setMessage(body.message || 'Import recipe ran successfully');
      formEl.reset();
      await loadAll();
      await loadRuns(selectedRecipeId);
      if (typeof body?.run_id === 'string') {
        setSelectedRunId(body.run_id);
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
            <select value={form.target_mode} onChange={(event) => setForm((current) => ({ ...current, target_mode: event.target.value as RecipeForm['target_mode'] }))}>
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
            <div className="muted">MVP scope: file-backed recipes only. Parser selection is inferred from file extension.</div>
            <div className="row between wrap">
              {selectedRecipeId ? <button type="button" className="danger-button" onClick={() => void onDelete()}>Delete</button> : <span />}
              <button type="submit">{selectedRecipeId ? 'Save recipe' : 'Create recipe'}</button>
            </div>
          </form>
        </div>

        <div className="card">
          <h2>Run recipe</h2>
          {!selectedRecipe ? <p className="muted">Create or select a recipe first.</p> : (
            <form className="stack" onSubmit={onRun}>
              <div className="muted">Recipe: <strong>{selectedRecipe.name}</strong></div>
              <div className="muted">Mode: {selectedRecipe.target_mode === 'append_to_dataset' ? `append to ${selectedRecipe.target_dataset_name ?? selectedRecipe.target_dataset_id}` : `create new dataset (${selectedRecipe.dataset_name_template ?? selectedRecipe.name})`}</div>
              <input name="file" type="file" required />
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
                    <div><strong>File:</strong> {runDetail.original_filename ?? '—'}</div>
                    <div><strong>Parser:</strong> {runDetail.parser_used ?? '—'}</div>
                    <div><strong>Media type:</strong> {runDetail.media_type ?? '—'}</div>
                    <div><strong>Warnings:</strong> {runDetail.warning_count}</div>
                    {runDetail.dataset_id ? <div><strong>Dataset:</strong> {datasetNameById[runDetail.dataset_id] ?? runDetail.dataset_id} <span className="muted">({runDetail.dataset_id})</span></div> : null}
                    {runDetail.dataset_version_id ? <div><strong>Dataset version:</strong> {runDetail.dataset_version_id}</div> : null}
                    {runDetail.error_text ? <pre>{runDetail.error_text}</pre> : null}
                    <details open>
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
