# Production HTTP Import Hardening Spec

This spec defines A2 for BRIDGE imports:

> make HTTP import recipes viable for real internal HTTPS endpoints that require authentication and private/internal PKI trust.

## Goals

1. Reuse BRIDGE's existing secret-alias storage model for HTTP import auth.
2. Support common internal auth modes without storing raw secrets in recipe config.
3. Support internal/private CA trust for HTTPS imports.
4. Improve diagnostics around auth/TLS failures without leaking secret values.

## MVP scope

### Included
- auth presets in HTTP recipe config:
  - `none`
  - `bearer`
  - `custom_header`
  - `basic`
- secret alias resolution from `SettingsEntry` keys `secrets.<alias>`
- app-level import TLS config:
  - `imports.http_tls_verify`
  - `imports.http_ca_bundle`
- improved diagnostics for HTTP failures
- UI support on `/imports` for auth mode + secret alias configuration

### Excluded
- OAuth / SSO browser flows
- per-recipe custom CA bundle
- secret creation UI in `/imports`
- scheduled credential rotation
- mTLS client certificates

## Source config additions

HTTP recipe `source_config` should support:

```json
{
  "method": "GET",
  "url": "https://internal.example.local/export",
  "headers": {"Accept": "application/json"},
  "timeout_seconds": 15,
  "response_format_hint": "auto",
  "body": null,
  "auth": {
    "mode": "bearer",
    "secret_alias": "INTERNAL_EXPORT_TOKEN"
  }
}
```

### Auth variants

#### bearer
```json
{
  "mode": "bearer",
  "secret_alias": "API_TOKEN"
}
```

#### custom_header
```json
{
  "mode": "custom_header",
  "secret_alias": "API_KEY",
  "header_name": "X-Api-Key"
}
```

#### basic
```json
{
  "mode": "basic",
  "secret_alias": "API_PASSWORD",
  "username": "svc_bridge"
}
```

## TLS config

Add to app settings:
- `imports.http_tls_verify: bool = true`
- `imports.http_ca_bundle: str | null = null`

Behavior:
- if `http_tls_verify=false`, requests disable verification (dev/testing only)
- else if `http_ca_bundle` set, use that CA bundle
- else use system defaults

## Security rules

- Never store secret values in recipe config.
- Never return secret values in recipe read APIs.
- Never include auth headers or secret values in diagnostics.
- Run history may include auth mode and secret alias, but not resolved secrets.

## Acceptance criteria

1. HTTP recipes can reference a saved secret alias.
2. Bearer auth works for preview and run.
3. Custom-header auth works for preview and run.
4. Basic auth works for preview and run.
5. HTTPS requests can use a configured internal CA bundle.
6. Failures remain diagnosable without exposing secrets.
