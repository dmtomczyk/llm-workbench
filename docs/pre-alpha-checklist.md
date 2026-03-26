# BRIDGE Pre-Alpha Checklist

This is the short list to get BRIDGE ready for a small, trusted pre-alpha on local servers.

## 0. Release framing

- [ ] Label the release clearly as **pre-alpha / experimental**
- [ ] Document the intended threat model: **single-user / trusted local server first**
- [ ] Add a short "known limitations" section to the README

## 1. Schema safety and upgrades

- [ ] Replace ad-hoc schema drift handling with a real Alembic-first migration flow
- [x] Add follow-up migrations for post-baseline schema changes
- [x] Document upgrade commands for existing local installs
- [x] Make startup behavior explicit: bootstrap fresh DBs, migrate existing DBs
- [ ] Smoke-test both fresh install and upgrade paths

## 2. Security and secret handling

- [ ] Audit settings, logs, audit events, run metadata, and error payloads for secret leakage
- [ ] Verify saved provider tokens are never echoed back through APIs/UI
- [ ] Review provider request/response persistence for accidental credential capture
- [ ] Add documentation for how secrets are stored and what the fallback/env behavior is

## 3. Startup/config polish

- [ ] Tighten `.env.example` / config documentation
- [ ] Make startup failures friendlier and more actionable
- [ ] Verify default bind behavior and local-server assumptions are safe enough for testers
- [ ] Add a simple health/status troubleshooting section

## 4. Reliability / job runtime behavior

- [ ] Test app restart during streaming chat
- [ ] Test restart during automation execution
- [ ] Test scheduler duplicate-run / missed-run behavior
- [ ] Test provider timeout and upstream error recovery paths
- [ ] Decide/document expected behavior when browser disconnects during stream

## 5. Chat correctness and UX

- [x] Real upstream streaming for OpenAI-compatible providers
- [x] Context-window trimming / max-output pass-through groundwork
- [x] Visibility for context budget + trimming state
- [ ] Add explicit warning styling/state for aggressive trimming / missing model profile
- [ ] Decide whether to summarize dropped history later instead of pure truncation

## 6. Workflows and automations

- [x] Workflow CRUD + manual run/status
- [x] Workflow step builder helpers
- [x] Basic automation system (interval / one-time / daily, workflow/custom/template prompt)
- [ ] Add clearer validation/error messaging for workflow/automation definitions
- [ ] Add run-detail links/jump paths between pages
- [ ] Decide which pieces are still experimental and label them in the UI

## 7. Tests

### Backend
- [ ] Provider create/update/delete + secret save/mask tests
- [ ] Chat context trimming tests
- [ ] Streaming path tests (real + fallback)
- [ ] Workflow run tests
- [ ] Automation scheduling math tests
- [ ] Migration smoke tests

### Frontend
- [ ] Chat keyboard/focus behavior tests
- [ ] Provider model picker/profile tests
- [ ] Workflow builder tests
- [ ] Automation create/run/detail tests

## 8. Documentation for testers

- [ ] Quickstart
- [ ] Configuration
- [ ] Security assumptions
- [ ] Providers/templates/workflows/automations overview
- [ ] Data + secret storage locations
- [ ] Upgrade instructions
- [ ] Bug reporting checklist / diagnostics expectations

## 9. UX consistency pass

- [ ] Standardize save/create/delete states and copy
- [ ] Standardize loading/empty/error states
- [ ] Standardize timestamp formatting and muted helper text
- [ ] Review page-level scrolling/layout consistency

## Current focus

### Active now
1. Schema safety and upgrades
2. Security and secret handling
3. Startup/config polish

### Started
- Added this checklist.
- Starting with a proper follow-up Alembic migration for automation/schema drift instead of relying only on startup backfills.
