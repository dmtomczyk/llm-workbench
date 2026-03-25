import { useEffect, useState } from 'react';

import { api } from '../../lib/api';

type Plugin = { id: string; load_status: string; kind: string };
type Provider = { id: string; name: string };
type Audit = { id: string; action: string; status: string; occurred_at: string };

export function DashboardPage() {
  const [health, setHealth] = useState<string>('loading');
  const [pluginCount, setPluginCount] = useState<number>(0);
  const [providerCount, setProviderCount] = useState<number>(0);
  const [audits, setAudits] = useState<Audit[]>([]);

  useEffect(() => {
    api<{ status: string }>('/api/health').then((data) => setHealth(data.status)).catch(() => setHealth('down'));
    api<Plugin[]>('/api/plugins').then((data) => setPluginCount(data.length)).catch(() => setPluginCount(0));
    api<Provider[]>('/api/providers').then((data) => setProviderCount(data.length)).catch(() => setProviderCount(0));
    api<Audit[]>('/api/audit').then((data) => setAudits(data.slice(0, 5))).catch(() => setAudits([]));
  }, []);

  return (
    <div className="stack">
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
        <div className="card">
          <h3>Recent audit events</h3>
          <ul className="list">
            {audits.length === 0 ? <li>No audit events yet.</li> : audits.map((audit) => <li key={audit.id}>{audit.action} · {audit.status}</li>)}
          </ul>
        </div>
        <div className="card">
          <h3>What exists now</h3>
          <ul className="list">
            <li>FastAPI backend scaffold</li>
            <li>SQLite schema + Alembic baseline</li>
            <li>Plugin discovery + registry sync</li>
            <li>Provider CRUD / test / invoke routes</li>
            <li>Seed prompt templates</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
