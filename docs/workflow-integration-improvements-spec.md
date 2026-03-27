# Workflow Integration Improvements Spec

This spec defines the next UX/integration slice after import recipes, HTTP support, transforms, and HTTP hardening.

## Goal

Reduce friction between:
- import runs
- datasets
- workbench
- workflows
- automations

## MVP scope

### Included
- direct action links from import run detail to:
  - Workbench
  - Workflows
  - Automations
- URL query-param handoff for dataset/provider/template/workflow context
- receiving pages honor those query params and prefill the relevant controls
- clearer dataset/version visibility in import run detail

### Excluded
- a full shared global state/store
- dataset detail page
- multi-step “wizard” flow
- workflow suggestions/recommendations engine

## Query-param contract

### Workbench
`/workbench?dataset_id=<id>&provider_id=<id>&template_id=<id>&model=<model>`

### Workflows
`/workflows?workflow_id=<id>&dataset_id=<id>&provider_id=<id>&template_id=<id>&model=<model>`

### Automations
`/automations?target_type=workflow&workflow_id=<id>`

or

`/automations?target_type=template_prompt&dataset_id=<id>&provider_id=<id>&template_id=<id>&model=<model>`

## Acceptance criteria

1. Successful import runs show links to open the dataset in Workbench and seed related pages.
2. Workbench honors incoming dataset/provider/template/model query params.
3. Workflows honors incoming workflow/dataset/provider/template/model query params.
4. Automations honors incoming target/workflow/dataset/provider/template/model query params.
5. No existing flows are broken if no query params are present.
