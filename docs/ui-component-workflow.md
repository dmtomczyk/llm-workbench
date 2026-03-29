# BRIDGE UI Component Workflow

This file captures the current best process for translating BRIDGE source designs into reusable UI components.

It exists because jumping straight from source board -> generic reusable component caused repeated drift.

The workflow below is the current working method.

---

## Core Principle

**Replica first. Reusable component second.**

Do not start by designing a generalized component from a source board.
First, build a visually faithful replica of one specific named source component.
Only after the replica is approved should it be abstracted into a reusable component.

---

## Source of Truth

Primary visual references live in:

- `frontend/public/ui-kit-reference/`

Component crops live in subfolders like:

- `frontend/public/ui-kit-reference/dashboard-components/`
- `frontend/public/ui-kit-reference/navigation-components/`
- `frontend/public/ui-kit-reference/forms-components/`
- `frontend/public/ui-kit-reference/icons-components/`

The UI review surface is:

- `/ui-kit`

---

## Workflow

### Step 1: Pick one exact component

Do not work on a broad category like "cards" or "navigation".
Choose one named source component, for example:

- Users metric card
- Command palette panel
- User profile dropdown
- Command module card
- Sidebar navigation

Record:

- component name
- source board
- crop path if available
- priority/focus notes if helpful

---

### Step 2: Show the source in `/ui-kit`

Before building anything, ensure the source is visible in the UI kit.

Preferred comparison format:

- Source
- Current
- Replica
- Reusable component (only after replica approval)

This makes visual drift obvious.

---

### Step 3: Build a literal replica

Create a replica component first.

Replica rules:

- Match the specific source component, not a generalized idea of it
- Local/inline styles are allowed temporarily
- Isolation from parent/global BRIDGE styles is preferred during fidelity work
- Fidelity matters more than reusability at this stage

The replica is a visual study, not the final design-system artifact.

Example naming:

- `UsersMetricCardReplica`
- or temporary equivalent beside an existing source component file

---

### Step 4: Iterate only on the replica

Get approval on the replica before abstracting.

Best feedback loop:

- Ask which version is closer
- Ask for the top 2-3 mismatches only
- Change only one small cluster of things at a time

Examples of good iteration targets:

- typography weight
- divider placement
- corner strength
- seam/detail strength
- proportions
- internal spacing

Avoid changing everything at once.

---

### Step 5: Create the reusable component

Only after the replica is approved:

- create the reusable production-oriented component
- preserve the shell/structure of the approved replica
- extract props carefully
- do not over-generalize immediately

Example:

- approved replica: `UsersMetricCardReplica`
- reusable abstraction: `MetricTile`

---

### Step 6: Validate the abstraction in `/ui-kit`

The reusable component should be shown in multiple realistic examples.

Example validation set for a metric tile:

- Users
- DAU
- Tokens Used
- Critical Alerts

If the reusable version loses too much character from the approved replica, simplify the abstraction and re-tighten it.

---

### Step 7: Promote shared styling upward

Only after the reusable component works:

- move inline/local styling into shared tokens/classes
- promote repeated shell language into design-system styles
- keep the approved visual behavior intact during promotion

Do not move styling upward too early.

---

## What went wrong before

These patterns caused drift and should be avoided:

- abstracting too early
- inventing "BRIDGE-ish" containers from vibe
- letting parent/global styles muddy fidelity work
- changing multiple visual dimensions at once
- treating dense source boards as generic UI inspiration instead of exact references

---

## Best implementation order

For remaining BRIDGE source-derived components, use this order:

1. Command palette panel
2. User profile dropdown
3. Command module card
4. Sidebar navigation

Rationale:

- Command palette exercises shell + input + rows + interactions
- User profile dropdown is compact and visually distinctive
- Command module card is a good bridge from replica to reusable module
- Sidebar navigation is larger and benefits from prior primitives being settled

---

## Working conventions

### Naming

Use explicit names while iterating.

Prefer:

- `XReplica`
- `XPreview`
- `XReusable`

Avoid vague temporary names.

### Scope

During fidelity work:

- one component at a time
- one source crop at a time
- one feedback loop at a time

### Styling

For source matching work:

- local styles are acceptable
- inline styles are acceptable
- shared styles come later

---

## Approval checkpoints

A component is ready to move from replica -> reusable when:

- the source comparison in `/ui-kit` looks recognizably close
- the human explicitly says the replica is good enough
- remaining changes are minor rather than structural

A reusable component is ready to promote when:

- it preserves the approved replica character
- it works for at least 2-4 realistic examples
- it does not collapse into a generic SaaS component

---

## Current proven example

The first successful proof of this workflow was:

- Source component: Users metric card
- Process: Source -> Current -> Replica -> Reusable `MetricTile`

This should be treated as the reference pattern for the next component.

---

## Future improvement

If this workflow remains useful across multiple components or projects, convert it into an OpenClaw skill.

Potential future skill scope:

- source-board extraction
- replica-first component design
- reusable abstraction after approval
- `/ui-kit` comparison workflow
