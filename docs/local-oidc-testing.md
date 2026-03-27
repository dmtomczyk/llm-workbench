# Local OIDC Testing for BRIDGE

This setup lets you test BRIDGE's real browser login flow locally while keeping the local-dev bypass available for quick development.

## 1) Start Keycloak locally

```bash
cd ~/code/foss-projects/BRIDGE/docs
docker compose -f docker-compose.keycloak.yml up -d
```

Keycloak admin console:
- URL: `http://localhost:8081`
- user: `admin`
- password: `admin`

## 2) Create a realm and test client

Suggested values:
- Realm: `bridge-local`
- Client type: OpenID Connect
- Client ID: `bridge-local-web`
- Client authentication: **On**
- Standard flow: **On**
- Direct access grants: optional

## 3) Configure redirect URLs

In the Keycloak client config, set:

### Valid redirect URIs
- `http://localhost:8080/api/auth/callback`

### Valid post logout redirect URIs
- `http://localhost:5173/*`
- `http://localhost:5173/login`

### Web origins
- `http://localhost:5173`

## 4) Create a test user

Example:
- username: `bridge-test`
- email: `bridge-test@example.local`
- set a password and disable temporary-password requirement

## 5) Configure BRIDGE auth settings

Open BRIDGE Settings and fill in:

- Enable authentication: **on**
- Allow local dev bypass: **on**
- OIDC issuer URL: `http://localhost:8081/realms/bridge-local`
- OIDC client ID: `bridge-local-web`
- OIDC client secret: `<copy from Keycloak client credentials>`
- Frontend base URL: `http://localhost:5173`
- Callback path: `/api/auth/callback`
- Session cookie name: `bridge_session`
- Session JWT signing secret: set a strong local-only value
- Session TTL seconds: `28800`

You can usually leave these blank for local testing unless your IdP requires them:
- discovery URL override
- audience

Default scopes should work:
- `openid profile email`

## 6) Test the flow

1. Start BRIDGE backend/frontend normally
2. Open `http://localhost:5173`
3. You should be redirected to `/login`
4. Click **Continue with SSO**
5. Sign in via Keycloak
6. BRIDGE should return you to the app with a valid session cookie
7. Click **Logout** and verify you return to Login

## 7) Quick fallback during development

If you don't want to go through the IdP during a coding loop:
- keep **Allow local dev bypass** enabled
- use the **Local dev bypass** button on the Login page

## Notes

- BRIDGE protects `/api/*` when auth is enabled.
- The frontend also protects app routes and redirects unauthenticated users to `/login`.
- Local dev works best with the frontend dev server proxying `/api` to the backend, as already configured in Vite.
