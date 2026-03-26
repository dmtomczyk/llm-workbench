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

export function SettingsPage() {
  const [about, setAbout] = useState<AboutInfo | null>(null);
  const [settingsInfo, setSettingsInfo] = useState<SettingsInfo | null>(null);

  useEffect(() => {
    api<AboutInfo>('/api/about').then(setAbout).catch(() => setAbout(null));
    api<SettingsInfo>('/api/settings').then(setSettingsInfo).catch(() => setSettingsInfo(null));
  }, []);

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
