import { FormEvent, useEffect, useState } from 'react';

import { api } from '../../lib/api';

type Connector = { id: string; name: string; plugin_id: string; enabled: boolean; last_test_result?: { message?: string } };

type Plugin = { id: string; name: string; kind: string };

export function ConnectorsPage() {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [message, setMessage] = useState<string>('');

  async function load() {
    const [connectorData, pluginData] = await Promise.all([
      api<Connector[]>('/api/connectors').catch(() => []),
      api<Plugin[]>('/api/plugins').catch(() => []),
    ]);
    setConnectors(connectorData);
    setPlugins(pluginData.filter((plugin) => plugin.kind === 'source_connector'));
  }

  useEffect(() => {
    void load();
  }, []);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await api('/api/connectors', {
      method: 'POST',
      body: JSON.stringify({
        name: form.get('name'),
        plugin_id: form.get('plugin_id'),
        base_url: form.get('base_url') || undefined,
        auth_type: form.get('auth_type') || undefined,
        secret_alias: form.get('secret_alias') || undefined,
      }),
    });
    event.currentTarget.reset();
    await load();
  }

  async function testConnector(id: string) {
    const result = await api<{ message?: string }>('/api/connectors/' + id + '/test', { method: 'POST' });
    setMessage(result.message || 'Connector tested');
    await load();
  }

  return (
    <div className="grid two-col">
      <div className="card">
        <h2>Add connector</h2>
        <form className="stack" onSubmit={onCreate}>
          <input name="name" placeholder="jira-main" required />
          <select name="plugin_id" required defaultValue="">
            <option value="" disabled>Select connector plugin</option>
            {plugins.map((plugin) => <option key={plugin.id} value={plugin.id}>{plugin.name}</option>)}
          </select>
          <input name="base_url" placeholder="https://internal.example" />
          <input name="auth_type" placeholder="bearer / basic / custom_header" />
          <input name="secret_alias" placeholder="JIRA_API_TOKEN" />
          <button type="submit">Create connector</button>
        </form>
      </div>
      <div className="card stack">
        <div className="row between">
          <h2>Configured connectors</h2>
          {message ? <span className="muted">{message}</span> : null}
        </div>
        <ul className="list">
          {connectors.length === 0 ? <li>No connectors yet.</li> : connectors.map((connector) => (
            <li key={connector.id}>
              <div className="row between">
                <div>
                  <strong>{connector.name}</strong>
                  <div className="muted">{connector.plugin_id} · {connector.enabled ? 'enabled' : 'disabled'}</div>
                </div>
                <button onClick={() => void testConnector(connector.id)}>Test</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
