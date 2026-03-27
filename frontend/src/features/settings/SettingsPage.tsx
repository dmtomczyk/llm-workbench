import { useEffect, useState } from 'react';

import { api } from '../../lib/api';

type AboutInfo = {
  name: string;
  short_name: string;
  acronym_expansion: string;
  tagline: string;
  description: string;
  version: string;
  environment: string;
  timezone: string;
  seededProviders: string[];
  seededFeatures: string[];
};

type SettingsInfo = {
  config: Record<string, unknown>;
  overrides: Record<string, unknown>;
};

type AuthAdminConfig = {
  enabled: boolean;
  mode: string;
  local_dev_bypass: boolean;
  local_dev_bypass_subject: string;
  local_dev_bypass_email: string;
  local_dev_bypass_name: string;
  session_cookie_name: string;
  session_jwt_secret: string;
  session_jwt_secret_configured: boolean;
  session_ttl_seconds: number;
  oidc: {
    issuer_url: string;
    discovery_url?: string | null;
    client_id: string;
    client_secret: string;
    client_secret_configured: boolean;
    audience?: string | null;
    scopes: string[];
    frontend_base_url?: string | null;
    redirect_path: string;
  };
};

const DEFAULT_AUTH_CONFIG: AuthAdminConfig = {
  enabled: false,
  mode: 'oidc',
  local_dev_bypass: true,
  local_dev_bypass_subject: 'dev-user',
  local_dev_bypass_email: 'dev@localhost',
  local_dev_bypass_name: 'Local Developer',
  session_cookie_name: 'bridge_session',
  session_jwt_secret: '',
  session_jwt_secret_configured: false,
  session_ttl_seconds: 28800,
  oidc: {
    issuer_url: '',
    discovery_url: '',
    client_id: '',
    client_secret: '',
    client_secret_configured: false,
    audience: '',
    scopes: ['openid', 'profile', 'email'],
    frontend_base_url: '',
    redirect_path: '/api/auth/callback',
  },
};

export function SettingsPage() {
  const [about, setAbout] = useState<AboutInfo | null>(null);
  const [settingsInfo, setSettingsInfo] = useState<SettingsInfo | null>(null);
  const [authConfig, setAuthConfig] = useState<AuthAdminConfig>(DEFAULT_AUTH_CONFIG);
  const [authSaved, setAuthSaved] = useState('');

  useEffect(() => {
    api<AboutInfo>('/api/about').then(setAbout).catch(() => setAbout(null));
    api<SettingsInfo>('/api/settings').then(setSettingsInfo).catch(() => setSettingsInfo(null));
    api<AuthAdminConfig>('/api/auth/admin/config').then(setAuthConfig).catch(() => setAuthConfig(DEFAULT_AUTH_CONFIG));
  }, []);

  async function saveAuthConfig() {
    const saved = await api<AuthAdminConfig>('/api/auth/admin/config', {
      method: 'PATCH',
      body: JSON.stringify({
        enabled: authConfig.enabled,
        mode: authConfig.mode,
        local_dev_bypass: authConfig.local_dev_bypass,
        local_dev_bypass_subject: authConfig.local_dev_bypass_subject,
        local_dev_bypass_email: authConfig.local_dev_bypass_email,
        local_dev_bypass_name: authConfig.local_dev_bypass_name,
        session_cookie_name: authConfig.session_cookie_name,
        session_jwt_secret: authConfig.session_jwt_secret || undefined,
        session_ttl_seconds: authConfig.session_ttl_seconds,
        oidc: {
          issuer_url: authConfig.oidc.issuer_url,
          discovery_url: authConfig.oidc.discovery_url || null,
          client_id: authConfig.oidc.client_id,
          client_secret: authConfig.oidc.client_secret || undefined,
          audience: authConfig.oidc.audience || null,
          scopes: authConfig.oidc.scopes,
          frontend_base_url: authConfig.oidc.frontend_base_url || null,
          redirect_path: authConfig.oidc.redirect_path,
        },
      }),
    });
    setAuthConfig(saved);
    setAuthSaved('Authentication settings saved.');
  }

  return (
    <div className="stack">
      <div className="grid two-col">
        <div className="card stack">
          <h2>About</h2>
          {!about ? <p className="muted">Loading…</p> : (
            <>
              <div>
                <strong>{about.name}</strong>
                <div className="muted">{about.tagline}</div>
              </div>
              <p>{about.description}</p>
              <ul className="list compact-list">
                <li><strong>Short name:</strong> {about.short_name}</li>
                <li><strong>Acronym:</strong> {about.acronym_expansion}</li>
                <li><strong>Version:</strong> {about.version}</li>
                <li><strong>Environment:</strong> {about.environment}</li>
                <li><strong>Timezone:</strong> {about.timezone}</li>
              </ul>
            </>
          )}
        </div>

        <div className="card stack">
          <h2>Version & defaults</h2>
          {!about ? <p className="muted">Loading…</p> : (
            <>
              <div>
                <strong>Seeded providers</strong>
                <div className="pill-row">
                  {about.seededProviders.map((item) => <span className="pill" key={item}>{item}</span>)}
                </div>
              </div>
              <div>
                <strong>Enabled surfaces</strong>
                <div className="pill-row">
                  {about.seededFeatures.map((item) => <span className="pill" key={item}>{item}</span>)}
                </div>
              </div>
              <p className="muted">This page is intended to become the home for app metadata, release notes, branding, and environment diagnostics.</p>
            </>
          )}
        </div>
      </div>

      <div className="card stack">
        <h2>Model limits & context behavior</h2>
        <p className="muted">These settings are configured per provider/model on the Providers page and surfaced in Chat. They help BRIDGE make safer request-shaping choices for long conversations.</p>
        <ul className="list compact-list">
          <li><strong>Context window</strong>: the estimated maximum total tokens a model can accept for a request. BRIDGE uses this as a budgeting hint for chat history replay.</li>
          <li><strong>Max output tokens</strong>: the desired upper bound for generated output. For supported providers, BRIDGE passes this through as a request parameter.</li>
          <li><strong>Current chat behavior</strong>: BRIDGE replays saved chat history on each turn, estimates input token usage, and trims older messages when a configured context window would likely be exceeded.</li>
          <li><strong>What gets trimmed first</strong>: the oldest chat messages. Newer turns and the system prompt are prioritized.</li>
          <li><strong>Token estimates</strong>: current estimates are heuristic, not tokenizer-accurate. They are intended for rough budgeting and visibility, not exact billing math.</li>
          <li><strong>When to configure these</strong>: especially useful for providers/models with very different context windows, small local models, and any setup where long chats may otherwise fail unexpectedly.</li>
          <li><strong>What this does not yet do</strong>: BRIDGE does not yet summarize dropped history automatically or do exact tokenizer-specific preflight accounting.</li>
        </ul>
      </div>

      <div className="card stack">
        <h2>Authentication / SSO</h2>
        <p className="muted">Configure generic OIDC login for BRIDGE. Once enabled, the frontend redirects unauthenticated users to the Login page and the backend requires a valid BRIDGE session JWT for API access.</p>
        <label className="checkbox-row"><input type="checkbox" checked={authConfig.enabled} onChange={(event) => setAuthConfig((current) => ({ ...current, enabled: event.target.checked }))} /><span>Enable authentication</span></label>
        <label className="checkbox-row"><input type="checkbox" checked={authConfig.local_dev_bypass} onChange={(event) => setAuthConfig((current) => ({ ...current, local_dev_bypass: event.target.checked }))} /><span>Allow local dev bypass button on Login page</span></label>
        <div className="grid two-col">
          <div className="stack">
            <input value={authConfig.oidc.issuer_url} onChange={(event) => setAuthConfig((current) => ({ ...current, oidc: { ...current.oidc, issuer_url: event.target.value } }))} placeholder="OIDC issuer URL" />
            <input value={authConfig.oidc.discovery_url || ''} onChange={(event) => setAuthConfig((current) => ({ ...current, oidc: { ...current.oidc, discovery_url: event.target.value } }))} placeholder="Optional discovery URL override" />
            <input value={authConfig.oidc.client_id} onChange={(event) => setAuthConfig((current) => ({ ...current, oidc: { ...current.oidc, client_id: event.target.value } }))} placeholder="OIDC client ID" />
            <input value={authConfig.oidc.client_secret} onChange={(event) => setAuthConfig((current) => ({ ...current, oidc: { ...current.oidc, client_secret: event.target.value } }))} placeholder={authConfig.oidc.client_secret_configured ? 'Client secret already saved — enter to replace' : 'OIDC client secret'} />
            <input value={authConfig.oidc.frontend_base_url || ''} onChange={(event) => setAuthConfig((current) => ({ ...current, oidc: { ...current.oidc, frontend_base_url: event.target.value } }))} placeholder="Frontend base URL (e.g. https://bridge.example.com)" />
            <input value={authConfig.oidc.redirect_path} onChange={(event) => setAuthConfig((current) => ({ ...current, oidc: { ...current.oidc, redirect_path: event.target.value } }))} placeholder="Callback path" />
          </div>
          <div className="stack">
            <input value={authConfig.oidc.audience || ''} onChange={(event) => setAuthConfig((current) => ({ ...current, oidc: { ...current.oidc, audience: event.target.value } }))} placeholder="Optional audience" />
            <input value={authConfig.oidc.scopes.join(' ')} onChange={(event) => setAuthConfig((current) => ({ ...current, oidc: { ...current.oidc, scopes: event.target.value.split(/\s+/).filter(Boolean) } }))} placeholder="Scopes (space separated)" />
            <input value={authConfig.session_cookie_name} onChange={(event) => setAuthConfig((current) => ({ ...current, session_cookie_name: event.target.value }))} placeholder="Session cookie name" />
            <input value={authConfig.session_jwt_secret} onChange={(event) => setAuthConfig((current) => ({ ...current, session_jwt_secret: event.target.value }))} placeholder={authConfig.session_jwt_secret_configured ? 'Session JWT secret already saved — enter to replace' : 'Session JWT signing secret'} />
            <input value={String(authConfig.session_ttl_seconds)} onChange={(event) => setAuthConfig((current) => ({ ...current, session_ttl_seconds: Number(event.target.value || 0) || 0 }))} placeholder="Session TTL seconds" />
            <input value={authConfig.local_dev_bypass_name} onChange={(event) => setAuthConfig((current) => ({ ...current, local_dev_bypass_name: event.target.value }))} placeholder="Local dev bypass display name" />
            <input value={authConfig.local_dev_bypass_email} onChange={(event) => setAuthConfig((current) => ({ ...current, local_dev_bypass_email: event.target.value }))} placeholder="Local dev bypass email" />
            <input value={authConfig.local_dev_bypass_subject} onChange={(event) => setAuthConfig((current) => ({ ...current, local_dev_bypass_subject: event.target.value }))} placeholder="Local dev bypass subject" />
          </div>
        </div>
        <div className="notice">
          For local testing, keep dev bypass enabled and point OIDC to a local provider such as Keycloak. Typical local values are frontend base URL <code>http://localhost:5173</code> and callback path <code>/api/auth/callback</code>.
        </div>
        <div className="row wrap">
          <button type="button" onClick={() => { void saveAuthConfig(); }}>Save SSO settings</button>
          {authSaved ? <span className="muted">{authSaved}</span> : null}
        </div>
      </div>

      <div className="card stack">
        <h2>Runtime settings snapshot</h2>
        {!settingsInfo ? <p className="muted">Loading…</p> : (
          <>
            <details open>
              <summary>Config</summary>
              <pre>{JSON.stringify(settingsInfo.config, null, 2)}</pre>
            </details>
            <details>
              <summary>Overrides</summary>
              <pre>{JSON.stringify(settingsInfo.overrides, null, 2)}</pre>
            </details>
          </>
        )}
      </div>
    </div>
  );
}
