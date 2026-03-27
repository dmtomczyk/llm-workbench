# Recipes / Datasets UX Split Spec

This spec defines the next BRIDGE UI/UX cleanup pass focused on data-centric workflows.

## Problem statement

The current product has meaningful import, dataset, workflow, automation, and chat capabilities, but the information architecture is muddy.

### Current problems
1. **Imports page is overloaded**
   - recipe CRUD
   - source config
   - transforms
   - preview/test
   - run execution
   - run history
   - dataset outcomes
   all live in one place.

2. **Datasets are not first-class in the UI**
   - datasets exist in backend APIs and downstream selectors
   - but there is no dedicated page for browsing/inspecting the actual data assets

3. **Chat grounding is hidden and awkward**
   - dataset grounding is only exposed through session create/settings
   - there is no obvious “change dataset” or “clear dataset” control in the main chat flow

4. **Workflow UX is too editor-centric**
   - too much raw-JSON gravity
   - not enough direct guidance around selected datasets, templates, providers, and recent runs

## Goal

Restructure the UI so users can reason about BRIDGE in three clearer layers:

1. **Recipes** — how data gets in repeatedly
2. **Datasets** — what data exists right now
3. **Workflows** — how that data gets turned into useful results

---

# Proposed navigation changes

## Replace current nav concept
Current nav includes `Imports`.

### New nav structure
Replace `Imports` with:
- `Recipes`
- `Datasets`

### Route plan
- `/recipes` → import recipe management and execution
- `/datasets` → dataset browsing, inspection, and actions
- `/imports` → temporary redirect or alias to `/recipes` during transition

## Why this is better
Users should not have to infer that “imports” includes both:
- ingestion definitions
- and the actual imported data

Those are different concepts.

---

# Page responsibilities

## 1. Recipes page

### Purpose
Manage repeatable ingestion definitions.

### Keep on Recipes
- recipe list
- recipe create/edit form
- source config (file/HTTP)
- auth config
- transform rules
- preview/test
- run recipe now
- recent recipe runs

### Remove from Recipes over time
- dataset browsing as a primary concern
- deep inspection of dataset versions/content

### Page structure
#### Left pane
- recipe list
- create new recipe
- last run status
- source type badges

#### Right pane
- recipe editor
- preview/test panel
- recent runs/detail

### Key UX goals
- make “how do I ingest this source?” feel clear
- reduce clutter about downstream usage until after a run succeeds

---

## 2. Datasets page

### Purpose
Provide a first-class place to browse, inspect, and use imported data.

### New capabilities
- list all datasets
- inspect latest version and prior versions
- see preview/sample rows or text snippets
- see source/provenance info
- see whether the dataset came from a recipe/import type
- jump directly into downstream use

### Proposed layout
#### Left pane
Dataset list with:
- name
- source type
- latest version number
- row count if known
- updated time

#### Right pane
Dataset detail with:
- dataset name + ID
- source/provenance
- latest version metadata
- preview/sample rows
- version history list
- actions:
  - Open in Chat
  - Open in Workbench
  - Use in Workflow
  - Seed Automation

### Why this matters
This becomes the center of gravity for the product’s data model.

Users need one clean answer to:
> What data do I actually have, and what can I do with it?

---

## 3. Chat grounding UX cleanup

### Problem
Grounded chat exists, but is buried in session setup/settings and not obvious during active use.

### Proposed improvements
#### In active chat header
If grounded:
- show a grounding bar/pill
- display attached dataset name
- show actions:
  - Change dataset
  - Clear dataset
  - Open dataset in Workbench

#### In session settings
Keep dataset selector there too, but it should not be the only place to manage grounding.

### MVP implementation recommendation
Add a compact inline grounding control in the chat header:
- dropdown/select for dataset
- save/apply button or immediate update
- clear grounding button

### UX goal
Make grounding feel like a core chat capability, not a hidden advanced setting.

---

## 4. Workflow UX cleanup

### Problem
Workflow editing and running work, but they feel clunky and too JSON-heavy.

### Near-term cleanup goals
- make the step builder more primary than raw JSON
- improve visibility of selected dataset/provider/template overrides
- improve recent run/result readability
- strengthen links to/from datasets and workbench

### Scope for this pass
This spec does **not** propose a workflow rewrite.

Instead, it targets:
- better framing
- clearer controls
- better linking
- reduced friction in common paths

### Specific first-pass improvements
- clearer “selected overrides” summary in Run Workflow panel
- more prominent recent run status/output sections
- reduced emphasis on Helpful IDs as the main support pattern
- better empty states and guidance text

---

# Implementation plan

## Phase 1 — information architecture cleanup
1. Add `/datasets` page
2. Add `/recipes` route/page (move current Imports page there)
3. Update nav to show `Recipes` and `Datasets`
4. Keep `/imports` as temporary alias/redirect to `/recipes`

## Phase 2 — chat grounding cleanup
5. Add header-level grounding control to Chat
6. Add clear/change grounding actions
7. Improve grounded session visibility in session list/header

## Phase 3 — workflow UX cleanup
8. Improve Run Workflow panel framing
9. Improve run status/result readability
10. Reduce raw-ID/JSON-heavy friction where possible

---

# Acceptance criteria

## Navigation / structure
1. Nav shows `Recipes` and `Datasets` instead of `Imports`
2. `/recipes` is the primary recipe-management route
3. `/datasets` exists and is useful as a standalone page

## Datasets page
4. User can browse all datasets
5. User can inspect dataset preview and version info
6. User can launch downstream actions from dataset detail

## Chat
7. User can change/clear grounding from the active chat UI
8. Grounded chat remains clearly visible during conversation

## Workflows
9. Workflow run panel is clearer and less clunky
10. Existing workflow functionality continues to work

---

# Suggested implementation order for coding

1. Move Imports page to become Recipes page
2. Build Datasets page using existing dataset APIs
3. Update nav/routes and add `/imports` alias/redirect
4. Add chat header grounding control
5. Do first-pass workflow UX cleanup

---

# Recommendation checkpoint

This spec recommends making **Datasets** a first-class top-level concept and reframing **Recipes** as the ingestion-definition layer.

That is the cleanest next step to reduce UI confusion without rewriting the backend architecture.
