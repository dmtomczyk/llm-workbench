# BRIDGE

BRIDGE is a local-first LLM operations workbench for experimenting with:

- provider management
- chat sessions
- prompt templates
- datasets + imports
- workbench runs
- workflows
- automations
- audit/history

It is currently **pre-alpha** and best suited for a **single user or a small trusted group on local/private servers**.

## Status

BRIDGE is usable, but still evolving quickly.

Current highlights:
- OpenAI-compatible provider support
- generic OpenAPI provider support
- saved provider tokens with DB-backed storage
- model list discovery for supported providers
- chat sessions with streaming support for OpenAI-compatible providers
- context-window / max-output model profile settings
- dataset imports and previews
- workbench runs with staged progress + run status
- workflows with JSON definitions and step builder helpers
- automations for workflow, raw prompt, and template-backed prompt execution
- audit trail and run history

Current caveats:
- pre-alpha schema churn is still being cleaned up
- some providers/features are more polished than others
- security posture is aimed at trusted local/private deployments first
- token budgeting is heuristic, not tokenizer-exact

## Screenshots

Local UI screenshots live in:

- `docs/screenshots/`

Suggested shots include:
- chat
- providers
- workbench
- workflows
- automations

## Intended deployment model

Right now BRIDGE should be treated as:

- **local-first**
- **single-user or trusted small-team**
- **not hardened for broad internet exposure by default**

If you put it on a public server, you should assume you need to add your own proper auth, network restrictions, and hardening.

## Repo layout

- `backend/` — FastAPI + SQLAlchemy backend
- `frontend/` — Vite/React frontend
- `docs/` — project notes, checklists, and planning docs
- `bootstrap.sh` — local setup helper
- `run-dev.sh` — local dev launcher
- `migrate.sh` — Alembic upgrade helper

## Quickstart

### 1. Bootstrap

```bash
cd ~/code/foss-projects/BRIDGE
./bootstrap.sh
```

### 2. Apply migrations

```bash
./migrate.sh
```

### 3. Run dev

```bash
./run-dev.sh
```

`run-dev.sh` applies Alembic migrations before starting the backend.

## Manual startup

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8080
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Database startup and upgrades

BRIDGE currently supports two database paths:

### Fresh local install
- startup bootstrap still uses `create_all()` to keep fresh local installs simple
- seed data is then applied on startup

### Existing local install / upgrade
- use Alembic migrations to move the schema forward
- recommended command:

```bash
cd ~/code/foss-projects/BRIDGE
./migrate.sh
```

### Current recommendation
For existing databases, treat **Alembic as the source of truth for upgrades**.
The remaining startup `create_all()` / SQLite compatibility behavior is temporary pre-alpha convenience, not the long-term migration strategy.

## Secrets and local data

BRIDGE supports provider secrets in two ways:

- environment variable fallback
- DB-backed saved secrets from the UI

Notes:
- saved provider secrets are masked in settings responses
- local runtime artifacts, databases, `.env*`, and logs should not be committed
- review `.gitignore` before committing local changes from an active dev environment

## Features overview

### Providers
Configure and test providers, discover models, and attach per-model metadata like:
- context window
- max output tokens

### Chat
Chat replays saved session history each turn. For models with configured context limits, BRIDGE estimates token usage, trims older history when needed, and surfaces context-budget info in the UI.

### Workbench
Run datasets through templates/providers, inspect previews, and follow staged progress.

### Workflows
Create reusable step-based definitions (currently prompt-template + provider steps), run them manually, and inspect run status.

### Automations
Schedule:
- workflows
- raw prompts
- template-backed prompts

Supports interval, one-time, and daily schedules.

## Pre-alpha checklist

The current release-prep checklist lives here:

- `docs/pre-alpha-checklist.md`

## Known limitations

- security review is in progress
- some debug/audit surfaces are still being tightened
- migrations/upgrade flow is improving but not fully polished yet
- not all provider plugins support the same level of streaming/model introspection
- long-chat trimming is heuristic and does not yet summarize dropped history

## Contributing / trying it out

If you’re part of an early test group, the most useful bug reports include:

- what page/flow you were using
- provider type
- whether this was a fresh install or upgraded DB
- the exact error shown in the UI
- backend logs / traceback
- whether `./migrate.sh` had been run

## Commit hygiene

Before committing, it’s worth checking:

```bash
git status
./migrate.sh
```

And scanning for obvious secrets or local artifacts:

```bash
grep -RInE "(OPENAI_API_KEY|ANTHROPIC_API_KEY|sk-|Bearer )" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.venv
```

---

If you’re reading this from the repo, assume the codebase is moving fast. Prefer small, reviewable commits and treat local data/secrets as hostile to commits by default.
