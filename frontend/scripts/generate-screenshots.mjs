import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(frontendDir, '..');
const outputDir = path.join(repoRoot, 'docs', 'screenshots');
const baseUrl = 'http://127.0.0.1:4173';

const nowIso = '2026-03-26T19:50:00Z';

const fixtures = {
  providers: [
    {
      id: 'provider-openai',
      name: 'OpenAI Cloud',
      kind: 'openai_compatible',
      base_url: 'https://api.openai.com/v1',
      default_model: 'gpt-4.1-mini',
      enabled: true,
      auth_strategy: { type: 'bearer', secret_alias: 'BRIDGE_OPENAI_CLOUD_API_KEY', secret_configured: true },
      capabilities: {
        model_settings: {
          'gpt-4.1-mini': { context_window: 128000, max_output_tokens: 8192 },
        },
      },
      last_test_result: { ok: true, message: 'Connected and model list cached.' },
    },
    {
      id: 'provider-local',
      name: 'Ollama Local',
      kind: 'openai_compatible',
      base_url: 'http://localhost:11434/v1',
      default_model: 'qwen2.5:14b',
      enabled: true,
      auth_strategy: { type: 'bearer', secret_alias: 'BRIDGE_OLLAMA_LOCAL_API_KEY', secret_configured: false },
      capabilities: {
        model_settings: {
          'qwen2.5:14b': { context_window: 32768, max_output_tokens: 4096 },
        },
      },
      last_test_result: { ok: true, message: 'Responded locally in 210ms.' },
    },
  ],
  providerModels: {
    'provider-openai': ['gpt-4.1-mini', 'gpt-4.1', 'o4-mini'],
    'provider-local': ['qwen2.5:14b', 'llama3.2:latest'],
  },
  openapiSpecs: [
    {
      id: 'spec-1',
      name: 'Internal Responses API',
      source_type: 'url',
      operations: [
        { operation_id: 'createResponse', method: 'POST', path: '/responses' },
        { operation_id: 'listModels', method: 'GET', path: '/models' },
      ],
    },
  ],
  audit: [
    { id: 'audit-1', action: 'provider.test', status: 'success', occurred_at: nowIso },
    { id: 'audit-2', action: 'chat.complete', status: 'success', occurred_at: nowIso },
    { id: 'audit-3', action: 'workflow.run', status: 'success', occurred_at: nowIso },
    { id: 'audit-4', action: 'automation.run', status: 'success', occurred_at: nowIso },
  ],
  datasets: [
    {
      id: 'dataset-1',
      name: 'Support Tickets Sample',
      source_type: 'csv',
      media_type: 'text/csv',
      latest_version: { row_count: 128, created_at: nowIso },
    },
    {
      id: 'dataset-2',
      name: 'Knowledge Base Articles',
      source_type: 'jsonl',
      media_type: 'application/jsonl',
      latest_version: { row_count: 42, created_at: nowIso },
    },
  ],
  datasetPreview: {
    'dataset-1': {
      rows: [
        { ticket_id: 'T-1001', priority: 'high', summary: 'VPN disconnects after 5 minutes', owner: 'Platform' },
        { ticket_id: 'T-1002', priority: 'medium', summary: 'Slack SSO invite loop for contractors', owner: 'IT Ops' },
        { ticket_id: 'T-1003', priority: 'low', summary: 'Need release-note summary for 0.3.0', owner: 'DX' },
      ],
    },
    'dataset-2': {
      rows: [
        { slug: 'faq-auth', title: 'Authentication FAQ', product: 'BRIDGE' },
        { slug: 'runbooks-imports', title: 'Dataset import runbook', product: 'BRIDGE' },
      ],
    },
  },
  templates: [
    {
      id: 'template-1',
      name: 'Summarize Support Queue',
      slug: 'summarize-support-queue',
      description: 'Summarize inbound requests by priority, theme, and likely next action.',
      system_prompt: 'You are an operations analyst producing concise daily summaries.',
      user_prompt_template: 'Summarize the following support tickets for {{team_name}} and highlight anything urgent.',
    },
    {
      id: 'template-2',
      name: 'Extract Action Items',
      slug: 'extract-action-items',
      description: 'Turn mixed notes into owners, deadlines, and follow-ups.',
      system_prompt: 'Produce a structured checklist.',
      user_prompt_template: 'Extract action items from the supplied text.',
    },
  ],
  chatSessions: [
    {
      id: 'chat-1',
      title: 'Release notes drafting',
      provider_id: 'provider-openai',
      model_name: 'gpt-4.1-mini',
      system_prompt: 'You write crisp release notes for open source users.',
      message_count: 4,
      last_message_preview: 'Drafted a changelog section for providers and workflows.',
      updated_at: nowIso,
    },
    {
      id: 'chat-2',
      title: 'Bug triage',
      provider_id: 'provider-local',
      model_name: 'qwen2.5:14b',
      system_prompt: 'Focus on reproducible bug reports.',
      message_count: 2,
      last_message_preview: 'Need to verify dataset preview edge cases.',
      updated_at: nowIso,
    },
  ],
  chatMessages: {
    'chat-1': [
      { id: 'm1', session_id: 'chat-1', role: 'system', content: 'You write crisp release notes for open source users.', sequence_no: 1, created_at: nowIso },
      { id: 'm2', session_id: 'chat-1', role: 'user', content: 'Summarize what changed across providers, workflows, and automations.', sequence_no: 2, created_at: nowIso },
      { id: 'm3', session_id: 'chat-1', role: 'assistant', content: 'BRIDGE now supports provider model discovery, workflow step builders, and richer automation run inspection.', sequence_no: 3, created_at: nowIso },
      { id: 'm4', session_id: 'chat-1', role: 'user', content: 'Rewrite that in a friendlier tone for repo visitors.', sequence_no: 4, created_at: nowIso },
      { id: 'm5', session_id: 'chat-1', role: 'assistant', content: 'This release makes BRIDGE easier to explore: providers are easier to configure, workflows are less JSON-heavy, and automations are easier to inspect when something goes wrong.', sequence_no: 5, created_at: nowIso },
    ],
  },
  workflows: [
    {
      id: 'workflow-1',
      slug: 'daily-support-summary',
      name: 'Daily support summary',
      description: 'Render a prompt from the support queue dataset, then call the selected provider.',
      enabled: true,
      version_no: 3,
      definition: {
        steps: [
          { type: 'prompt_template', name: 'Render support prompt', result_key: 'prompt', template_id: 'template-1', dataset_id: 'dataset-1', variables: { team_name: 'Support Ops' } },
          { type: 'llm_provider', name: 'Generate summary', result_key: 'llm', prompt_ref: 'prompt', provider_id: 'provider-openai', model: 'gpt-4.1-mini' },
        ],
      },
    },
  ],
  workflowRun: {
    ok: true,
    run_id: 'workflow-run-1',
    workflow_id: 'workflow-1',
    status: 'success',
    outputs: {
      prompt: { rendered_user_prompt: 'Summarize the support queue for Support Ops.' },
      llm: { summary: '3 urgent issues, 1 recurring auth problem, 2 docs follow-ups.' },
    },
  },
  workflowRunStatus: {
    ok: true,
    run: { id: 'workflow-run-1', status: 'success', summary: 'Generated summary and action items.' },
    steps: [
      { id: 'wf-step-1', step_index: 1, step_name: 'Render support prompt', status: 'success' },
      { id: 'wf-step-2', step_index: 2, step_name: 'Generate summary', status: 'success' },
    ],
    outputs: {
      prompt: { rendered_user_prompt: 'Summarize the support queue for Support Ops.' },
      llm: { summary: '3 urgent issues, 1 recurring auth problem, 2 docs follow-ups.' },
    },
  },
  automations: [
    {
      id: 'automation-1',
      name: 'Morning support digest',
      enabled: true,
      schedule_type: 'daily',
      time_of_day: '09:00',
      timezone: 'America/New_York',
      target_type: 'workflow',
      workflow_id: 'workflow-1',
      variables: { team_name: 'Support Ops' },
      last_run_at: '2026-03-26T13:00:00Z',
      next_run_at: '2026-03-27T13:00:00Z',
    },
    {
      id: 'automation-2',
      name: 'Release notes helper',
      enabled: true,
      schedule_type: 'interval',
      interval_seconds: 21600,
      timezone: 'America/New_York',
      target_type: 'custom_prompt',
      provider_id: 'provider-openai',
      model: 'gpt-4.1-mini',
      system_prompt: 'Summarize repo activity.',
      prompt_text: 'Summarize notable changes since the last check.',
      variables: {},
      last_run_at: '2026-03-26T18:00:00Z',
      next_run_at: '2026-03-27T00:00:00Z',
    },
  ],
  automationRuns: {
    'automation-1': {
      runs: [
        { id: 'automation-run-1', status: 'success', summary: 'Posted daily support digest.', created_at: '2026-03-26T13:00:00Z' },
        { id: 'automation-run-0', status: 'success', summary: 'Posted daily support digest.', created_at: '2026-03-25T13:00:00Z' },
      ],
    },
  },
  automationRunDetail: {
    ok: true,
    run: { id: 'automation-run-1', status: 'success', summary: 'Posted daily support digest.', created_at: '2026-03-26T13:00:00Z' },
    steps: [
      { id: 'auto-step-1', step_index: 1, step_name: 'Load workflow', status: 'success', input_json: { workflow_id: 'workflow-1' }, output_json: { ok: true } },
      { id: 'auto-step-2', step_index: 2, step_name: 'Run workflow', status: 'success', input_json: { variables: { team_name: 'Support Ops' } }, output_json: { summary: '3 urgent issues, 1 recurring auth problem.' } },
    ],
  },
  health: { status: 'ok' },
  plugins: [
    { id: 'plugin-openai', load_status: 'loaded', kind: 'provider' },
    { id: 'plugin-openapi', load_status: 'loaded', kind: 'provider' },
    { id: 'plugin-automation', load_status: 'loaded', kind: 'scheduler' },
    { id: 'plugin-imports', load_status: 'loaded', kind: 'ingest' },
  ],
};

const screenshots = [
  { name: 'dashboard', path: '/', waitFor: 'h3:has-text("Recent audit events")' },
  { name: 'chat', path: '/chat', waitFor: 'h2:has-text("Release notes drafting")' },
  { name: 'providers', path: '/providers', waitFor: 'h2:has-text("Configured providers")' },
  { name: 'workbench', path: '/workbench', waitFor: 'h2:has-text("Dataset context")' },
  { name: 'workflows', path: '/workflows', waitFor: 'h2:has-text("Run workflow")' },
  { name: 'automations', path: '/automations', waitFor: 'h2:has-text("Run detail")' },
];

function jsonResponse(body, status = 200) {
  return {
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  };
}

async function mockApi(page) {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const { pathname } = url;

    if (pathname === '/api/health') return route.fulfill(jsonResponse(fixtures.health));
    if (pathname === '/api/plugins') return route.fulfill(jsonResponse(fixtures.plugins));
    if (pathname === '/api/providers') return route.fulfill(jsonResponse(fixtures.providers));
    if (pathname === '/api/openapi/specs') return route.fulfill(jsonResponse(fixtures.openapiSpecs));
    if (pathname === '/api/audit') return route.fulfill(jsonResponse(fixtures.audit));
    if (pathname === '/api/datasets') return route.fulfill(jsonResponse(fixtures.datasets));
    if (pathname === '/api/templates') return route.fulfill(jsonResponse(fixtures.templates));
    if (pathname === '/api/chat/sessions') return route.fulfill(jsonResponse(fixtures.chatSessions));
    if (pathname === '/api/workflows') return route.fulfill(jsonResponse(fixtures.workflows));
    if (pathname === '/api/automations') return route.fulfill(jsonResponse(fixtures.automations));

    const providerModelsMatch = pathname.match(/^\/api\/providers\/([^/]+)\/models$/);
    if (providerModelsMatch) {
      const providerId = providerModelsMatch[1];
      return route.fulfill(jsonResponse({
        ok: true,
        provider_id: providerId,
        models: fixtures.providerModels[providerId] ?? [],
        source: 'mock',
        message: 'Loaded from screenshot fixture.',
      }));
    }

    const datasetPreviewMatch = pathname.match(/^\/api\/datasets\/([^/]+)\/preview$/);
    if (datasetPreviewMatch) {
      const datasetId = datasetPreviewMatch[1];
      return route.fulfill(jsonResponse(fixtures.datasetPreview[datasetId] ?? { rows: [] }));
    }

    const chatMessagesMatch = pathname.match(/^\/api\/chat\/sessions\/([^/]+)\/messages$/);
    if (chatMessagesMatch) {
      const sessionId = chatMessagesMatch[1];
      return route.fulfill(jsonResponse(fixtures.chatMessages[sessionId] ?? []));
    }

    const automationRunsMatch = pathname.match(/^\/api\/automations\/([^/]+)\/runs$/);
    if (automationRunsMatch) {
      const automationId = automationRunsMatch[1];
      return route.fulfill(jsonResponse(fixtures.automationRuns[automationId] ?? { runs: [] }));
    }

    if (pathname === '/api/workflows/workflow-1/run') {
      return route.fulfill(jsonResponse(fixtures.workflowRun));
    }

    if (pathname === '/api/workflow-runs/workflow-run-1') {
      return route.fulfill(jsonResponse(fixtures.workflowRunStatus));
    }

    if (pathname === '/api/automation-runs/automation-run-1') {
      return route.fulfill(jsonResponse(fixtures.automationRunDetail));
    }

    return route.fulfill(jsonResponse({ ok: true }));
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function stopPreviewServer(child) {
  if (!child) return;

  const tryKillGroup = (signal) => {
    try {
      process.kill(-child.pid, signal);
      return true;
    } catch {
      return false;
    }
  };

  if (child.exitCode === null && child.signalCode === null) {
    if (!tryKillGroup('SIGTERM')) {
      child.kill('SIGTERM');
    }
  }

  await Promise.race([
    new Promise((resolve) => child.once('close', resolve)),
    (async () => {
      await wait(2_000);
      if (child.exitCode === null && child.signalCode === null) {
        if (!tryKillGroup('SIGKILL')) {
          child.kill('SIGKILL');
        }
      }
      await new Promise((resolve) => child.once('close', resolve));
    })(),
  ]);
}

async function startPreviewServer() {
  const viteCommand = process.platform === 'win32'
    ? path.join(frontendDir, 'node_modules', '.bin', 'vite.cmd')
    : path.join(frontendDir, 'node_modules', '.bin', 'vite');
  const child = spawn(viteCommand, ['preview', '--host', '127.0.0.1', '--port', '4173'], {
    cwd: frontendDir,
    stdio: 'pipe',
    env: { ...process.env },
    detached: process.platform !== 'win32',
  });

  child.stdout.on('data', (chunk) => process.stdout.write(`[preview] ${chunk}`));
  child.stderr.on('data', (chunk) => process.stderr.write(`[preview] ${chunk}`));

  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return child;
    } catch {
      // server not ready yet
    }
    await wait(500);
  }

  await stopPreviewServer(child);
  throw new Error('Timed out waiting for Vite preview server.');
}

async function main() {
  await mkdir(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  let previewServer;

  try {
    previewServer = await startPreviewServer();
    const page = await browser.newPage({ viewport: { width: 1440, height: 1024 }, colorScheme: 'dark' });
    await mockApi(page);

    for (const shot of screenshots) {
      await page.goto(`${baseUrl}${shot.path}`, { waitUntil: 'networkidle' });
      await page.locator(shot.waitFor).waitFor({ timeout: 10_000 });
      await page.addStyleTag({ content: '* { animation: none !important; transition: none !important; }' });
      await page.screenshot({ path: path.join(outputDir, `${shot.name}.png`), fullPage: true });
      console.log(`saved docs/screenshots/${shot.name}.png`);
    }
  } finally {
    await browser.close();
    await stopPreviewServer(previewServer);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
