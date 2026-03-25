import { FormEvent, useEffect, useState } from 'react';

import { api } from '../../lib/api';

type Provider = {
  id: string;
  name: string;
  kind: string;
  base_url?: string;
  default_model?: string;
};

type Spec = {
  id: string;
  name: string;
  source_type: string;
  operations: Array<{ operation_id: string; method: string; path: string }>;
};

export function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');

  async function loadProviders() {
    try {
      const [providerData, specData] = await Promise.all([
        api<Provider[]>('/api/providers'),
        api<Spec[]>('/api/openapi/specs').catch(() => []),
      ]);
      setProviders(providerData);
      setSpecs(specData);
      setError('');
    } catch (err) {
      setError(String(err));
    }
  }

  useEffect(() => {
    void loadProviders();
  }, []);

  async function onProviderSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await api('/api/providers', {
      method: 'POST',
      body: JSON.stringify({
        name: form.get('name'),
        kind: form.get('kind'),
        base_url: form.get('base_url') || undefined,
        default_model: form.get('default_model') || undefined,
        auth_strategy: form.get('secret_alias')
          ? { type: 'bearer', secret_alias: form.get('secret_alias') }
          : undefined,
      }),
    });
    event.currentTarget.reset();
    setMessage('Provider created');
    await loadProviders();
  }

  async function onSpecSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await api('/api/openapi/specs/import', {
      method: 'POST',
      body: JSON.stringify({
        name: form.get('name'),
        source_type: form.get('source_type'),
        source: form.get('source'),
      }),
    });
    event.currentTarget.reset();
    setMessage('OpenAPI spec imported');
    await loadProviders();
  }

  return (
    <div className="stack">
      <div className="grid two-col">
        <div className="card">
          <h2>Add provider</h2>
          <p className="muted">Fresh installs are automatically seeded with <strong>demo-mock</strong> and <strong>ollama-local</strong>.</p>
          <form className="stack" onSubmit={onProviderSubmit}>
            <input name="name" placeholder="gpt-oss-internal" required />
            <select name="kind" defaultValue="openai_compatible">
              <option value="openai_compatible">OpenAI-compatible</option>
              <option value="generic_openapi">Generic OpenAPI</option>
              <option value="mock">Mock / demo</option>
            </select>
            <input name="base_url" placeholder="https://llm.internal.example/v1" />
            <input name="default_model" placeholder="openai/gpt-oss-120b" />
            <input name="secret_alias" placeholder="LLM_API_TOKEN" />
            <button type="submit">Create provider</button>
          </form>
        </div>
        <div className="card">
          <h2>Import OpenAPI spec</h2>
          <form className="stack" onSubmit={onSpecSubmit}>
            <input name="name" placeholder="Internal GPT OSS Spec" required />
            <select name="source_type" defaultValue="url">
              <option value="url">URL</option>
              <option value="raw_text">Raw text</option>
              <option value="file_path">File path</option>
            </select>
            <textarea name="source" placeholder="https://internal.example/spec.json or raw OpenAPI text" rows={6} required />
            <button type="submit">Import spec</button>
          </form>
        </div>
      </div>

      <div className="grid two-col">
        <div className="card">
          <div className="row between">
            <h2>Configured providers</h2>
            {message ? <span className="muted">{message}</span> : null}
          </div>
          {error ? <p>{error}</p> : null}
          <ul className="list">
            {providers.map((provider) => (
              <li key={provider.id}>
                <strong>{provider.name}</strong>
                <div className="muted">{provider.kind} · {provider.default_model ?? 'no model set'}</div>
              </li>
            ))}
            {providers.length === 0 ? <li>No providers yet.</li> : null}
          </ul>
        </div>
        <div className="card">
          <h2>Imported specs</h2>
          <ul className="list">
            {specs.map((spec) => (
              <li key={spec.id}>
                <strong>{spec.name}</strong>
                <div className="muted">{spec.source_type} · {spec.operations.length} operations</div>
                <div className="muted">{spec.operations.slice(0, 2).map((operation) => `${operation.method} ${operation.path}`).join(' · ')}</div>
              </li>
            ))}
            {specs.length === 0 ? <li>No specs imported yet.</li> : null}
          </ul>
        </div>
      </div>
    </div>
  );
}
