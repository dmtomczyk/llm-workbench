# Implementation slices

This file tracks the current execution plan for the OpenAPI Web Client Wrapper build.

## Slice 1 — Foundation and runtime spine

**Status:** in progress / mostly scaffolded

Scope:
- monorepo scaffold
- backend app skeleton
- config loader
- SQLite schema + Alembic baseline
- request/correlation middleware
- audit service + audit API
- plugin discovery/registry sync
- provider CRUD/test/invoke baseline
- frontend shell

Delivered so far:
- `backend/` FastAPI scaffold
- `frontend/` React/Vite scaffold
- `plugins/` built-in plugin packages/manifests
- audit API and provider API
- seeded prompt templates

## Slice 2 — Imports and datasets

**Status:** next active build slice

Goal:
- upload files into managed storage
- create `dataset`, `dataset_version`, and `import_record` rows
- parse supported formats into normalized payloads
- provide dataset/import listing and preview APIs
- audit file imports and normalization events

Target endpoints:
- `POST /api/imports/files`
- `GET /api/imports`
- `GET /api/imports/{import_id}`
- `GET /api/datasets`
- `GET /api/datasets/{dataset_id}`
- `GET /api/datasets/{dataset_id}/preview`
- `POST /api/datasets/{dataset_id}/normalize`

## Slice 3 — Manual workbench run

**Status:** next active build slice

Goal:
- select uploaded dataset or parsed content
- choose prompt template + provider/model
- render prompt server-side
- invoke provider through shared provider runtime
- create run + run_step + llm_interaction + audit rows
- return rendered output and raw payloads to UI

Target endpoints:
- `GET /api/templates`
- `POST /api/templates`
- `GET /api/templates/{template_id}`
- `PATCH /api/templates/{template_id}`
- `DELETE /api/templates/{template_id}`
- `POST /api/workbench/run`

## Slice 4 — OpenAPI + connectors operator layer

**Status:** next active build slice

Goal:
- import OpenAPI specs and extract operation inventory/security schemes
- configure/test generic OpenAPI-backed providers
- expose connector CRUD/test/action APIs and a basic operator UI
- keep all external calls audit-linked

Target endpoints:
- `POST /api/openapi/specs/import`
- `GET /api/openapi/specs`
- `GET /api/openapi/specs/{spec_id}`
- `GET /api/openapi/specs/{spec_id}/operations`
- `GET /api/connectors`
- `POST /api/connectors`
- `GET /api/connectors/{connector_id}`
- `PATCH /api/connectors/{connector_id}`
- `POST /api/connectors/{connector_id}/test`
- `POST /api/connectors/{connector_id}/actions/{action_name}`

## Notes

- Plugin packages live in the project-local `plugins/` directory so the backend can discover them without rebuilding core code.
- Connector implementations can start as health-checked stubs so the operator surfaces exist before each integration is fully wired.
- After these slices, the next major step is workflow/scheduler execution and export UX.
