# BRIDGE UI Implementation Checklist

_Date:_ 2026-03-27

This document is the repo-specific follow-up to `docs/ui-system-plan.md`.

Its purpose is to answer:

1. Which UI system pieces BRIDGE actually needs soon
2. How those map to the current `frontend/src/` structure
3. What should be built first vs deferred
4. Which existing page-specific patterns should be turned into reusable components

This is intentionally pragmatic. It is not a maximal design-system wishlist.

---

# 1. Current Frontend Surface Map

Current frontend files of interest:

## App shell / routing
- `frontend/src/App.tsx`
- `frontend/src/components/Layout.tsx`
- `frontend/src/components/NavIcon.tsx`
- `frontend/src/components/shellSubnav.tsx`
- `frontend/src/routes/nav.ts`
- `frontend/src/styles.css`

## Auth
- `frontend/src/auth.tsx`
- `frontend/src/features/auth/LoginPage.tsx`

## Feature pages
- `frontend/src/features/dashboard/DashboardPage.tsx`
- `frontend/src/features/chat/ChatPage.tsx`
- `frontend/src/features/datasets/DatasetsPage.tsx`
- `frontend/src/features/workbench/WorkbenchPage.tsx`
- `frontend/src/features/workflows/WorkflowsPage.tsx`
- `frontend/src/features/imports/ImportsPage.tsx`
- `frontend/src/features/automations/AutomationsPage.tsx`
- `frontend/src/features/providers/ProvidersPage.tsx`
- `frontend/src/features/connectors/ConnectorsPage.tsx`
- `frontend/src/features/plugins/PluginsPage.tsx`
- `frontend/src/features/settings/SettingsPage.tsx`
- `frontend/src/features/audit/AuditPage.tsx`

---

# 2. What BRIDGE Actually Needs

## Immediate conclusion
BRIDGE does **not** need the full concept-board system immediately.

The product currently needs a **practical core UI kit** that supports:

- app shell / nav
- cards/panels
- buttons
- inputs/selects/textareas
- badges/pills
- empty states
- alerts/notices
- modals
- popovers
- data summaries
- tables
- a small icon system

That core set will cover most of the real app.

## What BRIDGE does *not* need yet
These should be explicitly deferred unless a page proves the need:

- radar/reticle visualizations
- donut/ring analytics library
- chart library integration
- decorative corner-bracket frames everywhere
- exotic control styles (radial sliders, HUD widgets, etc.)
- command palette
- advanced motion system
- right-side utility tray as a platform primitive

---

# 3. The Components BRIDGE Should Actually Implement

This section is the recommended real component inventory for BRIDGE right now.

---

## 3.1 Foundation / Primitives (Must Have)

These are the most important building blocks.

### A. `Surface`
**Purpose:** shared panel/card surface wrapper

### Needed because:
- nearly every page uses card-like panels
- current card styling is centralized in CSS but not componentized
- multiple variants now exist implicitly: default card, launch card, summary card, modal card

### Likely props:
- `variant`: `default | elevated | interactive | muted | alert`
- `padding`: `sm | md | lg`
- `bordered?: boolean`
- `glow?: boolean`

### Should replace / consolidate:
- `.card`
- `.dataset-launch-card`
- `.dataset-summary-card`
- modal-card variants later

---

### B. `Stack` / `Inline` / `Grid`
**Purpose:** layout primitives for spacing and alignment

### Needed because:
- app heavily uses repeated utility classes like:
  - `.stack`
  - `.row`
  - `.grid`
  - `.two-col`
  - `.between`
- these patterns are everywhere and are central to the visual structure

### Recommendation:
Introduce these as either:
- thin React layout primitives, or
- a better-documented utility class system

If not componentized immediately, at least formalize them in the token/system layer.

---

### C. `Text`
**Purpose:** standardized semantic text styles

### Needed because:
- current app reuses `.muted`, headings, ad hoc strong labels
- dashboards and summaries need consistency

### Useful variants:
- `heading`
- `subheading`
- `body`
- `muted`
- `label`
- `metric`

---

## 3.2 Basic Interactive Components (Must Have)

### D. `Button`
**Purpose:** standard primary/secondary/ghost/destructive button

### Needed because:
- buttons are currently styled generically by global CSS
- there are already multiple conceptual button types:
  - primary action
  - secondary action
  - destructive action
  - toolbar action
  - utility button

### Variants BRIDGE needs now:
- `primary`
- `secondary`
- `ghost`
- `danger`
- `icon`

### States needed:
- default
- hover
- focus
- disabled
- loading

---

### E. `IconButton`
**Purpose:** compact icon-led action buttons

### Needed because:
- nav icons now exist
- session menu buttons, utility buttons, inline actions benefit from this
- helps unify popover/menu triggers

---

### F. `Input`, `Textarea`, `Select`
**Purpose:** shared form controls

### Needed because:
- many pages build forms directly with native controls + global CSS
- auth settings, imports, workbench, workflows, chat settings all need a coherent input style

### Needed variants:
- default text input
- select/dropdown
- multi-line textarea
- optional labeled wrapper later

### Later additions:
- password input wrapper
- inline validation message support

---

### G. `Checkbox` / `Switch`
**Purpose:** boolean control wrapper

### Needed because:
- stream toggle
- auth toggle
- settings toggles
- recipe enable/disable toggles

### Recommendation:
Start with `CheckboxRow` abstraction if full switch component is unnecessary at first.

---

## 3.3 Overlays and Transient UI (Must Have)

### H. `Modal`
**Purpose:** standard modal/dialog wrapper

### Needed because:
BRIDGE already uses modal-like interactions for:
- chat delete confirmation
- chat settings
- dataset upload
- link dataset
- likely future settings/import flows

### This should be standardized now.

### Needed capabilities:
- backdrop
- click-outside close
- Escape close
- modal sizes: `sm | md | lg`
- header / body / footer layout

### Current pages to migrate later:
- Chat modals
- Datasets upload modal
- future import recipe edit modal

---

### I. `Popover`
**Purpose:** anchored transient menu/panel

### Needed because:
- chat session ellipsis menu already uses a custom anchored menu
- more anchored menus are likely coming

### Needed capabilities:
- anchored to trigger
- click-outside close
- keyboard close
- menu list styling

### Immediate reuse target:
- chat session popover menu

---

### J. `Alert` / `Notice`
**Purpose:** shared status banner / inline notice component

### Needed because:
- app now uses `.notice`, `.notice.error`, etc.
- auth login/status pages use them
- upload support messaging uses them
- chat lifecycle/status uses banner-like patterns

### Variants needed:
- info
- success
- warning
- error

---

## 3.4 Navigation Components (Must Have)

### K. `SidebarNav`
**Purpose:** reusable shell nav component

### Needed because:
- `Layout.tsx` currently manually renders nav sections
- nav is now important enough to deserve a proper component
- icons are already route-aware

### Subcomponents:
- `SidebarSection`
- `SidebarItem`
- `SidebarItemIcon`

---

### L. `Tabs`
**Purpose:** local section switching pattern

### Needed because:
- concepts strongly imply local sub-navigation/tab patterns
- BRIDGE does not yet consistently expose them
- useful for Settings, Imports, Workflows later

### Priority:
Medium. Not urgent if no page is clearly ready for it.

---

## 3.5 Data Display Components (Must Have)

### M. `Badge` / `Pill`
**Purpose:** status labels, linked datasets, metadata chips

### Needed because:
- current app already uses pills heavily:
  - linked datasets
  - workflow summary pills
  - dataset summary pills
  - chat metadata pills

### This should become a first-class component soon.

Variants needed:
- neutral
- info
- success
- warning
- error
- interactive/removable later

---

### N. `KeyValueGrid`
**Purpose:** structured summary display

### Needed because:
- dataset summary card uses ad hoc metadata layout
- many pages need “label/value” inspectors
- avoids repeated custom grid logic

### Immediate targets:
- Datasets summary
- workflow run metadata
- workbench setup summary
- provider/config summary sections

---

### O. `DataTable`
**Purpose:** reusable table wrapper with consistent styling

### Needed because:
- tables are present in Datasets and Imports
- future data-heavy surfaces need consistency
- current table styles are global but not componentized

### Start small:
- simple wrapper + standard table class
- sorting/filtering can come later

---

### P. `EmptyState`
**Purpose:** consistent no-data / no-selection / no-session state

### Needed because:
- current empty states vary by page
- broader UX pass already identified this as high leverage

### Immediate targets:
- Chat no-session state
- Datasets no selection state
- Workbench no result state
- Workflows no run state
- Imports no recipes/runs state

---

## 3.6 Product-Specific Components (Should Build Soon)

These are not generic primitives, but they are highly reusable inside BRIDGE.

### Q. `LaunchActions`
**Purpose:** grouped “start from here” CTA set

### Needed because:
- Datasets now has a launch card
- Workbench and Workflows have result/action clusters
- Home likely needs similar grouped launches

### Example usage:
- dataset launch card
- workbench result next steps
- workflow result next steps

This could be built as a simple wrapper around buttons/links, not necessarily a complex abstraction.

---

### R. `ResultActions`
**Purpose:** standardized “what next?” action bar after an operation completes

### Needed because:
- workbench and workflow result sections both use this pattern now
- imports run details may also want it

### Recommendation:
Can be a BRIDGE-specific component in `features/shared/` or `components/product/`

---

### S. `ContextBanner`
**Purpose:** show current working context clearly

### Needed because:
- Chat uses linked datasets / model / provider context
- Workbench and Workflows also carry contextual setup

### Could be used for:
- linked datasets summary
- context budget / model info
- selected provider/model/dataset summary rows

---

## 3.7 Icons (Must Have, Already Started)

### T. `NavIcon` system
**Status:** already started

### Needed next:
- formalize icon naming
- add status icons
- add action icons

### Immediate icon groups needed:
- nav icons
- status icons (success/warning/error/info)
- action icons (edit/delete/settings/upload/search/export)

---

# 4. Components We Can Defer

These are useful eventually, but BRIDGE does not urgently need them.

## Defer for now
- chart components
- diagnostic meters
- ring charts
- progress ring
- command palette
- breadcrumbs
- date picker
- time picker
- slider/range input
- pagination abstraction
- timeline abstraction
- drawer abstraction
- toast system

These should only be built when a real page needs them.

---

# 5. Suggested Folder Structure for BRIDGE (Pragmatic Version)

A smaller, more realistic version of the design-system plan:

```txt
frontend/src/
  design-system/
    tokens/
      color.ts
      spacing.ts
      radius.ts
      typography.ts
      shadow.ts
    foundations/
      theme.css
      utilities.css
    icons/
      NavIcon.tsx
      StatusIcon.tsx
      ActionIcon.tsx
    components/
      Surface.tsx
      Button.tsx
      IconButton.tsx
      Input.tsx
      Textarea.tsx
      Select.tsx
      CheckboxRow.tsx
      Modal.tsx
      Popover.tsx
      Alert.tsx
      Badge.tsx
      EmptyState.tsx
      KeyValueGrid.tsx
      DataTable.tsx
      SidebarNav.tsx
      Tabs.tsx
  components/
    Layout.tsx
    shellSubnav.tsx
  features/
    shared/
      LaunchActions.tsx
      ResultActions.tsx
      ContextBanner.tsx
```

## Recommendation
Keep `Layout.tsx` in `components/` for now.
Move truly reusable UI primitives into `design-system/components/` gradually.

---

# 6. Mapping: Which Existing Pages Need Which Components

## 6.1 Layout / Shell

### `frontend/src/components/Layout.tsx`
Should eventually use:
- `SidebarNav`
- `Button` / `IconButton`
- icon system
- topbar primitives

## 6.2 Chat

### `frontend/src/features/chat/ChatPage.tsx`
Needs / should migrate to:
- `Modal`
- `Popover`
- `Button`
- `IconButton`
- `Badge`
- `Alert`
- `EmptyState`
- `ContextBanner`

Chat is currently the strongest candidate for component extraction because it already exercises many interaction patterns.

## 6.3 Datasets

### `frontend/src/features/datasets/DatasetsPage.tsx`
Needs / should migrate to:
- `Surface`
- `LaunchActions`
- `KeyValueGrid`
- `Badge`
- `Modal`
- `DataTable`
- `EmptyState`

## 6.4 Workbench

### `frontend/src/features/workbench/WorkbenchPage.tsx`
Needs / should migrate to:
- `Surface`
- `Button`
- `Input` / `Select` / `Textarea`
- `ResultActions`
- `EmptyState`
- `Alert`
- `ContextBanner`

## 6.5 Workflows

### `frontend/src/features/workflows/WorkflowsPage.tsx`
Needs / should migrate to:
- `Surface`
- `Button`
- `Input` / `Select` / `Textarea`
- `ResultActions`
- `Badge`
- `Alert`
- `EmptyState`

## 6.6 Imports

### `frontend/src/features/imports/ImportsPage.tsx`
Needs / should migrate to:
- `Surface`
- `Button`
- `Input` / `Select` / `Textarea`
- `Tabs` (likely useful later)
- `DataTable`
- `Alert`
- `EmptyState`

## 6.7 Settings / Auth

### `frontend/src/features/settings/SettingsPage.tsx`
### `frontend/src/features/auth/LoginPage.tsx`
Need / should migrate to:
- `Surface`
- `Input`
- `CheckboxRow`
- `Alert`
- `Button`

## 6.8 Home / Dashboard

### `frontend/src/features/dashboard/DashboardPage.tsx`
Needs / should migrate to:
- `MetricCard`
- `Surface`
- `LaunchActions`
- `EmptyState`
- maybe charts later (not now)

---

# 7. Recommended Build Order

This is the practical order for BRIDGE.

## Phase 1 — Must Have Core
Build these first:

1. `Surface`
2. `Button`
3. `Input`
4. `Textarea`
5. `Select`
6. `Alert`
7. `Badge`
8. `Modal`
9. `Popover`
10. `EmptyState`

## Phase 2 — Layout + Shell
Then build/refactor:

11. `SidebarNav`
12. `IconButton`
13. topbar utilities cleanup
14. icon system expansion

## Phase 3 — Data/Product Primitives
Then build:

15. `KeyValueGrid`
16. `DataTable`
17. `LaunchActions`
18. `ResultActions`
19. `ContextBanner`

## Phase 4 — Optional Near-Term
Only if needed soon:

20. `Tabs`
21. `MetricCard`
22. `CheckboxRow` / `Switch` refinement

## Phase 5 — Later
Defer until justified:

23. charts
24. command/search bar
25. toast system
26. drawer system
27. specialized dashboard widgets

---

# 8. Concrete First Refactor Targets

If starting implementation immediately, the best sequence is:

## Target 1 — Overlay standardization
Extract and standardize:
- `Modal`
- `Popover`
- `Alert`

Why:
- already used in Chat and Datasets
- immediate duplication reduction
- high UX consistency payoff

## Target 2 — Surface + Badge + KeyValueGrid
Apply to:
- Datasets
- Workbench result areas
- Workflow run status

Why:
- strong visible payoff
- low conceptual risk

## Target 3 — Form control standardization
Apply to:
- Settings
- Chat settings modal
- Workbench run setup
- Workflow run setup
- Imports forms

Why:
- lots of repeated direct native control usage

## Target 4 — Sidebar/nav extraction
Apply to:
- `Layout.tsx`

Why:
- app shell is stabilizing
- icons are already in place

---

# 9. Decisions Still Needed

These are the key repo-specific decisions.

## Decision 1
**Do we introduce `design-system/` now, or wait?**

### Recommendation
Yes, introduce it now, but migrate gradually.

## Decision 2
**Do we extract layout primitives as React components or keep utility classes?**

### Recommendation
Keep utility classes for `stack/row/grid` in the short term, but formalize them. Do not over-componentize layout immediately.

## Decision 3
**Do we standardize overlays first or cards first?**

### Recommendation
Overlays first (`Modal`, `Popover`, `Alert`), then `Surface` and data-summary primitives.

## Decision 4
**Do we build charts soon?**

### Recommendation
No. Only after core app surfaces are coherent.

## Decision 5
**Should BRIDGE adopt specialty HUD ornaments widely?**

### Recommendation
No. Keep those limited to Home/dashboard/status areas until the core experience is stable.

---

# 10. Recommended Immediate Next Work

## If continuing this effort
The best next implementation slice is:

> Extract a reusable `Modal`, `Popover`, and `Alert` layer and refactor Chat + Datasets to use it.

After that:

> Extract `Surface`, `Badge`, and `KeyValueGrid` and apply them to Datasets, Workbench, and Workflows.

Those two slices would move BRIDGE noticeably toward a real design system without forcing a big-bang rewrite.
