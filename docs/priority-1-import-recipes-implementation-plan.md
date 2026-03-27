# Priority 1 Implementation Plan: Internal Source Ingestion + Saved Import Recipes

This plan turns the top roadmap priority into a concrete implementation path for the current BRIDGE codebase.

It is written against the repository state as of 2026-03-26.

---

## Problem statement

Right now BRIDGE can ingest files, parse them into normalized dataset payloads, and let users run them through workbench/workflows/automations.

That is a good start, but it is still too narrow for the target user:

> a software engineer working on an internal WAN with access to internal company tools/sites, but not the public internet.

For that user, the core ingestion problem is not just “upload a file.” It is:

- pull internal data repeatedly from the same sources
- normalize messy exports and internal API responses
- preview and validate the shape before use
- rerun imports reliably without re-entering everything
- create durable datasets that workflows can depend on

The highest-ROI next step is therefore:

> turn the current one-off file import flow into a repeatable import system with saved recipes, better source coverage, and better preview/diagnostics.

---

# Current state in the codebase

## Existing backend ingestion surface

### Routes
Current import/data routes live in:
- `backend/app/api/routes/imports.py`

Current endpoints:
- `POST /api/imports/files`
- `GET /api/imports`
- `GET /api/imports/{import_id}`
- `GET /api/datasets`
- `GET /api/datasets/{dataset_id}`
- `GET /api/datasets/{dataset_id}/preview`
- `POST /api/datasets/{dataset_id}/normalize`

### Service
Current implementation lives in:
- `backend/app/imports/service.py`
- `backend/app/imports/parsers.py`

### Current behavior
Today the system supports:
- file upload ingestion only
- extension allowlist via config
- parser dispatch based on file suffix
- normalization into a saved artifact JSON payload
- dataset + dataset_version + import_record persistence
- preview generation from parser output
- re-normalization of existing datasets

### Supported parsing today
In `FileParser`:
- CSV
- JSON
- TXT
- MD
- EML
- fallback binary
- placeholder unsupported states for:
  - XLSX
  - DOCX
  - PDF
  - MSG

### Current data model pieces already available
Relevant models in `backend/app/db/models.py`:
- `Dataset`
- `DatasetVersion`
- `ImportRecord`

Current strengths:
- datasets are already first-class
- versioning exists conceptually via `DatasetVersion`
- imports are auditable
- normalized payloads are persisted as artifacts

## Existing frontend ingestion surface

The main dataset/import experience currently lives inside:
- `frontend/src/features/workbench/WorkbenchPage.tsx`

Current UX is basically:
- upload a file
- select a dataset/provider/template
- preview dataset
- run workbench

This is useful but limited:
- no dedicated import management page
- no repeatable recipe concept
- no internal URL/API ingest path
- no mapping/transformation UI
- no import diagnostics history page

## Existing adjacent surface: connectors
There is also a connectors page:
- `frontend/src/features/connectors/ConnectorsPage.tsx`
- `backend/app/api/routes/connectors.py`
- `backend/app/connectors/service.py`

This matters because it suggests BRIDGE already has an abstraction for configured external/internal systems. That can be reused or aligned with import recipes later.

---

# Product goal for Priority 1

## Desired user outcome
An engineer should be able to:

1. define a repeatable import from an internal source
2. preview what the imported data will look like
3. save that import definition as a reusable recipe
4. run it again on demand
5. optionally schedule it later via automations or a dedicated sync mechanism
6. see what changed, what failed, and what dataset version was produced

## Examples of target workflows
- import CSV exports from an internal ticket system every morning
- fetch JSON from an internal API endpoint and convert it into a record set
- pull markdown/text from internal docs or runbooks
- keep a “service inventory” dataset refreshed from internal APIs
- normalize inconsistent fields from different internal sources into a stable shape for workflows

---

# Scope recommendation

## In scope for Priority 1 MVP
Build a narrow but high-leverage ingestion system around:

1. **Saved import recipes**
2. **HTTP(S) internal source imports**
3. **Better preview + diagnostics**
4. **Basic field mapping / normalization rules**
5. **Dataset version creation from reruns**

## Explicitly out of scope for the first slice
Avoid these in the first implementation unless they fall out naturally:

- full ETL pipeline builder
- semantic retrieval / vector indexing
- broad connector orchestration framework rewrite
- spreadsheet-grade field transforms
- OAuth/browser-based auth flows
- internet SaaS integrations
- cron/scheduler redesign

The MVP should stay focused on repeatable internal ingestion.

---

# Recommended implementation slices

## Slice 1 — Saved import recipes for file-backed imports

### Why first
This is the smallest path from today’s one-off upload flow to a reusable ingestion system.

### User-facing capability
A user can:
- upload a file
- save the parsing/normalization settings as a named recipe
- rerun the recipe against a new file later
- inspect import results and produced dataset versions

### New concepts
Introduce a first-class **Import Recipe** entity.

### Recommended recipe fields
At minimum:
- `id`
- `name`
- `description`
- `enabled`
- `source_type` (`file_upload`, later `http`, maybe `connector`)
- `dataset_name_template`
- `target_dataset_id` (nullable; if set, reruns append versions to an existing dataset)
- `parser_options_json`
- `transform_rules_json`
- `preview_config_json`
- `created_at`
- `updated_at`
- `last_run_at`
- `last_run_status`

### Backend work
#### Database
Add a new table, likely:
- `import_recipe`

Optional but strongly recommended:
- `import_run` table for recipe executions, distinct from raw `ImportRecord`

Why separate `import_run` from `ImportRecord`?
- `ImportRecord` currently represents the raw upload/import event
- recipes need execution history, status, diagnostics, and parameter snapshots

#### API routes
Add routes like:
- `GET /api/import-recipes`
- `POST /api/import-recipes`
- `GET /api/import-recipes/{recipe_id}`
- `PATCH /api/import-recipes/{recipe_id}`
- `DELETE /api/import-recipes/{recipe_id}`
- `POST /api/import-recipes/{recipe_id}/run`
- `GET /api/import-recipes/{recipe_id}/runs`
- `GET /api/import-runs/{run_id}`

For file-backed MVP, allow `run` to accept either:
- a new uploaded file, or
- a previously staged file reference if you add that concept

#### Service layer
Create something like:
- `backend/app/imports/recipes_service.py`

Responsibilities:
- validate recipe config
- run recipe against provided source input
- produce dataset version
- record diagnostics
- emit audit events

### Frontend work
Add a dedicated feature page:
- `frontend/src/features/imports/ImportsPage.tsx`

Do **not** keep piling ingestion UX into Workbench.

Recommended page sections:
1. Recipe list
2. Create/edit recipe form
3. Run recipe panel
4. Recent runs and diagnostics

### MVP outcome
This slice gives BRIDGE repeatability without yet solving every source type.

---

## Slice 2 — Internal HTTP(S) imports

### Why second
This is likely the highest practical value for an internal-WAN engineer after reusable file imports.

### User-facing capability
A user can define a recipe that fetches data from:
- an internal HTTP(S) URL
- optionally with headers / auth alias / method / request body
- then parses the response as JSON, text, CSV, or raw file-like content

### Recommended source types
Expand recipe `source_type` to include:
- `file_upload`
- `http`

Potential later values:
- `connector`
- `shared_path`
- `openapi_operation`

### HTTP recipe fields
For `source_type=http`, add config like:
- `method`
- `url`
- `headers_json`
- `query_params_json`
- `body_template`
- `content_type`
- `auth_strategy_json`
- `timeout_seconds`
- `tls_verify`
- `ca_bundle_path` (optional, probably later or config-driven)
- `response_format_hint` (`json`, `csv`, `text`, `binary`, `auto`)

### Important internal-network considerations
For this target user, support for these matters a lot:
- custom internal hostnames
- internal TLS cert issues
- bearer/header auth with saved aliases
- timeouts that fail clearly
- no hidden calls to public endpoints

### Backend work
#### New execution path
Add a fetcher component, e.g.:
- `backend/app/imports/fetchers.py`

It should:
- use `httpx`
- support explicit timeout configuration
- support header injection from recipe config
- surface TLS/connectivity errors clearly
- return a normalized intermediate response object

#### Parser changes
Today parsing is file-suffix driven.
That will not be enough for HTTP sources.

Refactor parser entry points to support:
- `parse_file(path, media_type)`
- `parse_bytes(raw_bytes, source_name, media_type)`
- `parse_text(text, source_name, format_hint)`
- `parse_json_object(data, source_name)`

This is a key architectural improvement.

### Frontend work
Recipe form should include HTTP-specific controls:
- method
- URL
- headers JSON
- auth alias
- timeout
- response format hint

And a **Test fetch / Preview** button before saving.

### MVP outcome
This unlocks real internal API ingestion without needing a full connector ecosystem first.

---

## Slice 3 — Preview, diagnostics, and validation improvements

### Why this matters
Imports fail often, especially against internal data. If the system does not explain failures well, engineers will stop trusting it.

### User-facing capability
Before or after saving/running a recipe, the user can see:
- whether fetch succeeded
- parser chosen
- row/sample preview
- warnings
- field shape summary
- errors with actionable details

### Backend work
Introduce richer diagnostics in recipe runs.

Recommended `import_run` fields:
- `id`
- `recipe_id`
- `dataset_id`
- `dataset_version_id`
- `status` (`running`, `success`, `failed`, `warning`)
- `source_snapshot_json`
- `parser_used`
- `warning_count`
- `error_text`
- `diagnostics_json`
- `started_at`
- `finished_at`

Recommended diagnostics payload shape:
- fetch status / timing
- response content type
- parser selected
- preview row count
- row count estimate
- warning messages
- field summary
- normalization summary

### Validation behavior
Add preflight validation for recipes:
- URL required for HTTP source
- unsupported parser options rejected
- malformed headers JSON rejected
- invalid transform rules rejected
- impossible target dataset/rerun settings rejected

### Frontend work
Import recipe UI should show:
- live validation before save
- preview output before run when possible
- run status history
- diagnostics details on failure

### MVP outcome
Users can debug bad data and configuration mistakes without reading backend logs first.

---

## Slice 4 — Mapping and normalization rules

### Why this matters
This is where ingestion becomes truly useful instead of merely pass-through.

### User-facing capability
Users can define lightweight normalization rules like:
- rename field `ticketId` → `ticket_id`
- drop noisy field `html_blob`
- keep only selected columns
- derive field `team` from another field or static value
- flatten a nested object path

### Keep the first version intentionally small
Avoid a giant transformation language.

### Recommended MVP transform rule types
For record-set shaped data, support only:
- `rename_fields`
- `drop_fields`
- `keep_fields`
- `add_static_fields`
- `field_path_extract`

Optional later:
- simple templated derived fields
- row filters
- type coercions

### Backend work
Add a transform stage between parse and persist:
- parse raw source into normalized intermediate payload
- if payload is record-set, apply transform rules
- recalculate preview and field summary
- persist dataset version artifact

Recommended module:
- `backend/app/imports/transforms.py`

### Frontend work
Do not start with a giant spreadsheet editor.
Use a structured JSON-backed form:
- rename pairs
- keep/drop multiselect or tag input
- static key/value list
- nested field extract rules

### MVP outcome
The resulting datasets become much more stable inputs for templates/workflows.

---

## Slice 5 — Reruns, versioning, and targeting an existing dataset

### Why this matters
Right now `create_import()` always creates a new dataset.
That is not enough for recurring internal imports.

### User-facing capability
A recipe can either:
- create a new dataset on first run, then append versions to it on reruns, or
- target an existing dataset explicitly

### Required backend changes
Modify import execution logic so that recipes can:
- reuse `Dataset.id`
- increment `Dataset.latest_version_no`
- insert a new `DatasetVersion`
- update dataset metadata and timestamps

This is one of the most important gaps in the current ingestion service.

### Proposed rules
- one-off upload route can keep current behavior for now
- recipe runs should prefer versioning into an existing dataset
- checksum comparison can optionally skip duplicate versions later

### Nice-to-have but not required for first pass
- “no changes detected” short-circuit
- version diff summary
- dataset retention policies

---

# Proposed architecture changes

## 1. Separate source acquisition from parsing
Current state couples import to uploaded files.

Refactor toward:
- **source acquisition**: upload / HTTP / connector / file path
- **parsing**: CSV / JSON / text / email / binary
- **transformation**: rename/drop/derive/filter
- **persistence**: dataset + version + run records

This separation is the most important structural change.

## 2. Add recipe-oriented services instead of overloading ImportService
Recommended shape:
- `ImportService` keeps basic low-level dataset/import operations
- `ImportRecipeService` handles recipe CRUD and execution
- shared helpers under imports package:
  - `fetchers.py`
  - `parsers.py`
  - `transforms.py`
  - `diagnostics.py`

## 3. Preserve compatibility with existing workbench/workflow consumers
Do not break these existing consumers:
- Workbench
- Workflows
- Automations

Those features depend mainly on:
- dataset IDs
- latest dataset version normalized payloads
- preview visibility

So the ingestion redesign should expand dataset creation/versioning, not replace it.

---

# Data model proposal

## New table: `import_recipe`
Suggested fields:
- `id`
- `name`
- `description`
- `enabled`
- `source_type`
- `target_dataset_id`
- `dataset_name_template`
- `source_config_json`
- `parser_options_json`
- `transform_rules_json`
- `preview_config_json`
- `last_run_at`
- `last_run_status`
- `created_at`
- `updated_at`

## New table: `import_run`
Suggested fields:
- `id`
- `recipe_id`
- `dataset_id`
- `dataset_version_id`
- `status`
- `source_type`
- `source_snapshot_json`
- `parser_used`
- `warning_count`
- `error_text`
- `diagnostics_json`
- `created_at`
- `started_at`
- `finished_at`

## Optional future table: `dataset_schema_profile`
Not needed immediately, but later could track:
- inferred field names
- types
- shape summaries
- schema drift warnings

---

# API proposal

## Recipe CRUD
- `GET /api/import-recipes`
- `POST /api/import-recipes`
- `GET /api/import-recipes/{recipe_id}`
- `PATCH /api/import-recipes/{recipe_id}`
- `DELETE /api/import-recipes/{recipe_id}`

## Recipe execution
- `POST /api/import-recipes/{recipe_id}/run`
- `GET /api/import-recipes/{recipe_id}/runs`
- `GET /api/import-runs/{run_id}`

## Preview/testing helpers
Strongly recommended:
- `POST /api/import-recipes/preview`

This endpoint should:
- validate source config
- fetch sample data if needed
- parse it
- apply transform rules
- return preview + diagnostics
- not necessarily persist anything

That gives the frontend a good “Test recipe” flow.

## Keep existing routes
Keep these routes for backwards compatibility and simple one-off file uploads:
- `POST /api/imports/files`
- `GET /api/datasets`
- `GET /api/datasets/{dataset_id}/preview`

The new recipe system should build on top of them conceptually, not remove them immediately.

---

# Frontend proposal

## New dedicated Imports page
Add a first-class nav item and page:
- route: `/imports`
- file: `frontend/src/features/imports/ImportsPage.tsx`

### Why a dedicated page
The current Workbench page is doing too much:
- upload
- preview
- provider selection
- template selection
- run execution
- result inspection

Ingestion deserves its own surface.

## Page layout recommendation
### Left column
- recipe list
- create button
- filters by source type/status

### Main pane
Tabs or sections:
1. Recipe details
2. Source config
3. Parser/transform config
4. Preview/test
5. Run history

## MVP UI features
- create/edit recipe form
- test recipe button
- run now button
- preview rows/sample
- diagnostics panel
- recent runs list
- link to resulting dataset

## Reuse in Workbench
After the imports page exists, Workbench should continue consuming datasets but not own ingestion complexity.

---

# Validation and diagnostics requirements

## Validation should happen in three places
1. frontend form validation
2. API/schema validation
3. execution-time diagnostics

## Minimum validation rules
- source type supported
- required fields present for source type
- parser options syntactically valid
- transform config syntactically valid
- target dataset exists if referenced
- URL format valid for HTTP recipes
- timeout value reasonable

## Diagnostics should answer these questions
When a run fails, users should quickly know:
- did the fetch fail?
- did auth fail?
- did TLS fail?
- did parsing fail?
- did transform rules fail?
- did persistence fail?
- was a dataset version created or not?

---

# Recommended MVP delivery order

## Milestone 1 — Recipe foundation
Deliver:
- `import_recipe` table
- recipe CRUD API
- dedicated imports page skeleton
- file-upload-backed recipes
- run history records

### Success criteria
- user can save and rerun a file-based import definition
- resulting runs are visible and auditable
- recipe reruns can create dataset versions instead of new datasets only

## Milestone 2 — HTTP recipe support
Deliver:
- HTTP source config
- fetcher implementation
- preview/test endpoint
- internal-network-focused diagnostics

### Success criteria
- user can fetch internal JSON/text/CSV via URL
- fetch failures are clearly classified
- preview works before committing a run

## Milestone 3 — Transform rules
Deliver:
- basic transform engine
- UI for rename/drop/keep/static fields
- diagnostics showing pre/post shape summary

### Success criteria
- user can stabilize messy source data into a cleaner dataset shape
- workflows can depend on more predictable fields

## Milestone 4 — UX polish and linking
Deliver:
- link recipe run → dataset → workbench/workflow usage
- better filtering/search
- run detail pages
- stale recipe / failed recipe visibility

### Success criteria
- imports feel like a first-class workflow surface, not a side utility

---

# Suggested tickets for the first sprint

## Backend
1. Add `ImportRecipe` model + migration
2. Add `ImportRun` model + migration
3. Add recipe schemas
4. Add recipe CRUD routes
5. Add recipe execution service for file-backed imports
6. Refactor parser to support bytes/text inputs, not only files
7. Update dataset version creation logic for reruns into existing datasets

## Frontend
8. Add `/imports` route and nav entry
9. Build imports page with recipe list + create/edit form
10. Add run history panel
11. Add run-now action for file-backed recipe execution
12. Add dataset/result linking

## Follow-up
13. Add preview/test endpoint
14. Add HTTP source config form + backend fetcher
15. Add transform rules MVP

---

# Risks and design cautions

## 1. Don’t overload connectors prematurely
Connectors and import recipes overlap, but they are not identical.

Recommendation:
- keep recipes focused on ingestion behavior
- optionally allow recipes to reference connectors later
- do not block MVP on redesigning connectors

## 2. Don’t make transforms too smart too early
A small reliable transform system beats a powerful opaque one.

## 3. Don’t keep all ingestion UX inside Workbench
Workbench should consume datasets, not become the universal admin panel.

## 4. Be careful with HTTP diagnostics and secret handling
Headers, auth aliases, and failure details must not leak secrets into logs/audit details.

## 5. Preserve dataset compatibility
Existing workflows, workbench runs, and automations should continue to work with newly imported datasets and versions.

---

# Recommendation summary

If we want the highest-ROI first implementation for internal-WAN engineering users, the right first move is:

## Build this first
1. **Saved import recipes for file-backed imports**
2. **Dataset-versioning reruns**
3. **Dedicated imports page**
4. **Import run history + diagnostics**

## Then immediately follow with
5. **HTTP internal source recipes**
6. **Test/preview endpoint**
7. **Basic mapping/transformation rules**

That sequence gives BRIDGE a fast path from:
- one-off file upload demo behavior

to:
- repeatable internal data ingestion that engineers can actually build workflows on top of.

---

# Recommended immediate next action

The best next execution step is:

> implement **Milestone 1** as a concrete build plan with API shapes, model/schema definitions, and frontend page structure.

That should be the next doc or coding step.
