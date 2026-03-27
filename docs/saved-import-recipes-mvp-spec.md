# Saved Import Recipes MVP Spec

This spec defines the first implementation slice for Priority 1:

> saved import recipes for file-backed imports, with dataset-versioning reruns, run history, and a dedicated imports page.

This is intended to be specific enough to implement directly.

---

# 1. MVP goal

## Product goal
Turn BRIDGE’s current one-off file upload ingestion into a repeatable ingestion workflow.

## User outcome
A user can:
- create a reusable import recipe
- associate that recipe with a dataset creation/versioning strategy
- run the recipe against an uploaded file
- produce a dataset or a new dataset version
- inspect run history and diagnostics

## Explicit MVP boundaries
### Included
- file-backed recipes only
- recipe CRUD
- recipe run history
- rerun into existing dataset as new version
- dedicated imports page
- basic diagnostics and validation

### Excluded from this MVP
- HTTP/internal URL source imports
- scheduling/sync automation for recipes
- advanced transforms UI
- connector-backed recipes
- semantic retrieval/search
- full schema-diff tooling

---

# 2. User stories

## Story A — Create reusable recipe
As an engineer, I want to define a named import recipe so I do not have to re-enter the same ingestion settings every time.

## Story B — Rerun recipe against new file
As an engineer, I want to rerun an existing recipe with a new file so I can refresh a dataset without rebuilding it manually.

## Story C — Version an existing dataset
As an engineer, I want reruns to append dataset versions instead of always creating a brand-new dataset so workflows can keep referencing a stable dataset ID.

## Story D — Inspect what happened
As an engineer, I want to see import run status, parser used, preview info, warnings, and errors so I can trust and debug ingestion.

## Story E — Link imported datasets to downstream work
As an engineer, I want to jump from recipe runs to the resulting dataset so I can use it in workbench/workflows.

---

# 3. UX overview

## New route
Add:
- `/imports`

## Navigation
Add `Imports` to the main nav.

## Page structure
The page should be a 2-column layout similar to the current BRIDGE admin pages.

### Left column
**Import recipes**
- recipe list
- create new recipe button/state
- click a recipe to edit/view details

### Right column
Two stacked cards:

#### Card 1 — Recipe editor
Fields:
- Recipe name
- Description
- Enabled
- Target dataset mode
  - create new dataset each run
  - append versions to an existing dataset
- Existing dataset selector (if append mode)
- Dataset name template/default name
- Allowed file types display/hint

#### Card 2 — Run recipe / recent runs
Sections:
- upload file and run now
- recent runs list
- run detail panel
- link to resulting dataset

## MVP interaction flow
### Create flow
1. User opens `/imports`
2. Clicks “New recipe”
3. Enters name/description
4. Chooses dataset strategy
5. Saves recipe

### Run flow
1. User selects recipe
2. Chooses file
3. Clicks “Run recipe”
4. Sees run status and result
5. Sees dataset/dataset version created

### Review flow
1. User clicks prior run
2. Sees parser, file metadata, preview summary, warnings, dataset result, and any error

---

# 4. MVP functional behavior

## 4.1 Recipe behavior
A recipe is a saved definition for a file-backed import.

### Recipe config in MVP
- source type is always `file_upload`
- parser is inferred from file suffix using existing parser logic
- no custom transform rules beyond placeholder JSON fields
- file is supplied at run time, not stored inside the recipe

## 4.2 Dataset targeting modes
MVP supports two modes:

### Mode A — Create new dataset on each run
Use when the user wants each import to stand alone.

Behavior:
- each run creates a new `Dataset`
- each new dataset gets version `1`

### Mode B — Append version to existing dataset
Use when the user wants stable dataset identity over time.

Behavior:
- recipe references an existing dataset ID
- each successful run creates a new `DatasetVersion`
- `Dataset.latest_version_no` increments
- existing workflows can continue referencing the stable dataset ID

## 4.3 Run results
Each recipe run should record:
- file metadata
- parser used
- checksum
- status
- warnings
- preview summary
- resulting dataset ID
- resulting dataset version ID
- timestamps
- error text if failed

## 4.4 Validation rules
### Recipe validation
- name required
- source type must be `file_upload`
- dataset mode required
- if append mode is selected, `target_dataset_id` is required and must exist
- if create-new mode is selected, `dataset_name_template` or default dataset name is required

### Run validation
- file required
- filename required
- extension must be allowed by config
- target dataset must still exist if append mode

---

# 5. Backend design

## 5.1 New database tables

### Table: `import_recipe`
Suggested columns:
- `id` TEXT PK
- `name` TEXT NOT NULL
- `description` TEXT NULL
- `enabled` INTEGER NOT NULL DEFAULT 1
- `source_type` TEXT NOT NULL
- `target_mode` TEXT NOT NULL
  - values: `create_new_dataset`, `append_to_dataset`
- `target_dataset_id` TEXT NULL
- `dataset_name_template` TEXT NULL
- `parser_options_json` TEXT NOT NULL DEFAULT '{}'
- `transform_rules_json` TEXT NOT NULL DEFAULT '{}'
- `preview_config_json` TEXT NOT NULL DEFAULT '{}'
- `last_run_at` TEXT NULL
- `last_run_status` TEXT NULL
- `created_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
- `updated_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP

### Table: `import_run`
Suggested columns:
- `id` TEXT PK
- `recipe_id` TEXT NOT NULL
- `dataset_id` TEXT NULL
- `dataset_version_id` TEXT NULL
- `status` TEXT NOT NULL
  - values: `created`, `running`, `success`, `failed`
- `source_type` TEXT NOT NULL
- `original_filename` TEXT NULL
- `storage_path` TEXT NULL
- `parser_used` TEXT NULL
- `media_type` TEXT NULL
- `byte_size` INTEGER NULL
- `checksum` TEXT NULL
- `warning_count` INTEGER NOT NULL DEFAULT 0
- `error_text` TEXT NULL
- `details_json` TEXT NOT NULL DEFAULT '{}'
- `started_at` TEXT NULL
- `finished_at` TEXT NULL
- `created_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP

## 5.2 Why a new `import_run` table
Do not reuse `ImportRecord` as the sole recipe-run record.

Reason:
- `ImportRecord` represents a low-level import artifact/event
- recipe runs need recipe linkage, status lifecycle, and richer run-oriented history

You may still choose to create an `ImportRecord` during recipe execution for continuity, but the UI/API should center on `import_run`.

## 5.3 Model changes
Files to update:
- `backend/app/db/models.py`
- Alembic migration file(s)

Add ORM models for:
- `ImportRecipe`
- `ImportRun`

Potentially leave `ImportRecord` in place unchanged for one-off uploads and compatibility.

---

# 6. Backend API spec

## 6.1 Recipe schemas
Add new schemas under something like:
- `backend/app/imports/schemas.py`

### `ImportRecipeCreate`
Fields:
- `name: str`
- `description: str | None = None`
- `enabled: bool = True`
- `source_type: Literal['file_upload']`
- `target_mode: Literal['create_new_dataset', 'append_to_dataset']`
- `target_dataset_id: str | None = None`
- `dataset_name_template: str | None = None`
- `parser_options: dict[str, Any] = {}`
- `transform_rules: dict[str, Any] = {}`
- `preview_config: dict[str, Any] = {}`

### `ImportRecipeUpdate`
All fields optional.

### `ImportRecipeRead`
Fields:
- all persisted recipe fields
- maybe include `target_dataset_name` for convenience if join/lookups are cheap

## 6.2 Run schemas
### `ImportRecipeRunResponse`
Fields:
- `ok: bool`
- `run_id: str`
- `recipe_id: str`
- `status: str`
- `dataset_id: str | None`
- `dataset_version_id: str | None`
- `message: str | None`

### `ImportRunRead`
Fields:
- all persisted run fields
- parsed `details`

### `ImportRunsResponse`
Fields:
- `runs: list[ImportRunRead]`

## 6.3 API routes
Add new routes in something like:
- `backend/app/api/routes/import_recipes.py`

### CRUD
- `GET /api/import-recipes`
- `POST /api/import-recipes`
- `GET /api/import-recipes/{recipe_id}`
- `PATCH /api/import-recipes/{recipe_id}`
- `DELETE /api/import-recipes/{recipe_id}`

### Runs
- `POST /api/import-recipes/{recipe_id}/run`
  - multipart form with uploaded file
- `GET /api/import-recipes/{recipe_id}/runs`
- `GET /api/import-runs/{run_id}`

## 6.4 Response examples
### Create recipe response
```json
{
  "id": "impr_123",
  "name": "Nightly ticket CSV",
  "description": "Reusable import for exported ticket CSV files",
  "enabled": true,
  "source_type": "file_upload",
  "target_mode": "append_to_dataset",
  "target_dataset_id": "ds_abc",
  "dataset_name_template": null,
  "parser_options": {},
  "transform_rules": {},
  "preview_config": {},
  "last_run_at": null,
  "last_run_status": null,
  "created_at": "2026-03-26T22:00:00Z",
  "updated_at": "2026-03-26T22:00:00Z"
}
```

### Run response
```json
{
  "ok": true,
  "run_id": "imprun_456",
  "recipe_id": "impr_123",
  "status": "success",
  "dataset_id": "ds_abc",
  "dataset_version_id": "dsv_789",
  "message": "Imported 128 rows into dataset ds_abc version 4"
}
```

---

# 7. Backend service design

## 7.1 New service
Add:
- `ImportRecipeService`

Suggested file:
- `backend/app/imports/recipes_service.py`

## 7.2 Responsibilities
### Recipe CRUD
- create recipe
- list recipes
- get recipe
- update recipe
- delete recipe

### Recipe execution
- validate recipe + uploaded file
- create `ImportRun`
- parse uploaded file using existing parser flow
- create or update dataset + dataset version
- save normalized artifact
- update run status/details
- update recipe last-run metadata
- record audit events

## 7.3 Execution algorithm
### Run flow pseudocode
1. load recipe by ID
2. validate recipe enabled/config
3. validate upload exists and extension is allowed
4. create `ImportRun(status='running')`
5. store uploaded raw file under imports storage path
6. parse file using `FileParser`
7. if target mode is `create_new_dataset`
   - create dataset
   - create dataset version 1
8. if target mode is `append_to_dataset`
   - load target dataset
   - compute next version number
   - create new dataset version
   - update dataset latest version number
9. persist run success details
10. update recipe `last_run_at`, `last_run_status`
11. emit audit events
12. return run response

### Failure behavior
On failure:
- mark `ImportRun.status='failed'`
- store `error_text`
- keep diagnostics in `details_json`
- update recipe `last_run_status='failed'`
- do not partially create inconsistent dataset/version rows

Use transaction boundaries carefully.

## 7.4 Reuse of existing code
Existing code from `ImportService.create_import()` should be extracted/reused for:
- checksum generation
- raw file storage
- media type inference
- normalized artifact persistence
- parser execution

## 7.5 Recommended refactor
Refactor current import implementation into reusable helpers rather than duplicating logic.

Potential helper methods in `ImportService` or a shared helper module:
- `validate_upload()`
- `persist_uploaded_file()`
- `parse_uploaded_file()`
- `write_normalized_artifact()`
- `create_dataset_version()`

---

# 8. Dataset versioning rules

## 8.1 Create-new mode
Behavior:
- new dataset ID
- version number = 1
- dataset `latest_version_no = 1`

Dataset name source:
- `dataset_name_template` if set
- otherwise recipe name
- optionally fallback to uploaded filename stem

## 8.2 Append mode
Behavior:
- require `target_dataset_id`
- find current latest version number
- next version number = latest + 1
- create new `DatasetVersion`
- update `Dataset.latest_version_no`
- keep dataset metadata stable unless explicitly updated later

## 8.3 Preview metadata
For each new dataset version, preserve current behavior of storing:
- preview
- warnings
- row count
- normalized payload path

---

# 9. Audit/event expectations

Record at least these audit events:

## Recipe events
- `import_recipe.created`
- `import_recipe.updated`
- `import_recipe.deleted`

## Run events
- `import_recipe.run_started`
- `import_recipe.run_succeeded`
- `import_recipe.run_failed`

## Dataset events
Continue or extend current events:
- `dataset.normalized`
- potentially `dataset.version_created`

Audit payloads must avoid leaking secrets, but this MVP is file-only so secret risk is low.

---

# 10. Frontend component spec

## 10.1 New page
Add:
- `frontend/src/features/imports/ImportsPage.tsx`

## 10.2 Route wiring
Update:
- `frontend/src/App.tsx`
- `frontend/src/routes/nav.ts`
- maybe layout nav labels

Add route:
- `/imports`

## 10.3 Page state
The page needs:
- recipe list
- selected recipe ID
- create/edit form state
- dataset list for append-mode selection
- run history for selected recipe
- selected run detail
- create/update/delete status messages
- upload/run status messages

## 10.4 Frontend data types
Add types like:
- `ImportRecipe`
- `ImportRun`
- `DatasetSummary`

## 10.5 UI cards
### Card A — Recipes list
Displays:
- name
- target mode
- last run status
- last run time
- enabled/disabled

### Card B — Recipe editor
Fields:
- name
- description
- enabled checkbox
- target mode select
- dataset selector if append mode
- dataset name template if create-new mode

Buttons:
- save/create
- delete
- cancel/reset

### Card C — Run recipe
Fields:
- file input
- run button

Displays:
- last run status message
- resulting dataset link text

### Card D — Run history/detail
List recent runs with:
- status
- filename
- parser used
- created/finished times
- resulting dataset version

Detail panel shows:
- parser used
- byte size
- checksum
- warning count
- preview summary
- raw details JSON in expandable section
- error text if failed

## 10.6 Reuse of existing styling patterns
Use existing BRIDGE UI patterns:
- list panels
- detail card
- muted helper text
- stack/grid cards
- session-style selectable list buttons if appropriate

Keep it consistent with Providers / Workflows / Automations pages.

---

# 11. Error handling and diagnostics spec

## Recipe-level errors
Show inline validation before save when possible.

Examples:
- “Append mode requires an existing dataset.”
- “Dataset name is required when creating a new dataset each run.”

## Run-level errors
Display clearly in run history/detail:
- unsupported extension
- parser failure
- missing target dataset
- malformed file contents
- storage write failure

## Diagnostics payload
Recommended `details_json` shape:
```json
{
  "preview": {"type": "record_set", "sample_items": []},
  "warnings": [],
  "parser_used": "csv",
  "row_count": 128,
  "dataset_action": "appended_version",
  "target_dataset_id": "ds_abc"
}
```

---

# 12. Acceptance criteria

## Backend acceptance
- can create, read, update, delete import recipes
- can run recipe with uploaded file
- create-new mode creates a new dataset + version 1
- append mode creates a new dataset version on an existing dataset
- run history is queryable per recipe
- failed runs persist useful error details
- existing `/api/imports/files` route still works

## Frontend acceptance
- `/imports` page exists and is reachable from nav
- user can create recipe from UI
- user can edit and delete recipe from UI
- user can upload file and run recipe from UI
- user can inspect recent run history and detail
- user can see resulting dataset IDs/version IDs

## Product acceptance
A user can define one recipe for a recurring internal export and reuse it repeatedly without rebuilding the import settings each time.

---

# 13. Implementation order

## Step 1
Add DB models + Alembic migration:
- `ImportRecipe`
- `ImportRun`

## Step 2
Add import recipe schemas and service skeleton.

## Step 3
Implement recipe CRUD routes.

## Step 4
Refactor shared import logic from current `ImportService.create_import()` into reusable helpers.

## Step 5
Implement recipe run execution for file uploads.

## Step 6
Add `/imports` frontend page and route.

## Step 7
Hook up recipe list/editor/run history UI.

## Step 8
Add run-now upload UI and detail panel.

## Step 9
Smoke test:
- create-new mode
- append mode
- bad extension
- parser failure
- dataset selection edge case

---

# 14. Suggested file changes

## Backend
Likely new/updated files:
- `backend/app/db/models.py`
- `backend/alembic/versions/<new_migration>.py`
- `backend/app/imports/schemas.py` (new or expanded)
- `backend/app/imports/recipes_service.py` (new)
- `backend/app/imports/service.py` (refactor shared helpers)
- `backend/app/api/routes/import_recipes.py` (new)
- `backend/app/api/router.py` (register route)

## Frontend
Likely new/updated files:
- `frontend/src/features/imports/ImportsPage.tsx` (new)
- `frontend/src/App.tsx`
- `frontend/src/routes/nav.ts`
- `frontend/src/styles.css` (small additions only if needed)

---

# 15. Post-MVP next step

Once this MVP lands, the immediate follow-on should be:

> add HTTP/internal URL source support using the same recipe/run framework.

That means the MVP should be built with a clean separation between:
- recipe storage
- source acquisition
- parsing
- dataset version persistence

so that HTTP support becomes an additive step rather than a rewrite.

---

# 16. Recommendation checkpoint

This spec recommends implementing **Saved Import Recipes MVP** exactly as:

1. file-backed recipes only
2. dedicated `/imports` page
3. create-new vs append-to-existing dataset modes
4. new `ImportRun` history model
5. reuse/refactor current import parsing and dataset version persistence logic

If approved, implementation should start with:
- data model + migration
- backend recipe CRUD/run service
- frontend `/imports` page
