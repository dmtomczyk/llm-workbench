import { useEffect, useMemo, useState } from 'react';

import { InstrumentDataTable, type InstrumentTableRow } from '../../design-system/components/InstrumentDataTable';
import { MetricTile } from '../../design-system/components/MetricTile';
import { StatusChip } from '../../design-system/components/StatusChip';
import { api } from '../../lib/api';

type Plugin = { id: string; load_status: string; kind: string };
type Provider = { id: string; name: string };
type Audit = { id: string; action: string; status: string; occurred_at: string };
type Dataset = { id: string; name: string; latest_version_no?: number; updated_at?: string; created_at?: string };
type ChatSession = { id: string; title: string; provider_id: string; updated_at: string; last_message_preview?: string };

function formatDate(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

export function DashboardPage() {
  const [health, setHealth] = useState<string>('loading');
  const [pluginCount, setPluginCount] = useState<number>(0);
  const [providerCount, setProviderCount] = useState<number>(0);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);

  useEffect(() => {
    api<{ status: string }>('/api/health').then((data) => setHealth(data.status)).catch(() => setHealth('down'));
    api<Plugin[]>('/api/plugins').then((data) => setPluginCount(data.length)).catch(() => setPluginCount(0));
    api<Provider[]>('/api/providers').then((data) => setProviderCount(data.length)).catch(() => setProviderCount(0));
    api<Audit[]>('/api/audit').then((data) => setAudits(data.slice(0, 5))).catch(() => setAudits([]));
    api<Dataset[]>('/api/datasets').then((data) => setDatasets(data.slice(0, 5))).catch(() => setDatasets([]));
    api<ChatSession[]>('/api/chat/sessions').then((data) => setSessions(data.slice(0, 5))).catch(() => setSessions([]));
  }, []);

  const sessionRows = useMemo<InstrumentTableRow[]>(() => sessions.map((session, index) => ({
    id: session.id,
    icon: index % 2 === 0 ? '⌕' : '✓',
    name: session.title || 'Untitled Session',
    category: session.provider_id || 'chat',
    status: { tone: 'green', label: session.last_message_preview ? 'Active' : 'Idle' },
    date: formatDate(session.updated_at),
    actions: [28, 18],
  })), [sessions]);

  const datasetRows = useMemo<InstrumentTableRow[]>(() => datasets.map((dataset, index) => ({
    id: dataset.id,
    icon: index % 2 === 0 ? '✎' : '⌘',
    name: dataset.name,
    category: `v${dataset.latest_version_no ?? 0}`,
    status: { tone: 'amber', label: 'Ready' },
    date: formatDate(dataset.updated_at ?? dataset.created_at),
    actions: [24, 16],
  })), [datasets]);

  const healthTone = health === 'ok' ? 'success' : health === 'loading' ? 'warning' : 'error';

  return (
    <div className="stack">
      <div className="card stack">
        <div className="row between wrap" style={{ alignItems: 'flex-start', gap: 16 }}>
          <div>
            <h2>Home</h2>
            <p className="muted">Start in chat, ground answers with datasets, then move into workbench, workflows, imports, or automations when the work becomes more structured.</p>
          </div>
          <div className="row wrap" style={{ gap: 10 }}>
            <StatusChip text="System Online" tone={healthTone} chipStyle="rounded" backgroundEffect="glow" haloBoost={1.5} />
            <StatusChip text="Grounded Chat First" tone="selected" chipStyle="rounded" backgroundEffect="glow" haloBoost={1.5} />
          </div>
        </div>
        <div className="row wrap">
          <a className="button-link" href="/chat">Start chatting</a>
          <a className="button-link" href="/datasets">Browse datasets</a>
          <a className="button-link" href="/workbench">Open workbench</a>
          <a className="button-link" href="/recipes">Import data</a>
        </div>
      </div>

      <div className="grid cards">
        <MetricTile value={health} label="Backend Health" tone={health === 'ok' ? 'success' : health === 'loading' ? 'warning' : 'danger'} emphasis="strong" />
        <MetricTile value={pluginCount} label="Plugins Loaded" tone="info" />
        <MetricTile value={providerCount} label="Providers" tone="neutral" />
      </div>

      <div className="grid two-col">
        <div className="card stack">
          <div>
            <h3>Recent chats</h3>
            <div className="muted">Chat is the primary surface for everyday grounded work.</div>
          </div>
          {sessionRows.length === 0 ? (
            <ul className="list"><li>No chat sessions yet.</li></ul>
          ) : (
            <InstrumentDataTable title="Recent Chats" selectable={false} pageSize={5} rows={sessionRows} />
          )}
          <div className="row wrap">
            <a className="button-link" href="/chat">Open chat</a>
          </div>
        </div>

        <div className="card stack">
          <div>
            <h3>Recent datasets</h3>
            <div className="muted">Datasets anchor the rest of the app: inspect them, then launch into chat or structured runs.</div>
          </div>
          {datasetRows.length === 0 ? (
            <ul className="list"><li>No datasets yet.</li></ul>
          ) : (
            <InstrumentDataTable title="Recent Datasets" selectable={false} pageSize={5} rows={datasetRows} />
          )}
          <div className="row wrap">
            <a className="button-link" href="/datasets">Open datasets</a>
          </div>
        </div>
      </div>

      <div className="grid two-col">
        <div className="card stack">
          <div>
            <h3>How to use BRIDGE</h3>
          </div>
          <ul className="list compact-list">
            <li><strong>Chat</strong>: ask grounded questions and explore linked datasets.</li>
            <li><strong>Workbench</strong>: test prompts and inspect one-off runs before you operationalize them.</li>
            <li><strong>Workflows</strong>: turn proven prompt/provider combinations into reusable multi-step runs.</li>
            <li><strong>Imports</strong>: bring in files or HTTP sources and make ingestion repeatable.</li>
            <li><strong>Automations</strong>: schedule workflows or prompt-based runs once the process is stable.</li>
          </ul>
        </div>
        <div className="card stack">
          <div className="row between wrap" style={{ alignItems: 'center' }}>
            <div>
              <h3>Recent audit events</h3>
              <div className="muted">Operator visibility and debugging signals.</div>
            </div>
            <StatusChip text={`${audits.length} events`} tone="hover" chipStyle="box" backgroundEffect="glow" />
          </div>
          <ul className="list">
            {audits.length === 0 ? <li>No audit events yet.</li> : audits.map((audit) => <li key={audit.id}>{audit.action} · {audit.status}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}
