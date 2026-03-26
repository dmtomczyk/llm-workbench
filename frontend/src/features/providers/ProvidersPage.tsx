import { Dispatch, FormEvent, SetStateAction, useEffect, useMemo, useState } from 'react';

import { api } from '../../lib/api';

type Provider = {
  id: string;
  name: string;
  kind: string;
  base_url?: string | null;
  default_model?: string | null;
  enabled?: boolean;
  spec_id?: string | null;
  operation_id?: string | null;
  invoke_method?: string | null;
  invoke_path?: string | null;
  auth_strategy?: { type?: string; secret_alias?: string | null; secret_configured?: boolean } | null;
  capabilities?: Record<string, unknown>;
  last_tested_at?: string | null;
  last_test_result?: { ok?: boolean; message?: string; [key: string]: unknown } | null;
};

type ProviderModelsResponse = {
  ok: boolean;
  provider_id: string;
  models: string[];
  source?: string | null;
  message?: string | null;
};

type ProviderModelCache = {
  models: string[];
  fetchedAt: number;
  message?: string | null;
};

type Spec = {
  id: string;
  name: string;
  source_type: string;
  operations: Array<{ operation_id: string; method: string; path: string }>;
};

type ProviderFormState = {
  name: string;
  kind: string;
  base_url: string;
  default_model: string;
  secret_alias: string;
  secret_value: string;
  clear_saved_secret: boolean;
  enabled: boolean;
  spec_id: string;
  operation_id: string;
  invoke_method: string;
  invoke_path: string;
  capabilities: Record<string, unknown>;
  contextWindow: string;
  maxOutputTokens: string;
};

const emptyProviderForm: ProviderFormState = {
  name: '',
  kind: 'openai_compatible',
  base_url: '',
  default_model: '',
  secret_alias: '',
  secret_value: '',
  clear_saved_secret: false,
  enabled: true,
  spec_id: '',
  operation_id: '',
  invoke_method: '',
  invoke_path: '',
  capabilities: {},
  contextWindow: '',
  maxOutputTokens: '',
};

function generatedSecretAlias(name: string): string {
  const slug = name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return `BRIDGE_${slug || 'PROVIDER'}_API_KEY`;
}

function getModelSettings(capabilities: Record<string, unknown> | undefined, model: string | null | undefined): { contextWindow: string; maxOutputTokens: string } {
  if (!capabilities || !model) return { contextWindow: '', maxOutputTokens: '' };
  const modelSettings = (capabilities.model_settings as Record<string, unknown> | undefined) ?? {};
  const settings = (modelSettings[model] as Record<string, unknown> | undefined) ?? {};
  return {
    contextWindow: settings.context_window ? String(settings.context_window) : '',
    maxOutputTokens: settings.max_output_tokens ? String(settings.max_output_tokens) : '',
  };
}

function applyModelSettings(form: ProviderFormState, model: string, contextWindow: string, maxOutputTokens: string): Record<string, unknown> {
  const nextCapabilities = { ...(form.capabilities ?? {}) } as Record<string, unknown>;
  const nextModelSettings = { ...((nextCapabilities.model_settings as Record<string, unknown> | undefined) ?? {}) };
  if (!model) {
    nextCapabilities.model_settings = nextModelSettings;
    return nextCapabilities;
  }
  const currentEntry = { ...((nextModelSettings[model] as Record<string, unknown> | undefined) ?? {}) };
  if (contextWindow.trim()) currentEntry.context_window = Number(contextWindow);
  else delete currentEntry.context_window;
  if (maxOutputTokens.trim()) currentEntry.max_output_tokens = Number(maxOutputTokens);
  else delete currentEntry.max_output_tokens;
  if (Object.keys(currentEntry).length > 0) nextModelSettings[model] = currentEntry;
  else delete nextModelSettings[model];
  nextCapabilities.model_settings = nextModelSettings;
  return nextCapabilities;
}

function toProviderForm(provider: Provider): ProviderFormState {
  const modelSettings = getModelSettings(provider.capabilities, provider.default_model);
  return {
    name: provider.name,
    kind: provider.kind,
    base_url: provider.base_url ?? '',
    default_model: provider.default_model ?? '',
    secret_alias: provider.auth_strategy?.secret_alias ?? '',
    secret_value: '',
    clear_saved_secret: false,
    enabled: provider.enabled ?? true,
    spec_id: provider.spec_id ?? '',
    operation_id: provider.operation_id ?? '',
    invoke_method: provider.invoke_method ?? '',
    invoke_path: provider.invoke_path ?? '',
    capabilities: provider.capabilities ?? {},
    contextWindow: modelSettings.contextWindow,
    maxOutputTokens: modelSettings.maxOutputTokens,
  };
}

function effectiveSecretAlias(form: ProviderFormState): string {
  return form.secret_alias.trim() || generatedSecretAlias(form.name);
}

function providerPayloadFromForm(form: ProviderFormState) {
  const genericOpenApi = form.kind === 'generic_openapi';
  const authStrategy = form.kind === 'mock'
    ? null
    : { type: 'bearer', secret_alias: effectiveSecretAlias(form) };
  const capabilities = applyModelSettings(form, form.default_model.trim(), form.contextWindow, form.maxOutputTokens);

  return {
    name: form.name.trim(),
    kind: form.kind,
    base_url: form.base_url.trim() || null,
    default_model: form.default_model.trim() || null,
    enabled: form.enabled,
    spec_id: genericOpenApi ? form.spec_id || null : null,
    operation_id: genericOpenApi ? form.operation_id.trim() || null : null,
    invoke_method: genericOpenApi ? form.invoke_method.trim() || null : null,
    invoke_path: genericOpenApi ? form.invoke_path.trim() || null : null,
    auth_strategy: authStrategy,
    secret_value: form.secret_value.trim() || null,
    clear_saved_secret: form.clear_saved_secret,
    capabilities,
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
        <option value="__none__">No default model</option>
        <option value="__custom__">Custom model…</option>
        {models.map((model) => (
          <option key={model} value={model}>{model}</option>
        ))}
      </select>
      {customMode ? (
        <input id={inputId} value={value} onChange={(event) => onChange(event.target.value)} placeholder={inputPlaceholder} />
      ) : null}
    </div>
  );
}

function CreateProviderFields({
  form,
  setForm,
  specs,
  mode,
  secretConfigured,
  modelChoices,
}: {
  form: ProviderFormState;
  setForm: Dispatch<SetStateAction<ProviderFormState>>;
  specs: Spec[];
  mode: 'create' | 'edit';
  secretConfigured?: boolean;
  modelChoices?: string[];
}) {
  const selectedSpec = specs.find((spec) => spec.id === form.spec_id) ?? null;
  const isGeneric = form.kind === 'generic_openapi';
  const isMock = form.kind === 'mock';
  const alias = effectiveSecretAlias(form);

  return (
    <>
      <input
        value={form.name}
        onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
        placeholder="gpt-oss-internal"
        required
      />
      <select
        value={form.kind}
        onChange={(event) => setForm((current) => ({ ...current, kind: event.target.value, spec_id: '', operation_id: '', invoke_method: '', invoke_path: '' }))}
      >
        <option value="openai_compatible">OpenAI-compatible</option>
        <option value="generic_openapi">Generic OpenAPI</option>
        <option value="mock">Mock / demo</option>
      </select>

      {!isMock ? (
        <input
          value={form.base_url}
          onChange={(event) => setForm((current) => ({ ...current, base_url: event.target.value }))}
          placeholder={isGeneric ? 'https://api.example.com' : 'https://llm.internal.example/v1'}
        />
      ) : null}

      <ModelPicker
        value={form.default_model}
        models={modelChoices ?? []}
        onChange={(value) => setForm((current) => {
          const modelSettings = getModelSettings(current.capabilities, value);
          return { ...current, default_model: value, contextWindow: modelSettings.contextWindow, maxOutputTokens: modelSettings.maxOutputTokens };
        })}
        selectId={mode === 'edit' ? 'provider-edit-model-select' : 'provider-create-model-select'}
        inputId={mode === 'edit' ? 'provider-edit-model-input' : 'provider-create-model-input'}
        inputPlaceholder={isMock ? 'mock-echo-v1' : 'Custom model'}
      />

      {!isMock ? (
        <>
          <div className="grid two-col">
            <input
              value={form.contextWindow}
              onChange={(event) => setForm((current) => ({ ...current, contextWindow: event.target.value }))}
              placeholder="Context window tokens (e.g. 128000)"
            />
            <input
              value={form.maxOutputTokens}
              onChange={(event) => setForm((current) => ({ ...current, maxOutputTokens: event.target.value }))}
              placeholder="Max output tokens (e.g. 4096)"
            />
          </div>
          <div className="muted">These limits are tracked per selected model and shown in chat.</div>
          <div className="muted">Token env var / saved-secret alias: <code>{alias}</code></div>
          <input
            type="password"
            value={form.secret_value}
            onChange={(event) => setForm((current) => ({ ...current, secret_value: event.target.value, clear_saved_secret: false }))}
            placeholder={mode === 'edit'
              ? (secretConfigured ? 'Enter new token to replace saved token' : 'Enter token to save securely for this provider')
              : 'Optional: save token now for this provider'}
          />
          {mode === 'edit' ? (
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={form.clear_saved_secret}
                onChange={(event) => setForm((current) => ({ ...current, clear_saved_secret: event.target.checked, secret_value: event.target.checked ? '' : current.secret_value }))}
              />
              <span>{secretConfigured ? 'Remove saved token' : 'Clear any previously saved token'}</span>
            </label>
          ) : null}
        </>
      ) : null}

      {isGeneric ? (
        <>
          <select
            value={form.spec_id}
            onChange={(event) => setForm((current) => ({ ...current, spec_id: event.target.value, operation_id: '' }))}
          >
            <option value="">No imported spec</option>
            {specs.map((spec) => (
              <option key={spec.id} value={spec.id}>{spec.name}</option>
            ))}
          </select>
          <select
            value={form.operation_id}
            onChange={(event) => setForm((current) => ({ ...current, operation_id: event.target.value }))}
            disabled={!selectedSpec}
          >
            <option value="">No bound operation</option>
            {(selectedSpec?.operations ?? []).map((operation) => (
              <option key={operation.operation_id} value={operation.operation_id}>
                {operation.method} {operation.path} · {operation.operation_id}
              </option>
            ))}
          </select>
          <input
            value={form.invoke_method}
            onChange={(event) => setForm((current) => ({ ...current, invoke_method: event.target.value }))}
            placeholder="POST"
          />
          <input
            value={form.invoke_path}
            onChange={(event) => setForm((current) => ({ ...current, invoke_path: event.target.value }))}
            placeholder="/responses"
          />
        </>
      ) : null}
    </>
  );
}

function modelWarning(model: string, models: string[]): string {
  if (!model || models.length === 0) return '';
  return models.includes(model) ? '' : 'Selected default model is not in the last fetched model list.';
}

export function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [createForm, setCreateForm] = useState<ProviderFormState>(emptyProviderForm);
  const [editProviderId, setEditProviderId] = useState<string>('');
  const [editForm, setEditForm] = useState<ProviderFormState>(emptyProviderForm);
  const [busyProviderId, setBusyProviderId] = useState<string>('');
  const [modelOptions, setModelOptions] = useState<Record<string, ProviderModelCache>>({});

  const editingProvider = useMemo(
    () => providers.find((provider) => provider.id === editProviderId) ?? null,
    [providers, editProviderId],
  );

  const createModelOptions = createForm.kind === 'openai_compatible' && createForm.base_url ? (modelOptions.__create__?.models ?? []) : [];
  const editModelOptions = editingProvider ? (modelOptions[editingProvider.id]?.models ?? []) : [];
  const createModelWarning = modelWarning(createForm.default_model, createModelOptions);
  const editModelWarning = modelWarning(editForm.default_model, editModelOptions);

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

  async function loadProviderModels(providerId: string, force = false) {
    const existing = modelOptions[providerId];
    const isFresh = existing && Date.now() - existing.fetchedAt < 5 * 60 * 1000;
    if (!force && isFresh) return existing.models;
    const result = await api<ProviderModelsResponse>(`/api/providers/${providerId}/models`);
    setModelOptions((current) => ({
      ...current,
      [providerId]: {
        models: result.models,
        fetchedAt: Date.now(),
        message: result.message,
      },
    }));
    return result.models;
  }

  useEffect(() => {
    void loadProviders();
  }, []);

  useEffect(() => {
    if (editingProvider?.id) {
      void loadProviderModels(editingProvider.id).catch(() => undefined);
    }
  }, [editingProvider?.id]);

  async function onProviderSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      await api('/api/providers', {
        method: 'POST',
        body: JSON.stringify(providerPayloadFromForm(createForm)),
      });
      setCreateForm(emptyProviderForm);
      setMessage('Provider created');
      await loadProviders();
    } catch (err) {
      setError(String(err));
    }
  }

  async function onSpecSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError('');
    setMessage('');
    try {
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
    } catch (err) {
      setError(String(err));
    }
  }

  function startEditing(provider: Provider) {
    setEditProviderId(provider.id);
    setEditForm(toProviderForm(provider));
    setMessage('');
    setError('');
  }

  function cancelEditing() {
    setEditProviderId('');
    setEditForm(emptyProviderForm);
  }

  async function onEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editProviderId) return;
    setError('');
    setMessage('');
    try {
      await api(`/api/providers/${editProviderId}`, {
        method: 'PATCH',
        body: JSON.stringify(providerPayloadFromForm(editForm)),
      });
      setMessage('Provider updated');
      await loadProviders();
      cancelEditing();
    } catch (err) {
      setError(String(err));
    }
  }

  async function onTestProvider(provider: Provider) {
    setBusyProviderId(provider.id);
    setError('');
    setMessage('');
    try {
      const result = await api<{ ok?: boolean; message?: string }>(`/api/providers/${provider.id}/test`, {
        method: 'POST',
      });
      await loadProviderModels(provider.id, true).catch(() => undefined);
      setMessage(`Tested ${provider.name}: ${result.message ?? (result.ok ? 'ok' : 'failed')}`);
      await loadProviders();
    } catch (err) {
      setError(String(err));
    } finally {
      setBusyProviderId('');
    }
  }

  async function onDeleteProvider(provider: Provider) {
    if (!window.confirm(`Delete provider "${provider.name}"?`)) return;
    setBusyProviderId(provider.id);
    setError('');
    setMessage('');
    try {
      await api(`/api/providers/${provider.id}`, { method: 'DELETE' });
      if (editProviderId === provider.id) cancelEditing();
      setMessage(`Deleted provider ${provider.name}`);
      await loadProviders();
    } catch (err) {
      setError(String(err));
    } finally {
      setBusyProviderId('');
    }
  }

  async function onLoadModels(provider: Provider) {
    setBusyProviderId(provider.id);
    setError('');
    setMessage('');
    try {
      const models = await loadProviderModels(provider.id, true);
      if (editProviderId === provider.id && models.length > 0 && !editForm.default_model) {
        setEditForm((current) => ({ ...current, default_model: models[0] ?? current.default_model }));
      }
      setMessage(`Loaded ${models.length} models for ${provider.name}`);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusyProviderId('');
    }
  }

  async function onPreviewCreateModels() {
    setError('');
    setMessage('');
    try {
      const result = await api<ProviderModelsResponse>('/api/providers/preview-models', {
        method: 'POST',
        body: JSON.stringify({
          kind: createForm.kind,
          base_url: createForm.base_url.trim() || null,
          auth_strategy: createForm.kind === 'mock' ? null : { type: 'bearer', secret_alias: effectiveSecretAlias(createForm) },
          secret_value: createForm.secret_value.trim() || null,
        }),
      });
      setModelOptions((current) => ({
        ...current,
        __create__: { models: result.models, fetchedAt: Date.now(), message: result.message },
      }));
      if (result.models.length > 0 && !createForm.default_model) {
        setCreateForm((current) => ({ ...current, default_model: result.models[0] ?? current.default_model }));
      }
      setMessage(result.message ?? `Loaded ${result.models.length} models from draft provider config`);
    } catch (err) {
      setError(String(err));
    }
  }

  return (
    <div className="stack">
      <div className="grid two-col">
        <div className="card">
          <h2>Add provider</h2>
          <p className="muted">Fresh installs are automatically seeded with <strong>demo-mock</strong> and <strong>ollama-local</strong>.</p>
          <p className="muted">For bearer auth, BRIDGE now generates the token env var name from the provider name. You can save the token directly here or set that env var externally.</p>
          <form className="stack" onSubmit={onProviderSubmit}>
            <CreateProviderFields form={createForm} setForm={setCreateForm} specs={specs} mode="create" modelChoices={createModelOptions} />
            <div className="row wrap">
              <button type="button" onClick={() => void onPreviewCreateModels()}>Preview models</button>
            </div>
            {createModelOptions.length > 0 ? <div className="muted">Models fetched {new Date(modelOptions.__create__?.fetchedAt ?? Date.now()).toLocaleTimeString()}</div> : null}
            {createModelWarning ? <div className="muted">{createModelWarning}</div> : null}
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
                <div className="stack">
                  <div className="row between wrap">
                    <div>
                      <strong>{provider.name}</strong>
                      <div className="muted">{provider.kind} · {provider.default_model ?? 'no model set'}</div>
                      {provider.default_model ? (() => {
                        const settings = getModelSettings(provider.capabilities, provider.default_model);
                        return settings.contextWindow || settings.maxOutputTokens ? <div className="muted">ctx {settings.contextWindow || '—'} · max out {settings.maxOutputTokens || '—'}</div> : null;
                      })() : null}
                      <div className="muted">{provider.base_url ?? 'no base URL'}{provider.enabled === false ? ' · disabled' : ''}</div>
                      {provider.auth_strategy?.secret_alias ? (
                        <div className="muted">Token alias: {provider.auth_strategy.secret_alias}{provider.auth_strategy.secret_configured ? ' · saved token present' : ''}</div>
                      ) : null}
                      {modelOptions[provider.id]?.fetchedAt ? (
                        <div className="muted">Model cache: {modelOptions[provider.id].models.length} models · fetched {new Date(modelOptions[provider.id].fetchedAt).toLocaleTimeString()}</div>
                      ) : null}
                      {provider.last_test_result ? (
                        <div className="muted">
                          Last test: {provider.last_test_result.ok ? 'ok' : 'failed'}
                          {provider.last_test_result.message ? ` · ${provider.last_test_result.message}` : ''}
                        </div>
                      ) : null}
                    </div>
                    <div className="row wrap">
                      <button type="button" onClick={() => startEditing(provider)}>Edit</button>
                      <button type="button" onClick={() => void onLoadModels(provider)} disabled={busyProviderId === provider.id}>
                        {busyProviderId === provider.id ? 'Loading…' : 'Models'}
                      </button>
                      <button type="button" onClick={() => void onTestProvider(provider)} disabled={busyProviderId === provider.id}>
                        {busyProviderId === provider.id ? 'Testing…' : 'Test'}
                      </button>
                      <button type="button" onClick={() => void onDeleteProvider(provider)} disabled={busyProviderId === provider.id} className="danger-button">
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
            {providers.length === 0 ? <li>No providers yet.</li> : null}
          </ul>
        </div>
        <div className="card">
          <h2>{editingProvider ? `Edit provider: ${editingProvider.name}` : 'Imported specs'}</h2>
          {editingProvider ? (
            <form className="stack" onSubmit={onEditSubmit}>
              <CreateProviderFields
                form={editForm}
                setForm={setEditForm}
                specs={specs}
                mode="edit"
                secretConfigured={Boolean(editingProvider?.auth_strategy?.secret_configured)}
                modelChoices={editModelOptions}
              />
              {editModelOptions.length > 0 ? <div className="muted">Models fetched {new Date(modelOptions[editingProvider.id]?.fetchedAt ?? Date.now()).toLocaleTimeString()}</div> : null}
              {editModelWarning ? <div className="muted">{editModelWarning}</div> : null}
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={editForm.enabled}
                  onChange={(event) => setEditForm((current) => ({ ...current, enabled: event.target.checked }))}
                />
                <span>Enabled</span>
              </label>
              <div className="row between wrap">
                <button type="button" onClick={cancelEditing}>Cancel</button>
                <button type="submit">Save provider</button>
              </div>
            </form>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}
