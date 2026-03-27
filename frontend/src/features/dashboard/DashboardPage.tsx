import { useEffect, useState } from 'react';

import { api } from '../../lib/api';

type Plugin = { id: string; load_status: string; kind: string };
type Provider = { id: string; name: string };
type Audit = { id: string; action: string; status: string; occurred_at: string };
type Dataset = { id: string; name: string; latest_version_no?: number; updated_at?: string; created_at?: string };
type ChatSession = { id: string; title: string; provider_id: string; updated_at: string; last_message_preview?: string };

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

  return (
    <div className="stack">
      <div className="card stack">
        <div>
          <h2>Home</h2>
          <p className="muted">Start in chat, ground answers with datasets, then move into workbench, workflows, imports, or automations when the work becomes more structured.</p>
        </div>
        <div className="row wrap">
          <a className="button-link" href="/chat">Start chatting</a>
          <a className="button-link" href="/datasets">Browse datasets</a>
          <a className="button-link" href="/workbench">Open workbench</a>
          <a className="button-link" href="/recipes">Import data</a>
        </div>
      </div>

      <div className="grid cards">
        <div className="card">
          <h3>Backend Health</h3>
          <p className="metric">{health}</p>
        </div>
        <div className="card">
          <h3>Plugins Loaded</h3>
          <p className="metric">{pluginCount}</p>
        </div>
        <div className="card">
          <h3>Providers</h3>
          <p className="metric">{providerCount}</p>
        </div>
      </div>

      <div className="grid two-col">
        <div className="card stack">
          <div>
            <h3>Recent chats</h3>
            <div className="muted">Chat is the primary surface for everyday grounded work.</div>
          </div>
          <ul className="list">
            {sessions.length === 0 ? <li>No chat sessions yet.</li> : sessions.map((session) => (
              <li key={session.id}>
                <a className="button-link" href={`/chat?session_id=${encodeURIComponent(session.id)}`}>
                  <strong>{session.title}</strong>
                </a>
                <div className="muted">{session.last_message_preview || 'No messages yet.'}</div>
              </li>
            ))}
          </ul>
        </div>
        <div className="card stack">
          <div>
            <h3>Recent datasets</h3>
            <div className="muted">Datasets anchor the rest of the app: inspect them, then launch into chat or structured runs.</div>
          </div>
          <ul className="list">
            {datasets.length === 0 ? <li>No datasets yet.</li> : datasets.map((dataset) => (
              <li key={dataset.id}>
                <a className="button-link" href={`/datasets?dataset_id=${encodeURIComponent(dataset.id)}`}>{dataset.name}</a>
                <div className="muted">v{dataset.latest_version_no ?? 0} · {dataset.updated_at ?? dataset.created_at ?? '—'}</div>
              </li>
            ))}
          </ul>
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
          <div>
            <h3>Recent audit events</h3>
            <div className="muted">Still useful for debugging and operator visibility, but no longer the main story of the home screen.</div>
          </div>
          <ul className="list">
            {audits.length === 0 ? <li>No audit events yet.</li> : audits.map((audit) => <li key={audit.id}>{audit.action} · {audit.status}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}
