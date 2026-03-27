import { FormEvent, useEffect, useMemo, useState } from 'react';

import { api } from '../../lib/api';

type Automation = {
  id: string;
  name: string;
  enabled: boolean;
  schedule_type: 'interval' | 'at' | 'daily';
  interval_seconds?: number | null;
  run_at?: string | null;
  time_of_day?: string | null;
  timezone: string;
  target_type: 'workflow' | 'custom_prompt' | 'template_prompt';
  workflow_id?: string | null;
  provider_id?: string | null;
  template_id?: string | null;
  dataset_id?: string | null;
  model?: string | null;
  system_prompt?: string | null;
  prompt_text?: string | null;
  variables: Record<string, unknown>;
  last_run_at?: string | null;
  next_run_at?: string | null;
};

type Workflow = { id: string; name: string };
type Provider = { id: string; name: string; default_model?: string | null };
type Template = { id: string; name: string; slug?: string };
type Dataset = { id: string; name: string };
type AutomationRun = { id: string; status: string; summary?: string | null; error_text?: string | null; created_at: string };
type AutomationRunDetail = {
  ok: boolean;
  run: AutomationRun & { started_at?: string | null; finished_at?: string | null };
  steps: Array<{ id: string; step_index: number; step_name: string; status: string; error_text?: string | null; input_json?: unknown; output_json?: unknown }>;
};

type FormState = {
  name: string;
  enabled: boolean;
  schedule_type: 'interval' | 'at' | 'daily';
  interval_seconds: string;
  interval_unit: 'minutes' | 'hours' | 'days';
  interval_value: string;
  run_at: string;
  time_of_day: string;
  timezone: string;
  target_type: 'workflow' | 'custom_prompt' | 'template_prompt';
  workflow_id: string;
  provider_id: string;
  template_id: string;
  dataset_id: string;
  model: string;
  system_prompt: string;
  prompt_text: string;
  variablesText: string;
};

const emptyForm: FormState = {
  name: '',
  enabled: true,
  schedule_type: 'interval',
  interval_seconds: '3600',
  interval_unit: 'hours',
  interval_value: '1',
  run_at: '',
  time_of_day: '09:00',
  timezone: 'America/New_York',
  target_type: 'workflow',
  workflow_id: '',
  provider_id: '',
  template_id: '',
  dataset_id: '',
  model: '',
  system_prompt: '',
  prompt_text: '',
  variablesText: '{}',
};

function toIntervalParts(seconds: number | null | undefined): Pick<FormState, 'interval_seconds' | 'interval_unit' | 'interval_value'> {
  const value = seconds ?? 3600;
  if (value % 86400 === 0) return { interval_seconds: String(value), interval_unit: 'days', interval_value: String(value / 86400) };
  if (value % 3600 === 0) return { interval_seconds: String(value), interval_unit: 'hours', interval_value: String(value / 3600) };
  return { interval_seconds: String(value), interval_unit: 'minutes', interval_value: String(Math.max(1, Math.round(value / 60))) };
}

function secondsFromParts(value: string, unit: FormState['interval_unit']): number {
  const count = Number(value || '0');
  if (unit === 'days') return count * 86400;
  if (unit === 'hours') return count * 3600;
  return count * 60;
}

function toForm(row: Automation): FormState {
  const interval = toIntervalParts(row.interval_seconds);
  return {
    name: row.name,
    enabled: row.enabled,
    schedule_type: row.schedule_type,
    interval_seconds: interval.interval_seconds,
    interval_unit: interval.interval_unit,
    interval_value: interval.interval_value,
    run_at: row.run_at ?? '',
    time_of_day: row.time_of_day ?? '09:00',
    timezone: row.timezone,
    target_type: row.target_type,
    workflow_id: row.workflow_id ?? '',
    provider_id: row.provider_id ?? '',
    template_id: row.template_id ?? '',
    dataset_id: row.dataset_id ?? '',
    model: row.model ?? '',
    system_prompt: row.system_prompt ?? '',
    prompt_text: row.prompt_text ?? '',
    variablesText: JSON.stringify(row.variables ?? {}, null, 2),
  };
}

function payloadFromForm(form: FormState) {
  const intervalSeconds = secondsFromParts(form.interval_value, form.interval_unit);
  return {
    name: form.name,
    enabled: form.enabled,
    schedule_type: form.schedule_type,
    interval_seconds: form.schedule_type === 'interval' ? intervalSeconds : null,
    run_at: form.schedule_type === 'at' ? (form.run_at || null) : null,
    time_of_day: form.schedule_type === 'daily' ? (form.time_of_day || null) : null,
    timezone: form.timezone,
    target_type: form.target_type,
    workflow_id: form.target_type === 'workflow' ? (form.workflow_id || null) : null,
    provider_id: form.target_type !== 'workflow' ? (form.provider_id || null) : null,
    template_id: form.target_type === 'template_prompt' ? (form.template_id || null) : null,
    dataset_id: form.target_type === 'template_prompt' ? (form.dataset_id || null) : null,
    model: form.model || null,
    system_prompt: form.target_type !== 'workflow' ? (form.system_prompt || null) : null,
    prompt_text: form.target_type === 'custom_prompt' ? (form.prompt_text || null) : null,
    variables: form.variablesText ? JSON.parse(form.variablesText) : {},
  };
}

function prettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [selectedRunId, setSelectedRunId] = useState('');
  const [form, setForm] = useState<FormState>(emptyForm);
  const [runs, setRuns] = useState<AutomationRun[]>([]);
  const [runDetail, setRunDetail] = useState<AutomationRunDetail | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const selected = useMemo(() => automations.find((item) => item.id === selectedId) ?? null, [automations, selectedId]);

  async function loadAll() {
    const [automationData, workflowData, providerData, templateData, datasetData] = await Promise.all([
      api<Automation[]>('/api/automations').catch(() => []),
      api<Workflow[]>('/api/workflows').catch(() => []),
      api<Provider[]>('/api/providers').catch(() => []),
      api<Template[]>('/api/templates').catch(() => []),
      api<Dataset[]>('/api/datasets').catch(() => []),
    ]);
    setAutomations(automationData);
    setWorkflows(workflowData);
    setProviders(providerData);
    setTemplates(templateData);
    setDatasets(datasetData);

    const search = new URLSearchParams(window.location.search);
    const targetType = search.get('target_type') as FormState['target_type'] | null;
    const workflowId = search.get('workflow_id') || '';
    const providerId = search.get('provider_id') || '';
    const templateId = search.get('template_id') || '';
    const datasetId = search.get('dataset_id') || '';
    const model = search.get('model') || '';

    setSelectedId((current) => current || automationData[0]?.id || '');
    setForm((current) => ({
      ...current,
      target_type: targetType || current.target_type,
      workflow_id: workflowId || current.workflow_id,
      provider_id: providerId || current.provider_id,
      template_id: templateId || current.template_id,
      dataset_id: datasetId || current.dataset_id,
      model: model || current.model,
    }));
  }

  async function loadRuns(automationId: string) {
    if (!automationId) {
      setRuns([]);
      return;
    }
    const data = await api<{ runs: AutomationRun[] }>(`/api/automations/${automationId}/runs`).catch(() => ({ runs: [] }));
    setRuns(data.runs);
  }

  async function loadRunDetail(runId: string) {
    if (!runId) {
      setRunDetail(null);
      return;
    }
    const data = await api<AutomationRunDetail>(`/api/automation-runs/${runId}`).catch(() => null);
    setRunDetail(data);
  }

  useEffect(() => {
    void loadAll();
  }, []);

  useEffect(() => {
    if (!selected) {
      setForm(emptyForm);
      setRuns([]);
      setSelectedRunId('');
      setRunDetail(null);
      return;
    }
    setForm(toForm(selected));
    void loadRuns(selected.id);
  }, [selected]);

  useEffect(() => {
    if (selectedRunId) void loadRunDetail(selectedRunId);
    else setRunDetail(null);
  }, [selectedRunId]);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      await api('/api/automations', { method: 'POST', body: JSON.stringify(payloadFromForm(form)) });
      setMessage('Automation created');
      setForm(emptyForm);
      await loadAll();
    } catch (err) {
      setError(String(err));
    }
  }

  async function onSave() {
    if (!selectedId) return;
    setError('');
    setMessage('');
    try {
      await api(`/api/automations/${selectedId}`, { method: 'PATCH', body: JSON.stringify(payloadFromForm(form)) });
      setMessage('Automation updated');
      await loadAll();
    } catch (err) {
      setError(String(err));
    }
  }

  async function onDelete() {
    if (!selectedId) return;
    if (!window.confirm('Delete this automation?')) return;
    setError('');
    setMessage('');
    try {
      await api(`/api/automations/${selectedId}`, { method: 'DELETE' });
      setSelectedId('');
      setMessage('Automation deleted');
      await loadAll();
    } catch (err) {
      setError(String(err));
    }
  }

  async function onRunNow() {
    if (!selectedId) return;
    setError('');
    setMessage('');
    try {
      const result = await api<{ run_id: string; status: string }>(`/api/automations/${selectedId}/run`, { method: 'POST' });
      setMessage(`Automation ran: ${result.run_id} (${result.status})`);
      await loadAll();
      await loadRuns(selectedId);
      setSelectedRunId(result.run_id);
    } catch (err) {
      setError(String(err));
    }
  }

  return (
    <div className="grid two-col">
      <div className="stack">
        <div className="card">
          <div className="row between">
            <h2>Automations</h2>
            {message ? <span className="muted">{message}</span> : null}
          </div>
          {error ? <pre>{error}</pre> : null}
          <ul className="list">
            {automations.length === 0 ? <li>No automations yet.</li> : automations.map((item) => (
              <li key={item.id}>
                <button type="button" className={selectedId === item.id ? 'session-button active' : 'session-button'} onClick={() => setSelectedId(item.id)}>
                  <strong>{item.name}</strong>
                  <div className="muted">{item.schedule_type} · {item.target_type} · {item.enabled ? 'enabled' : 'disabled'}</div>
                  <div className="muted">next: {item.next_run_at ?? '—'}</div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="stack">
        <div className="card">
          <h2>{selected ? 'Edit automation' : 'Create automation'}</h2>
          <div className="row wrap">
            {form.workflow_id ? <a className="button-link" href={`/workflows?workflow_id=${encodeURIComponent(form.workflow_id)}`}>Open workflow</a> : null}
            {form.dataset_id ? <a className="button-link" href={`/workbench?dataset_id=${encodeURIComponent(form.dataset_id)}&provider_id=${encodeURIComponent(form.provider_id)}&template_id=${encodeURIComponent(form.template_id)}&model=${encodeURIComponent(form.model)}`}>Open in Workbench</a> : null}
          </div>
          <form className="stack" onSubmit={selected ? (event) => { event.preventDefault(); void onSave(); } : onCreate}>
            <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Nightly summary" required />
            <label className="checkbox-row">
              <input type="checkbox" checked={form.enabled} onChange={(event) => setForm((current) => ({ ...current, enabled: event.target.checked }))} />
              <span>Enabled</span>
            </label>
            <select value={form.schedule_type} onChange={(event) => setForm((current) => ({ ...current, schedule_type: event.target.value as FormState['schedule_type'] }))}>
              <option value="interval">Every interval</option>
              <option value="daily">Daily at time</option>
              <option value="at">One-time at timestamp</option>
            </select>
            {form.schedule_type === 'interval' ? (
              <div className="row wrap">
                <input value={form.interval_value} onChange={(event) => setForm((current) => ({ ...current, interval_value: event.target.value }))} placeholder="1" />
                <select value={form.interval_unit} onChange={(event) => setForm((current) => ({ ...current, interval_unit: event.target.value as FormState['interval_unit'] }))}>
                  <option value="minutes">minutes</option>
                  <option value="hours">hours</option>
                  <option value="days">days</option>
                </select>
              </div>
            ) : null}
            {form.schedule_type === 'daily' ? (
              <>
                <input value={form.time_of_day} onChange={(event) => setForm((current) => ({ ...current, time_of_day: event.target.value }))} placeholder="09:00" />
                <input value={form.timezone} onChange={(event) => setForm((current) => ({ ...current, timezone: event.target.value }))} placeholder="America/New_York" />
              </>
            ) : null}
            {form.schedule_type === 'at' ? (
              <input value={form.run_at} onChange={(event) => setForm((current) => ({ ...current, run_at: event.target.value }))} placeholder="2026-03-26T09:00:00+00:00" />
            ) : null}

            <select value={form.target_type} onChange={(event) => setForm((current) => ({ ...current, target_type: event.target.value as FormState['target_type'] }))}>
              <option value="workflow">Workflow</option>
              <option value="custom_prompt">Raw custom prompt</option>
              <option value="template_prompt">Template-backed prompt</option>
            </select>
            {form.target_type === 'workflow' ? (
              <select value={form.workflow_id} onChange={(event) => setForm((current) => ({ ...current, workflow_id: event.target.value }))}>
                <option value="">Select workflow</option>
                {workflows.map((workflow) => <option key={workflow.id} value={workflow.id}>{workflow.name}</option>)}
              </select>
            ) : null}
            {form.target_type !== 'workflow' ? (
              <>
                <select value={form.provider_id} onChange={(event) => setForm((current) => ({ ...current, provider_id: event.target.value }))}>
                  <option value="">Select provider</option>
                  {providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
                </select>
                <input value={form.model} onChange={(event) => setForm((current) => ({ ...current, model: event.target.value }))} placeholder="Optional model override" />
                <textarea value={form.system_prompt} onChange={(event) => setForm((current) => ({ ...current, system_prompt: event.target.value }))} rows={3} placeholder="Optional system prompt" />
              </>
            ) : null}
            {form.target_type === 'custom_prompt' ? (
              <textarea value={form.prompt_text} onChange={(event) => setForm((current) => ({ ...current, prompt_text: event.target.value }))} rows={5} placeholder="Prompt to send on each run" />
            ) : null}
            {form.target_type === 'template_prompt' ? (
              <>
                <select value={form.template_id} onChange={(event) => setForm((current) => ({ ...current, template_id: event.target.value }))}>
                  <option value="">Select template</option>
                  {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                </select>
                <select value={form.dataset_id} onChange={(event) => setForm((current) => ({ ...current, dataset_id: event.target.value }))}>
                  <option value="">No dataset</option>
                  {datasets.map((dataset) => <option key={dataset.id} value={dataset.id}>{dataset.name}</option>)}
                </select>
              </>
            ) : null}
            <textarea value={form.variablesText} onChange={(event) => setForm((current) => ({ ...current, variablesText: event.target.value }))} rows={5} placeholder='{"team_name":"Platform"}' />
            <div className="row between wrap">
              {selected ? <button type="button" className="danger-button" onClick={onDelete}>Delete</button> : <span />}
              <button type="submit">{selected ? 'Save automation' : 'Create automation'}</button>
            </div>
          </form>
        </div>

        <div className="card">
          <div className="row between wrap">
            <h2>Runs</h2>
            <button type="button" onClick={() => void onRunNow()} disabled={!selectedId}>Run now</button>
          </div>
          {!selected ? <p className="muted">Select an automation to inspect run history.</p> : (
            <ul className="list">
              {runs.length === 0 ? <li>No runs yet.</li> : runs.map((run) => (
                <li key={run.id}>
                  <button type="button" className={selectedRunId === run.id ? 'session-button active' : 'session-button'} onClick={() => setSelectedRunId(run.id)}>
                    <strong>{run.status}</strong>
                    <div className="muted">{run.id}</div>
                    <div className="muted">{run.summary ?? run.error_text ?? 'No summary'}</div>
                    <div className="muted">{run.created_at}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h2>Run detail</h2>
          {!runDetail ? <p className="muted">Select a run to inspect recorded steps and outputs.</p> : (
            <div className="stack">
              <div><strong>Run:</strong> {runDetail.run.id}</div>
              <div><strong>Status:</strong> {runDetail.run.status}</div>
              {runDetail.run.summary ? <div><strong>Summary:</strong> {runDetail.run.summary}</div> : null}
              {runDetail.run.error_text ? <pre>{runDetail.run.error_text}</pre> : null}
              <details open>
                <summary>Steps</summary>
                <ul className="list">
                  {runDetail.steps.map((step) => (
                    <li key={step.id}>
                      <strong>{step.step_index}. {step.step_name}</strong>
                      <div className="muted">{step.status}{step.error_text ? ` · ${step.error_text}` : ''}</div>
                      <details>
                        <summary>Payloads</summary>
                        <pre>{prettyJson({ input: step.input_json, output: step.output_json })}</pre>
                      </details>
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
