import { useEffect, useState } from 'react';

import { MetricTile, MultiLineTextField, StatusChip, TextBox } from '../../design-system/components';
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
      <div className="card stack">
        <div className="row between wrap" style={{ alignItems: 'flex-start', gap: 16 }}>
          <div className="stack compact-stack" style={{ maxWidth: '52rem' }}>
            <div className="muted" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 12 }}>System Configuration</div>
            <h2 style={{ margin: 0 }}>Settings</h2>
            <p className="muted" style={{ margin: 0 }}>Control BRIDGE runtime defaults, authentication behavior, environment metadata, and diagnostic visibility from a more cohesive operational surface.</p>
          </div>
          <div className="row wrap" style={{ gap: 8 }}>
            <StatusChip text={authConfig.enabled ? 'Auth Enabled' : 'Auth Disabled'} tone={authConfig.enabled ? 'selected' : 'disabled'} chipStyle="box" backgroundEffect={authConfig.enabled ? 'glow' : 'matte'} />
            {about ? <StatusChip text={about.environment} tone="hover" chipStyle="box" backgroundEffect="matte" /> : null}
          </div>
        </div>
      </div>

      {about ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
          <MetricTile label={`Version · ${about.short_name}`} value={about.version} tone="info" />
          <MetricTile label="Providers" value={String(about.seededProviders.length)} tone="neutral" />
          <MetricTile label={`Surfaces · ${about.timezone}`} value={String(about.seededFeatures.length)} tone="neutral" />
        </div>
      ) : null}

      <div className="grid two-col">
        <div className="card stack">
          <div className="stack compact-stack">
            <h2>About</h2>
            <div className="muted">Product identity, runtime context, and installed environment details.</div>
          </div>
          {!about ? <p className="muted">Loading…</p> : (
            <>
              <div>
                <strong>{about.name}</strong>
                <div className="muted">{about.tagline}</div>
              </div>
              <p>{about.description}</p>
              <div className="grid two-col" style={{ gap: 12 }}>
                <div><strong>Short name</strong><div className="muted">{about.short_name}</div></div>
                <div><strong>Acronym</strong><div className="muted">{about.acronym_expansion}</div></div>
                <div><strong>Environment</strong><div className="muted">{about.environment}</div></div>
                <div><strong>Timezone</strong><div className="muted">{about.timezone}</div></div>
              </div>
            </>
          )}
        </div>

        <div className="card stack">
          <div className="stack compact-stack">
            <h2>Version & defaults</h2>
            <div className="muted">Seeded providers and enabled surfaces available in this BRIDGE environment.</div>
          </div>
          {!about ? <p className="muted">Loading…</p> : (
            <>
              <div>
                <strong>Seeded providers</strong>
                <div className="row wrap" style={{ gap: 8, marginTop: 8 }}>
                  {about.seededProviders.map((item) => <StatusChip key={item} text={item} tone="hover" chipStyle="box" backgroundEffect="matte" />)}
                </div>
              </div>
              <div>
                <strong>Enabled surfaces</strong>
                <div className="row wrap" style={{ gap: 8, marginTop: 8 }}>
                  {about.seededFeatures.map((item) => <StatusChip key={item} text={item} tone="selected" chipStyle="box" backgroundEffect="matte" />)}
                </div>
              </div>
              <p className="muted">This page should evolve into the home for branding, release notes, environment diagnostics, and administrative defaults.</p>
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
        <div className="row between wrap" style={{ alignItems: 'flex-start', gap: 16 }}>
          <div className="stack compact-stack" style={{ maxWidth: '52rem' }}>
            <h2>Authentication / SSO</h2>
            <p className="muted" style={{ margin: 0 }}>Configure generic OIDC login for BRIDGE. Once enabled, the frontend redirects unauthenticated users to the Login page and the backend requires a valid BRIDGE session JWT for API access.</p>
          </div>
          <div className="row wrap" style={{ gap: 8 }}>
            <StatusChip text={authConfig.enabled ? 'Enabled' : 'Disabled'} tone={authConfig.enabled ? 'selected' : 'disabled'} chipStyle="box" backgroundEffect={authConfig.enabled ? 'glow' : 'matte'} />
            {authConfig.local_dev_bypass ? <StatusChip text="Dev Bypass" tone="warning" chipStyle="box" backgroundEffect="matte" /> : null}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
          <MetricTile label="Mode" value={authConfig.mode.toUpperCase()} tone="info" size="sm" />
          <MetricTile label="Session TTL" value={`${Math.round(authConfig.session_ttl_seconds / 3600)}h`} tone="neutral" size="sm" />
          <MetricTile label="Callback" value={authConfig.oidc.redirect_path || '—'} tone="neutral" size="sm" />
        </div>

        <div className="stack" style={{ padding: 18, border: '1px solid rgba(156,198,216,0.16)', background: 'linear-gradient(180deg, rgba(22,32,41,0.54) 0%, rgba(15,22,30,0.42) 100%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}>
          <div className="stack compact-stack" style={{ paddingBottom: 12, borderBottom: '1px solid rgba(156,198,216,0.14)' }}>
            <strong>Access policy</strong>
            <div className="muted">Top-level switches that control whether authentication is required and whether local developers can bypass login during setup.</div>
            <div className="row wrap" style={{ gap: 8, marginTop: 4 }}>
              <StatusChip
                text="Authentication"
                trailing={authConfig.enabled ? 'ON' : 'OFF'}
                tone={authConfig.enabled ? 'selected' : 'default'}
                chipStyle="box"
                backgroundEffect={authConfig.enabled ? 'glow' : 'matte'}
                clickable
                active={authConfig.enabled}
                onClick={() => setAuthConfig((current) => ({ ...current, enabled: !current.enabled }))}
              />
              <StatusChip
                text="Dev Bypass"
                trailing={authConfig.local_dev_bypass ? 'ON' : 'OFF'}
                tone={authConfig.local_dev_bypass ? 'warning' : 'default'}
                chipStyle="box"
                backgroundEffect={authConfig.local_dev_bypass ? 'glow' : 'matte'}
                clickable
                active={authConfig.local_dev_bypass}
                onClick={() => setAuthConfig((current) => ({ ...current, local_dev_bypass: !current.local_dev_bypass }))}
              />
            </div>
            <div className="notice">
              For local testing, keep dev bypass enabled and point OIDC to a local provider such as Keycloak. Typical local values are frontend base URL <code>http://localhost:5173</code> and callback path <code>/api/auth/callback</code>.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 16 }}>
            <div className="stack" style={{ gap: 14 }}>
              <div className="stack compact-stack">
                <strong>Identity provider</strong>
                <div className="muted">Core OIDC connection parameters used by BRIDGE to negotiate login and validate user sessions.</div>
              </div>
              <div className="grid two-col">
                <TextBox label={<strong>OIDC issuer URL</strong>} value={authConfig.oidc.issuer_url} onChange={(value) => setAuthConfig((current) => ({ ...current, oidc: { ...current.oidc, issuer_url: value } }))} placeholder="https://issuer.example.com" />
                <TextBox label={<strong>Discovery URL override</strong>} value={authConfig.oidc.discovery_url || ''} onChange={(value) => setAuthConfig((current) => ({ ...current, oidc: { ...current.oidc, discovery_url: value } }))} placeholder="Optional discovery URL override" />
                <TextBox label={<strong>OIDC client ID</strong>} value={authConfig.oidc.client_id} onChange={(value) => setAuthConfig((current) => ({ ...current, oidc: { ...current.oidc, client_id: value } }))} placeholder="OIDC client ID" />
                <TextBox label={<strong>OIDC client secret</strong>} type="password" value={authConfig.oidc.client_secret} onChange={(value) => setAuthConfig((current) => ({ ...current, oidc: { ...current.oidc, client_secret: value } }))} placeholder={authConfig.oidc.client_secret_configured ? 'Client secret already saved — enter to replace' : 'OIDC client secret'} />
                <TextBox label={<strong>Frontend base URL</strong>} value={authConfig.oidc.frontend_base_url || ''} onChange={(value) => setAuthConfig((current) => ({ ...current, oidc: { ...current.oidc, frontend_base_url: value } }))} placeholder="https://bridge.example.com" />
                <TextBox label={<strong>Callback path</strong>} value={authConfig.oidc.redirect_path} onChange={(value) => setAuthConfig((current) => ({ ...current, oidc: { ...current.oidc, redirect_path: value } }))} placeholder="/api/auth/callback" />
                <TextBox label={<strong>Audience</strong>} value={authConfig.oidc.audience || ''} onChange={(value) => setAuthConfig((current) => ({ ...current, oidc: { ...current.oidc, audience: value } }))} placeholder="Optional audience" />
                <TextBox label={<strong>Scopes</strong>} value={authConfig.oidc.scopes.join(' ')} onChange={(value) => setAuthConfig((current) => ({ ...current, oidc: { ...current.oidc, scopes: value.split(/\s+/).filter(Boolean) } }))} placeholder="openid profile email" />
              </div>
            </div>

            <div className="stack" style={{ gap: 14 }}>
              <div className="stack compact-stack">
                <strong>Session & local identity</strong>
                <div className="muted">Controls for session cookies, JWT signing, token lifetime, and the fallback local development identity.</div>
              </div>
              <TextBox label={<strong>Session cookie name</strong>} value={authConfig.session_cookie_name} onChange={(value) => setAuthConfig((current) => ({ ...current, session_cookie_name: value }))} placeholder="Session cookie name" />
              <TextBox label={<strong>Session JWT secret</strong>} type="password" value={authConfig.session_jwt_secret} onChange={(value) => setAuthConfig((current) => ({ ...current, session_jwt_secret: value }))} placeholder={authConfig.session_jwt_secret_configured ? 'Session JWT secret already saved — enter to replace' : 'Session JWT signing secret'} />
              <TextBox label={<strong>Session TTL seconds</strong>} value={String(authConfig.session_ttl_seconds)} onChange={(value) => setAuthConfig((current) => ({ ...current, session_ttl_seconds: Number(value || 0) || 0 }))} placeholder="28800" />
              <TextBox label={<strong>Display name</strong>} value={authConfig.local_dev_bypass_name} onChange={(value) => setAuthConfig((current) => ({ ...current, local_dev_bypass_name: value }))} placeholder="Local Developer" />
              <TextBox label={<strong>Email</strong>} value={authConfig.local_dev_bypass_email} onChange={(value) => setAuthConfig((current) => ({ ...current, local_dev_bypass_email: value }))} placeholder="dev@localhost" />
              <TextBox label={<strong>Subject</strong>} value={authConfig.local_dev_bypass_subject} onChange={(value) => setAuthConfig((current) => ({ ...current, local_dev_bypass_subject: value }))} placeholder="dev-user" />
            </div>
          </div>
        </div>

        <div className="row wrap" style={{ gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
          {authSaved ? <span className="muted">{authSaved}</span> : <span className="muted">Save after changing OIDC, session, or local development identity values.</span>}
          <button type="button" onClick={() => { void saveAuthConfig(); }}>Save SSO settings</button>
        </div>
      </div>

      <div className="card stack">
        <div className="stack compact-stack">
          <h2>Runtime settings snapshot</h2>
          <div className="muted">Live config visibility for debugging, verification, and environment drift inspection.</div>
        </div>
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
