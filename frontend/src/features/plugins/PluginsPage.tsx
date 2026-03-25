import { useEffect, useState } from 'react';

import { api } from '../../lib/api';

type Plugin = { id: string; name: string; kind: string; load_status: string };

export function PluginsPage() {
  const [plugins, setPlugins] = useState<Plugin[]>([]);

  async function load() {
    const data = await api<Plugin[]>('/api/plugins');
    setPlugins(data);
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="card stack">
      <div className="row between">
        <h2>Installed plugins</h2>
        <button onClick={() => void api('/api/plugins/reload', { method: 'POST' }).then(load)}>Reload plugins</button>
      </div>
      <ul className="list">
        {plugins.map((plugin) => (
          <li key={plugin.id}>
            <strong>{plugin.name}</strong>
            <div className="muted">{plugin.kind} · {plugin.load_status}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
