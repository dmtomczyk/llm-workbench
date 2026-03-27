import { FormEvent, useEffect, useMemo, useState } from 'react';

import { api } from '../../lib/api';

type Workflow = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  definition: { steps?: WorkflowStep[] };
  enabled: boolean;
  version_no: number;
};

type Dataset = { id: string; name: string };
type Provider = { id: string; name: string; default_model?: string | null };
type Template = { id: string; name: string; slug: string };

type PromptTemplateStep = {
  type: 'prompt_template';
  name?: string;
  result_key?: string;
  template_id?: string;
  dataset_id?: string;
  user_prompt_override?: string;
  system_prompt_override?: string;
  variables?: Record<string, unknown>;
};

type LlmProviderStep = {
  type: 'llm_provider';
  name?: string;
  result_key?: string;
  prompt_ref?: string;
  provider_id?: string;
  model?: string;
};

type WorkflowStep = PromptTemplateStep | LlmProviderStep;

type WorkflowRunResponse = {
  ok: boolean;
  run_id: string;
  workflow_id: string;
  status: string;
  outputs: Record<string, unknown>;
};

type WorkflowRunStatus = {
  ok: boolean;
  run: { id: string; status: string; summary?: string | null; error_text?: string | null };
  steps: Array<{ id: string; step_index: number; step_name: string; status: string; error_text?: string | null }>;
  outputs: Record<string, unknown>;
};

const starterDefinition: { steps: WorkflowStep[] } = {
  steps: [
    {
      type: 'prompt_template',
      name: 'Render prompt',
      result_key: 'prompt',
      template_id: '',
      dataset_id: '',
      variables: {},
    },
    {
      type: 'llm_provider',
      name: 'Call provider',
      result_key: 'llm',
      prompt_ref: 'prompt',
      provider_id: '',
      model: '',
    },
  ],
};

function prettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function parseDefinition(text: string): { steps?: WorkflowStep[] } {
  return JSON.parse(text) as { steps?: WorkflowStep[] };
}

function normalizeSteps(text: string): WorkflowStep[] {
  try {
    const parsed = parseDefinition(text);
    return Array.isArray(parsed.steps) ? parsed.steps : [];
  } catch {
    return [];
  }
}

function stepLabel(step: WorkflowStep, index: number): string {
  return step.name || `${index + 1}. ${step.type}`;
}

function WorkflowStepEditor({
  step,
  index,
  datasets,
  providers,
  templates,
  onChange,
  onMove,
  onRemove,
}: {
  step: WorkflowStep;
  index: number;
  datasets: Dataset[];
  providers: Provider[];
  templates: Template[];
  onChange: (index: number, step: WorkflowStep) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <details open>
      <summary>{stepLabel(step, index)}</summary>
      <div className="stack">
        <input value={step.name ?? ''} onChange={(event) => onChange(index, { ...step, name: event.target.value })} placeholder="Step name" />
        <input value={step.result_key ?? ''} onChange={(event) => onChange(index, { ...step, result_key: event.target.value })} placeholder="Result key" />

        {step.type === 'prompt_template' ? (
          <>
            <select value={step.template_id ?? ''} onChange={(event) => onChange(index, { ...step, template_id: event.target.value })}>
              <option value="">Select template</option>
              {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
            </select>
            <select value={step.dataset_id ?? ''} onChange={(event) => onChange(index, { ...step, dataset_id: event.target.value })}>
              <option value="">Select dataset</option>
              {datasets.map((dataset) => <option key={dataset.id} value={dataset.id}>{dataset.name}</option>)}
            </select>
            <textarea
              value={prettyJson(step.variables ?? {})}
              onChange={(event) => {
                try {
                  onChange(index, { ...step, variables: JSON.parse(event.target.value) });
                } catch {
                  // keep invalid edits in JSON panel instead of exploding here
                }
              }}
              rows={4}
              placeholder='{"team_name":"Platform"}'
            />
            <textarea value={step.system_prompt_override ?? ''} onChange={(event) => onChange(index, { ...step, system_prompt_override: event.target.value })} rows={3} placeholder="Optional system prompt override" />
            <textarea value={step.user_prompt_override ?? ''} onChange={(event) => onChange(index, { ...step, user_prompt_override: event.target.value })} rows={4} placeholder="Optional user prompt override" />
          </>
        ) : null}

        {step.type === 'llm_provider' ? (
          <>
            <select value={step.provider_id ?? ''} onChange={(event) => onChange(index, { ...step, provider_id: event.target.value })}>
              <option value="">Select provider</option>
              {providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
            </select>
            <input value={step.prompt_ref ?? ''} onChange={(event) => onChange(index, { ...step, prompt_ref: event.target.value })} placeholder="Prompt ref (usually prompt)" />
            <input value={step.model ?? ''} onChange={(event) => onChange(index, { ...step, model: event.target.value })} placeholder="Optional model override" />
          </>
        ) : null}

        <div className="row wrap">
          <button type="button" onClick={() => onMove(index, -1)} disabled={index === 0}>Move up</button>
          <button type="button" onClick={() => onMove(index, 1)}>Move down</button>
          <button type="button" onClick={() => onRemove(index)} className="danger-button">Remove step</button>
        </div>
      </div>
    </details>
  );
}

export function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState('');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [definitionText, setDefinitionText] = useState(JSON.stringify(starterDefinition, null, 2));
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [runDatasetId, setRunDatasetId] = useState('');
  const [runProviderId, setRunProviderId] = useState('');
  const [runTemplateId, setRunTemplateId] = useState('');
  const [runModel, setRunModel] = useState('');
  const [runVariablesText, setRunVariablesText] = useState('{}');
  const [runResult, setRunResult] = useState<WorkflowRunResponse | null>(null);
  const [runStatus, setRunStatus] = useState<WorkflowRunStatus | null>(null);
  const [running, setRunning] = useState(false);
  const [definitionError, setDefinitionError] = useState('');

  const selectedWorkflow = useMemo(
    () => workflows.find((workflow) => workflow.id === selectedWorkflowId) ?? null,
    [workflows, selectedWorkflowId],
  );
  const workflowSteps = useMemo(() => normalizeSteps(definitionText), [definitionText]);

  function setSteps(nextSteps: WorkflowStep[]) {
    try {
      const parsed = parseDefinition(definitionText);
      setDefinitionText(prettyJson({ ...parsed, steps: nextSteps }));
      setDefinitionError('');
    } catch {
      setDefinitionText(prettyJson({ steps: nextSteps }));
      setDefinitionError('');
    }
  }

  async function loadAll() {
    const [workflowData, datasetData, providerData, templateData] = await Promise.all([
      api<Workflow[]>('/api/workflows').catch(() => []),
      api<Dataset[]>('/api/datasets').catch(() => []),
      api<Provider[]>('/api/providers').catch(() => []),
      api<Template[]>('/api/templates').catch(() => []),
    ]);
    setWorkflows(workflowData);
    setDatasets(datasetData);
    setProviders(providerData);
    setTemplates(templateData);

    const search = new URLSearchParams(window.location.search);
    const workflowParam = search.get('workflow_id') || '';
    const datasetParam = search.get('dataset_id') || '';
    const providerParam = search.get('provider_id') || '';
    const templateParam = search.get('template_id') || '';
    const modelParam = search.get('model') || '';

    setSelectedWorkflowId((current) => current || workflowParam || workflowData[0]?.id || '');
    setRunDatasetId((current) => current || datasetParam || '');
    setRunProviderId((current) => current || providerParam || '');
    setRunTemplateId((current) => current || templateParam || '');
    setRunModel((current) => current || modelParam || '');
  }

  useEffect(() => {
    void loadAll();
  }, []);

  useEffect(() => {
    if (!selectedWorkflow) {
      setName('');
      setSlug('');
      setDescription('');
      setEnabled(true);
      setDefinitionText(JSON.stringify(starterDefinition, null, 2));
      setDefinitionError('');
      return;
    }
    setName(selectedWorkflow.name);
    setSlug(selectedWorkflow.slug);
    setDescription(selectedWorkflow.description ?? '');
    setEnabled(selectedWorkflow.enabled);
    setDefinitionText(prettyJson(selectedWorkflow.definition));
    setDefinitionError('');
  }, [selectedWorkflow]);

  useEffect(() => {
    if (!running || !runResult?.run_id) return;
    const interval = window.setInterval(async () => {
      try {
        const status = await api<WorkflowRunStatus>(`/api/workflow-runs/${runResult.run_id}`);
        setRunStatus(status);
        if (status.run.status !== 'running') setRunning(false);
      } catch {
        // ignore transient polling failures
      }
    }, 2000);
    return () => window.clearInterval(interval);
  }, [running, runResult?.run_id]);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      await api('/api/workflows', {
        method: 'POST',
        body: JSON.stringify({
          name,
          slug,
          description: description || null,
          enabled,
          definition: JSON.parse(definitionText),
        }),
      });
      setMessage('Workflow created');
      await loadAll();
    } catch (err) {
      setError(String(err));
    }
  }

  async function onSave() {
    if (!selectedWorkflowId) return;
    setError('');
    setMessage('');
    try {
      await api(`/api/workflows/${selectedWorkflowId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name,
          slug,
          description: description || null,
          enabled,
          definition: JSON.parse(definitionText),
        }),
      });
      setMessage('Workflow updated');
      await loadAll();
    } catch (err) {
      setError(String(err));
    }
  }

  async function onDelete() {
    if (!selectedWorkflowId) return;
    if (!window.confirm('Delete this workflow?')) return;
    setError('');
    setMessage('');
    try {
      await api(`/api/workflows/${selectedWorkflowId}`, { method: 'DELETE' });
      setSelectedWorkflowId('');
      setMessage('Workflow deleted');
      await loadAll();
    } catch (err) {
      setError(String(err));
    }
  }

  async function onRun() {
    if (!selectedWorkflowId) return;
    setError('');
    setMessage('');
    setRunResult(null);
    setRunStatus(null);
    setRunning(true);
    try {
      const result = await api<WorkflowRunResponse>(`/api/workflows/${selectedWorkflowId}/run`, {
        method: 'POST',
        body: JSON.stringify({
          dataset_id: runDatasetId || null,
          provider_id: runProviderId || null,
          template_id: runTemplateId || null,
          model: runModel || null,
          variables: runVariablesText ? JSON.parse(runVariablesText) : {},
        }),
      });
      setRunResult(result);
      const status = await api<WorkflowRunStatus>(`/api/workflow-runs/${result.run_id}`);
      setRunStatus(status);
    } catch (err) {
      setError(String(err));
    } finally {
      setRunning(false);
    }
  }

  function addStep(type: WorkflowStep['type']) {
    if (type === 'prompt_template') {
      setSteps([
        ...workflowSteps,
        { type: 'prompt_template', name: 'Render prompt', result_key: `prompt_${workflowSteps.length + 1}`, template_id: '', dataset_id: '', variables: {} },
      ]);
      return;
    }
    const lastPromptStep = [...workflowSteps].reverse().find((step) => step.type === 'prompt_template');
    setSteps([
      ...workflowSteps,
      { type: 'llm_provider', name: 'Call provider', result_key: `llm_${workflowSteps.length + 1}`, prompt_ref: lastPromptStep?.result_key || 'prompt', provider_id: '', model: '' },
    ]);
  }

  function updateStep(index: number, step: WorkflowStep) {
    setSteps(workflowSteps.map((current, currentIndex) => currentIndex === index ? step : current));
  }

  function moveStep(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= workflowSteps.length) return;
    const nextSteps = [...workflowSteps];
    const [step] = nextSteps.splice(index, 1);
    nextSteps.splice(nextIndex, 0, step);
    setSteps(nextSteps);
  }

  function removeStep(index: number) {
    setSteps(workflowSteps.filter((_, currentIndex) => currentIndex !== index));
  }

  return (
    <div className="grid two-col">
      <div className="stack">
        <div className="card">
          <div className="row between">
            <h2>Workflows</h2>
            {message ? <span className="muted">{message}</span> : null}
          </div>
          {error ? <pre>{error}</pre> : null}
          <ul className="list">
            {workflows.length === 0 ? <li>No workflows yet.</li> : workflows.map((workflow) => (
              <li key={workflow.id}>
                <button type="button" className={selectedWorkflowId === workflow.id ? 'session-button active' : 'session-button'} onClick={() => setSelectedWorkflowId(workflow.id)}>
                  <strong>{workflow.name}</strong>
                  <div className="muted">{workflow.slug} · v{workflow.version_no} · {workflow.enabled ? 'enabled' : 'disabled'}</div>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <h2>{selectedWorkflow ? 'Edit workflow' : 'Create workflow'}</h2>
          <form className="stack" onSubmit={selectedWorkflow ? (event) => { event.preventDefault(); void onSave(); } : onCreate}>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Workflow name" required />
            <input value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="workflow_slug" required />
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Description" rows={3} />
            <label className="checkbox-row">
              <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
              <span>Enabled</span>
            </label>

            <div className="card stack">
              <div className="row between wrap">
                <h3>Step builder</h3>
                <div className="row wrap">
                  <button type="button" onClick={() => addStep('prompt_template')}>Add prompt step</button>
                  <button type="button" onClick={() => addStep('llm_provider')}>Add provider step</button>
                </div>
              </div>
              <p className="muted">Use the builder for common fields, then fine-tune the raw JSON below if you need to.</p>
              {workflowSteps.length === 0 ? <p className="muted">No steps yet.</p> : workflowSteps.map((step, index) => (
                <WorkflowStepEditor
                  key={`${step.type}-${index}-${step.result_key ?? ''}`}
                  step={step}
                  index={index}
                  datasets={datasets}
                  providers={providers}
                  templates={templates}
                  onChange={updateStep}
                  onMove={moveStep}
                  onRemove={removeStep}
                />
              ))}
            </div>

            <details>
              <summary>Raw definition JSON</summary>
              <textarea
                value={definitionText}
                onChange={(event) => {
                  setDefinitionText(event.target.value);
                  try {
                    parseDefinition(event.target.value);
                    setDefinitionError('');
                  } catch (err) {
                    setDefinitionError(String(err));
                  }
                }}
                rows={20}
              />
              {definitionError ? <pre>{definitionError}</pre> : null}
            </details>

            <div className="row between wrap">
              {selectedWorkflow ? <button type="button" onClick={onDelete} className="danger-button">Delete</button> : <span />}
              <button type="submit">{selectedWorkflow ? 'Save workflow' : 'Create workflow'}</button>
            </div>
          </form>
        </div>
      </div>

      <div className="stack">
        <div className="card">
          <h2>Run workflow</h2>
          <p className="muted">V1 supports `prompt_template` and `llm_provider` steps. You can hardcode IDs inside the definition or supply overrides here.</p>
          <div className="row wrap">
            {selectedWorkflowId ? <a className="button-link" href={`/automations?target_type=workflow&workflow_id=${encodeURIComponent(selectedWorkflowId)}`}>Turn into automation</a> : null}
            {runDatasetId ? <a className="button-link" href={`/workbench?dataset_id=${encodeURIComponent(runDatasetId)}&provider_id=${encodeURIComponent(runProviderId)}&template_id=${encodeURIComponent(runTemplateId)}&model=${encodeURIComponent(runModel)}`}>Open in Workbench</a> : null}
          </div>
          <div className="stack">
            <select value={runDatasetId} onChange={(event) => setRunDatasetId(event.target.value)}>
              <option value="">No dataset override</option>
              {datasets.map((dataset) => <option key={dataset.id} value={dataset.id}>{dataset.name}</option>)}
            </select>
            <select value={runProviderId} onChange={(event) => setRunProviderId(event.target.value)}>
              <option value="">No provider override</option>
              {providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
            </select>
            <select value={runTemplateId} onChange={(event) => setRunTemplateId(event.target.value)}>
              <option value="">No template override</option>
              {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
            </select>
            <input value={runModel} onChange={(event) => setRunModel(event.target.value)} placeholder="Optional model override" />
            <textarea value={runVariablesText} onChange={(event) => setRunVariablesText(event.target.value)} rows={5} placeholder='{"team_name":"Platform"}' />
            <button type="button" onClick={() => void onRun()} disabled={!selectedWorkflowId || running}>{running ? 'Running…' : 'Run workflow now'}</button>
          </div>
        </div>

        <div className="card">
          <h2>Helpful IDs</h2>
          <details open>
            <summary>Templates</summary>
            <ul className="list">
              {templates.map((template) => <li key={template.id}><code>{template.id}</code> — {template.name} <span className="muted">({template.slug})</span></li>)}
            </ul>
          </details>
          <details>
            <summary>Datasets</summary>
            <ul className="list">
              {datasets.map((dataset) => <li key={dataset.id}><code>{dataset.id}</code> — {dataset.name}</li>)}
            </ul>
          </details>
          <details>
            <summary>Providers</summary>
            <ul className="list">
              {providers.map((provider) => <li key={provider.id}><code>{provider.id}</code> — {provider.name}</li>)}
            </ul>
          </details>
        </div>

        <div className="card">
          <h2>Run status</h2>
          {!runResult ? <p className="muted">Run a workflow to see outputs and recorded steps.</p> : (
            <div className="stack">
              <div><strong>Run:</strong> {runResult.run_id}</div>
              <div><strong>Status:</strong> {runStatus?.run.status ?? runResult.status}</div>
              {runStatus?.run.summary ? <div><strong>Summary:</strong> {runStatus.run.summary}</div> : null}
              {runStatus?.run.error_text ? <pre>{runStatus.run.error_text}</pre> : null}
              <details open>
                <summary>Outputs</summary>
                <pre>{prettyJson(runStatus?.outputs ?? runResult.outputs)}</pre>
              </details>
              <details>
                <summary>Steps</summary>
                <ul className="list">
                  {(runStatus?.steps ?? []).map((step) => (
                    <li key={step.id}>{step.step_index}. {step.step_name} · {step.status}{step.error_text ? ` · ${step.error_text}` : ''}</li>
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
