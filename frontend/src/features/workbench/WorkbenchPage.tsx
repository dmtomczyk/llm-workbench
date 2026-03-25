import { FormEvent, useEffect, useState } from 'react';

import { api } from '../../lib/api';

type Dataset = { id: string; name: string; latest_version?: { row_count?: number } };
type Provider = { id: string; name: string };
type Template = { id: string; name: string; slug: string };

type WorkbenchResult = {
  run_id: string;
  rendered_prompt: { system_prompt?: string; user_prompt: string };
  provider_result: { summary: string; status: string; payload?: { items?: Array<{ text?: string; name?: string }> } };
};

export function WorkbenchPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [result, setResult] = useState<WorkbenchResult | null>(null);
  const [error, setError] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  async function loadAll() {
    const [datasetData, providerData, templateData] = await Promise.all([
      api<Dataset[]>('/api/datasets').catch(() => []),
      api<Provider[]>('/api/providers').catch(() => []),
      api<Template[]>('/api/templates').catch(() => []),
    ]);
    setDatasets(datasetData);
    setProviders(providerData);
    setTemplates(templateData);
  }

  useEffect(() => {
    void loadAll();
  }, []);

  async function onUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
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
      event.currentTarget.reset();
    } catch (err) {
      setError(String(err));
    } finally {
      setUploading(false);
    }
  }

  async function onRun(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError('');
    try {
      const data = await api<WorkbenchResult>('/api/workbench/run', {
        method: 'POST',
        body: JSON.stringify({
          dataset_id: form.get('dataset_id'),
          provider_id: form.get('provider_id'),
          template_id: form.get('template_id'),
          model: form.get('model') || undefined,
          variables: form.get('variables') ? JSON.parse(String(form.get('variables'))) : {},
        }),
      });
      setResult(data);
    } catch (err) {
      setError(String(err));
    }
  }

  return (
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
          <form className="stack" onSubmit={onRun}>
            <select name="dataset_id" required defaultValue="">
              <option value="" disabled>Select dataset</option>
              {datasets.map((dataset) => <option key={dataset.id} value={dataset.id}>{dataset.name}</option>)}
            </select>
            <select name="provider_id" required defaultValue="">
              <option value="" disabled>Select provider</option>
              {providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
            </select>
            <select name="template_id" required defaultValue={templates[0]?.id ?? ''}>
              {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
            </select>
            <input name="model" placeholder="Optional model override" />
            <textarea name="variables" placeholder='Optional JSON variables, e.g. {"team_name":"Platform"}' rows={5} />
            <button type="submit">Run</button>
          </form>
          {error ? <p>{error}</p> : null}
        </div>
      </div>

      <div className="stack">
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

        <div className="card">
          <h2>Output</h2>
          {!result ? <p className="muted">Run a dataset through a template and provider to see output here.</p> : (
            <div className="stack">
              <div>
                <strong>Run:</strong> {result.run_id}
              </div>
              <div>
                <strong>Status:</strong> {result.provider_result.status}
              </div>
              <div>
                <strong>Summary:</strong> {result.provider_result.summary}
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
      </div>
    </div>
  );
}
