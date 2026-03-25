# OpenAPI Web Client Wrapper

## Current slice

Implemented so far:

- monorepo scaffold for backend, frontend, plugins, data, and docs
- FastAPI backend skeleton
- YAML + env-backed config loader
- SQLite schema models + Alembic baseline migration
- request/correlation ID middleware
- audit event service + audit API
- plugin manifest validation and registry sync
- seeded built-in plugin manifests
- provider CRUD / test / invoke routes
- seed prompt template loader
- React/Vite shell with dashboard, providers, plugins, and audit pages

## Repo layout

- `backend/` — FastAPI app and Alembic migration baseline
- `frontend/` — React/Vite SPA scaffold
- `plugins/` — built-in provider, connector, transformer, and exporter manifests/classes
- `data/` — runtime storage for imports, artifacts, exports, and logs

## One-command bootstrap

```bash
cd ~/code/foss-projects/llm-intf-client
./bootstrap.sh
```

Optional flags:

```bash
./bootstrap.sh --with-dev
./bootstrap.sh --with-dev --with-parsers
```

## One-command dev run

```bash
cd ~/code/foss-projects/llm-intf-client
./run-dev.sh
```

Environment overrides if needed:

```bash
BACKEND_PORT=8081 FRONTEND_PORT=5174 ./run-dev.sh
```

## Backend quickstart

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
uvicorn app.main:app --reload --host 0.0.0.0 --port 8080
```

## Frontend quickstart

```bash
cd frontend
npm install
npm run dev
```

Frontend expects the backend on `http://localhost:8080` and proxies `/api` there.

## Notes

- Provider calls are wired for OpenAI-compatible and generic OpenAPI invocation, but no real endpoint/secret is configured yet.
- Connector plugins are scaffolded and registered, but their network logic is still stubbed.
- Imports/workbench/workflows/scheduler/export UI are next.
