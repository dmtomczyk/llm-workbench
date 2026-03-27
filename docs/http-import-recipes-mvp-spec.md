# HTTP / Internal URL Import Recipes MVP Spec

This spec defines the next implementation slice after saved file-backed import recipes:

> add `source_type=http` import recipes, preview/test support, and internal-network-friendly diagnostics.

The target user is a software engineer operating on an internal WAN with access to internal sites/APIs but no public internet.

---

## Goal

Allow BRIDGE users to create import recipes that fetch data from internal HTTP(S) endpoints, preview the parsed result before saving or running, and then persist the result into datasets using the same create-new vs append-to-dataset modes already supported for file-backed recipes.

---

## MVP scope

### Included
- `source_type=http`
- recipe config for URL, method, headers, timeout, response format hint
- recipe preview/test endpoint
- recipe run without uploaded file for HTTP sources
- JSON / CSV / text response parsing
- diagnostics for timeout / HTTP error / parse error / TLS/connection failure

### Excluded
- auth secret management beyond plain header JSON in recipe config
- request body editor beyond optional raw text
- connector-backed HTTP recipes
- scheduling/sync UI
- advanced transforms
- pagination / incremental sync

---

## User stories

1. As an engineer, I can define a recipe against an internal URL so I can fetch data without exporting files manually.
2. As an engineer, I can preview/test the recipe before running it so I can validate parsing and shape.
3. As an engineer, I can persist the fetched result as a new dataset or a new version of an existing dataset.
4. As an engineer, I can understand whether failures are due to connectivity, TLS, HTTP status, or parsing.

---

## Backend changes

### Data model
Extend `ImportRecipe` with:
- `source_config_json` TEXT NOT NULL DEFAULT '{}'

This stores source-specific config for both file and HTTP recipes.

### Source config shape for HTTP
```json
{
  "method": "GET",
  "url": "http://internal.service.local/export.csv",
  "headers": {"X-Api-Key": "..."},
  "timeout_seconds": 15,
  "response_format_hint": "auto",
  "body": null
}
```

### Schema changes
Update `ImportRecipeCreate`, `ImportRecipeUpdate`, `ImportRecipeRead` to include:
- `source_type: Literal['file_upload', 'http']`
- `source_config: dict[str, Any]`

Add preview schemas:
- `ImportRecipePreviewRequest`
- `ImportRecipePreviewResponse`

### New endpoint
- `POST /api/import-recipes/preview`

Behavior:
- validate payload
- for `source_type=http`, fetch resource
- parse it
- return diagnostics + preview only
- no dataset persistence

### Run endpoint behavior
Existing route becomes:
- `POST /api/import-recipes/{recipe_id}/run`

Behavior:
- for `file_upload`, uploaded file is still required
- for `http`, no file is required

### Parsing changes
Refactor parser support to parse from bytes/text, not just paths:
- `parse_bytes(raw_bytes, source_name, media_type, format_hint='auto')`

MVP parser behavior:
- if format hint says `json`, parse as JSON
- if `csv`, parse as CSV
- if `text`, parse as text
- if `auto`, prefer media type and file extension heuristics

### HTTP fetcher
Add `backend/app/imports/fetchers.py` with a small `HttpImportFetcher` using `httpx`.

Diagnostics to capture:
- URL
- method
- response status
- content-type
- elapsed_ms
- error type (`timeout`, `connect_error`, `http_status_error`, `parse_error`, `tls_error`)

---

## Frontend changes

### Imports page
Extend `/imports` page to support source type selection:
- File upload
- HTTP / Internal URL

### HTTP recipe form fields
- source type select
- method select (`GET`, `POST`)
- URL input
- headers JSON textarea
- timeout seconds input
- response format hint select (`auto`, `json`, `csv`, `text`)
- optional raw request body textarea

### Preview/test UX
Add a `Test recipe` button.

Behavior:
- sends current unsaved form config to `/api/import-recipes/preview`
- shows diagnostics and sample preview in a card
- if successful, user can then save or run with confidence

### Run UX
For `source_type=http`:
- hide file input
- run button triggers recipe execution directly

---

## Acceptance criteria

1. User can create and save an HTTP import recipe.
2. User can preview/test an HTTP recipe and see parsed preview output.
3. User can run an HTTP recipe without uploading a file.
4. Run history records parser/media type/diagnostics similarly to file recipes.
5. Existing file recipe behavior remains intact.

---

## Implementation order

1. Add `source_config_json` to model + migration.
2. Expand recipe schemas for `source_type=http`.
3. Add HTTP fetcher.
4. Refactor parser for bytes/text input.
5. Add preview endpoint.
6. Extend recipe run service for HTTP recipes.
7. Update `/imports` page UI.
8. Build-check and bounded smoke test with a local HTTP server.
