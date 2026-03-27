# BRIDGE UI System Plan

_Date:_ 2026-03-27

## Purpose

This document captures the inferred UI system from the concept boards in `~/Pictures/BRIDGE/init-concepts/`, translates that into an implementation-oriented plan for BRIDGE, and identifies decisions that still need to be made before or during implementation.

The goal is **not** to recreate the concept art literally. The goal is to extract a coherent, durable design system that can guide BRIDGE’s real product UI.

---

## Source Boards Reviewed

The following concept boards informed this plan:

- `Dashboard.png`
- `Data Heavy.png`
- `Forms and Controls.png`
- `General Concepts.png`
- `Icons.png`
- `Interactions.png`
- `Navigation.png`
- `Transient States Concept.png`

---

# 1. High-Level System Read

## Summary

The concepts suggest a **dark, control-room / HUD-inspired system** with:

- near-black and charcoal backgrounds
- layered panel surfaces
- thin luminous borders
- cyan as the primary interactive accent
- amber/orange for warning/emphasis
- red for destructive/error
- green for success
- modular grid-based layouts
- dense but ordered dashboards and data-heavy surfaces

This is **not** plain enterprise SaaS.
It is also **not** pure sci-fi ornament.
The best fit for BRIDGE is a **restrained sci-fi utility UI**:

- expressive enough to feel distinctive
- restrained enough to stay usable for forms, tables, chat, and settings

## Design Positioning

Recommended product direction:

- **Core app UI:** restrained, practical, data-first
- **Specialized surfaces:** more expressive HUD-style treatments where they add value

Examples:

- Use the restrained system for Chat, Datasets, Settings, Imports, Workbench, Workflows
- Use the more ornamental system for dashboards, metrics, health/status, monitoring, and special visualizations

---

# 2. Major Layout Patterns

## 2.1 Panel Grid Layout

Repeated across the boards:

- modular cards/panels on a strict grid
- common 2-column and 3-column structures
- consistent panel headers
- top-right utility actions
- panel groupings with visual hierarchy

### BRIDGE implication

Most BRIDGE pages should adopt a panel-grid structure instead of loose vertical stacking.

Good candidates:
- Home
- Datasets
- Workbench
- Workflows
- Imports
- Settings

## 2.2 Navigation Shell

The concepts imply a multi-layer navigation shell:

1. **Left sidebar** for major app areas
2. **Top utility bar** for app-wide controls
3. **Optional subnav / local tabs** per feature area
4. **Contextual toolbars / popovers** for local actions

### BRIDGE implication

This matches the direction already started:

- left sidebar primary nav
- topbar with auth/user/session utilities
- feature-specific subnavs where needed
- anchored popovers for local actions

## 2.3 Action Strips and Toolbars

Common pattern:

- horizontal action clusters
- segmented controls
- chips/pills/toggles
- status-aware action bars

### BRIDGE implication

Pages should favor clear action strips above content instead of scattering buttons.

Examples:
- dataset launch actions
- workbench result actions
- workflow next-step actions
- chat header controls

## 2.4 Data-Dense Surfaces

The boards support:

- tables
- detail inspectors
- logs/timelines
- dashboards
- metrics
- status clusters
- queues/activity feeds

### BRIDGE implication

The system needs to support both:
- conversational/product UX
- admin/data-heavy workflows

---

# 3. Reusable Component Inventory

## 3.1 Shell / Layout

- App shell
- Sidebar navigation
- Sidebar section header
- Topbar
- Sub-navigation tabs
- Breadcrumbs
- Command/search bar
- Utility toolbar
- Right-side utility panel or drawer
- Split-panel layout
- Sticky page header

## 3.2 Core Surfaces

- Standard card
- Elevated card
- Metric card
- Summary card
- Preview card
- Detail inspector panel
- Alert/status panel
- Tabbed panel
- Modal
- Drawer
- Anchored popover
- Tooltip
- Context menu

## 3.3 Navigation Components

- Sidebar item
- Sidebar group
- Top nav tab
- Segmented control
- Breadcrumbs
- Pagination
- Stepper
- Progress tracker

## 3.4 Forms and Controls

- Text input
- Search input
- Password input
- Textarea
- Select/dropdown
- Checkbox
- Radio
- Toggle switch
- Slider / range input
- Number stepper
- Date picker
- Time picker
- Date-range picker
- Multi-select token input

## 3.5 Data Display

- Table
- Table row actions
- Status badge
- Pill/chip/tag
- Empty state panel
- Loading state panel
- Key/value grid
- Audit feed
- Timeline
- Activity list
- Mini stat strip
- Summary header

## 3.6 Feedback / Async States

- Success banner
- Warning banner
- Error banner
- Inline validation
- Toast (optional later)
- Spinner
- Progress bar
- Progress ring
- Skeleton/loading placeholders
- Confirmation modal
- Retry state
- Empty state

## 3.7 Specialized / Advanced

- Line chart
- Bar chart
- Donut/ring chart
- Status cluster
- Diagnostic meter
- Reticle/radar-style visualization
- Icon library

---

# 4. Design Tokens

These are inferred implementation tokens, not pixel-perfect sampled values.

## 4.1 Color Tokens

### Base backgrounds
- `bg.canvas`: `#0A0F16` to `#0E131B`
- `bg.surface.1`: `#111822`
- `bg.surface.2`: `#16202B`
- `bg.surface.3`: `#1B2632`
- `bg.elevated`: `#1E2B38`

### Borders / dividers
- `border.subtle`: `rgba(180, 210, 235, 0.16)`
- `border.default`: `rgba(190, 230, 255, 0.28)`
- `border.emphasis`: `rgba(160, 240, 255, 0.55)`

### Text
- `text.primary`: `#E7F4FF`
- `text.secondary`: `#B4C8D8`
- `text.muted`: `#88A0B3`

### Primary accent
- `accent.cyan.1`: `#7EEBFF`
- `accent.cyan.2`: `#59D4F2`
- `accent.cyan.3`: `#39B7E0`

### Semantic accents
- `success`: `#73F0B1`
- `warning`: `#FFB347`
- `danger`: `#FF6B6B`
- `info`: cyan family

### Glow tokens
- `glow.cyan.soft`: `0 0 10px rgba(126, 235, 255, 0.18)`
- `glow.cyan.med`: `0 0 18px rgba(126, 235, 255, 0.28)`
- `glow.warning.soft`: `0 0 16px rgba(255, 179, 71, 0.22)`
- `glow.danger.soft`: `0 0 16px rgba(255, 90, 90, 0.22)`

## 4.2 Typography Tokens

Recommended typography model:

- `font.family.base`: `Inter, ui-sans-serif, system-ui, sans-serif`
- `font.family.display`: same family, slightly heavier usage
- `font.size.xs`: `11-12px`
- `font.size.sm`: `13-14px`
- `font.size.md`: `15-16px`
- `font.size.lg`: `18-20px`
- `font.size.xl`: `24-32px`
- `font.weight.regular`: `400`
- `font.weight.medium`: `500`
- `font.weight.semibold`: `600`

Tracking:
- `tracking.section`: `0.08em`
- `tracking.metric`: `0.02em`

## 4.3 Spacing Tokens

Recommended scale:

- `space.1`: `4px`
- `space.2`: `8px`
- `space.3`: `12px`
- `space.4`: `16px`
- `space.5`: `20px`
- `space.6`: `24px`
- `space.8`: `32px`

## 4.4 Radius Tokens

- `radius.sm`: `6px`
- `radius.md`: `10px`
- `radius.lg`: `14px`
- `radius.pill`: `999px`

## 4.5 Border and Surface Tokens

- `border.width.hairline`: `1px`
- `border.width.emphasis`: `1.5px`
- `surface.gradient.panel`: subtle cool gradient
- `surface.overlay.glass`: semi-opaque slate overlay

## 4.6 Shadow Tokens

- `shadow.panel`: `0 8px 24px rgba(0,0,0,.32)`
- `shadow.popover`: `0 14px 36px rgba(0,0,0,.42)`
- `shadow.focus`: cyan outer glow

## 4.7 Icon Tokens

- stroke-based icon style
- simple geometric forms
- circular/radial variants for status and tooling

Suggested:
- `icon.size.sm`: `14px`
- `icon.size.md`: `18px`
- `icon.size.lg`: `22px`
- `icon.stroke`: `1.75-2`

---

# 5. Inferred State Matrix

## 5.1 Button States

- default
- hover
- focus
- pressed
- selected
- disabled
- loading
- success
- warning
- error

## 5.2 Input States

- default
- hover
- focus
- filled
- disabled
- error
- loading
- validated/success

## 5.3 Tabs / Segmented Controls

- default
- hover
- selected
- disabled

## 5.4 Chips / Pills / Badges

- default
- hover
- selected
- disabled
- semantic variants: success/warning/error/live

## 5.5 Panels / Cards

- default
- selected
- expanded
- loading
- success
- warning
- error

## 5.6 Table Rows

- default
- hover
- selected
- expanded
- disabled
- status-specific

## 5.7 Menus / Popovers

- closed
- opening
- open
- hover item
- destructive item
- disabled item

## 5.8 Async / Transient States

- idle
- loading
- success
- warning
- error
- confirm-required
- empty

---

# 6. Information Architecture Implications

## Recommended Navigation Model

### Primary sidebar
- Home
- Chat
- Datasets
- Workbench
- Workflows
- Imports
- Automations
- Setup group

### Topbar
- workspace/environment
- global search / command palette
- auth/profile/logout
- notifications (optional later)

### Local subnav
Used only where justified, such as:
- Settings
- Workflows
- Imports
- large data surfaces

## BRIDGE-specific interpretation

This aligns well with the current product direction:
- Chat as first-class primary surface
- Datasets as core handoff object
- Workbench/Workflows/Imports/Automations as structured next steps

---

# 7. Responsive Behavior (Inferred)

## Large screens
- multi-column dashboards
- always-visible sidebar
- inline utility panels
- dense panel grids

## Medium screens
- 3-col to 2-col collapse
- move secondary actions into overflow/popovers
- keep tabs horizontally scrollable

## Small screens
- sidebar becomes drawer
- stack panels vertically
- tables need horizontal scroll or card/list variant
- heavy dashboard ornament should be reduced

## Recommendation

Treat desktop as the canonical mode for BRIDGE.
Responsive support should preserve function first, not force all concept-board density onto small screens.

---

# 8. Concept Ambiguities / Risks

## 8.1 Too much ornament everywhere
Some boards are more restrained; others are very HUD-heavy.

### Decision
We need to decide how much ornament is acceptable in core product flows.

### Recommendation
Use two visual intensity levels:
- **Core UI mode:** restrained
- **Specialized dashboard mode:** expressive

## 8.2 Decorative controls vs practical controls
Some concepts show radial or highly stylized controls that may be less practical.

### Decision
Should BRIDGE use these as real controls or just inspiration?

### Recommendation
Treat them as inspiration or specialty widgets, not default input primitives.

## 8.3 Too many selection metaphors
Tabs, pills, chips, and segmented controls are visually close in the concepts.

### Decision
Need strict semantic rules.

### Recommendation
- Tabs = view switching
- Segmented control = compact mode switching
- Chips = filter/tokens
- Pills/badges = status/context labels

## 8.4 Overlapping border/glow treatments
There are multiple frame styles across the concepts.

### Decision
How many surface styles do we standardize?

### Recommendation
Limit to 3 core surface styles:
- default panel
- interactive panel
- alert panel

Reserve corner brackets and extra ornament for select areas only.

---

# 9. Recommended Folder Structure

```txt
frontend/src/
  design-system/
    tokens/
      color.ts
      spacing.ts
      radius.ts
      typography.ts
      shadow.ts
      motion.ts
      zIndex.ts
      semantic.ts
    foundations/
      theme.css
      reset.css
      utilities.css
    icons/
      index.ts
      NavIcons.tsx
      StatusIcons.tsx
      ActionIcons.tsx
    primitives/
      Box.tsx
      Stack.tsx
      Inline.tsx
      Grid.tsx
      Surface.tsx
      Text.tsx
      Icon.tsx
    components/
      buttons/
        Button.tsx
        IconButton.tsx
        SegmentedControl.tsx
      forms/
        Input.tsx
        Textarea.tsx
        Select.tsx
        Checkbox.tsx
        Radio.tsx
        Switch.tsx
        Slider.tsx
      overlays/
        Modal.tsx
        Popover.tsx
        Tooltip.tsx
        ContextMenu.tsx
        Drawer.tsx
      feedback/
        Alert.tsx
        Badge.tsx
        Chip.tsx
        EmptyState.tsx
        Spinner.tsx
        ProgressRing.tsx
      navigation/
        Sidebar.tsx
        SidebarItem.tsx
        Tabs.tsx
        Breadcrumbs.tsx
        CommandBar.tsx
      data-display/
        Card.tsx
        MetricCard.tsx
        DataTable.tsx
        ActivityFeed.tsx
        Timeline.tsx
        KeyValueGrid.tsx
      charts/
        LineChart.tsx
        BarChart.tsx
        DonutChart.tsx
```

## Decision
Should BRIDGE adopt a dedicated `design-system/` layer now, or continue evolving through `styles.css` and page-specific components?

### Recommendation
Move gradually into a `design-system/` layer. Do not big-bang rewrite all existing UI at once.

---

# 10. Implementation Plan

## Phase 1 — Foundations

### Goal
Create a restrained, reusable visual foundation.

### Build first
- color tokens
- typography tokens
- spacing/radius/shadow tokens
- `Surface`
- `Button`
- `Input`
- `Badge`
- `Tabs`
- `Modal`
- `Popover`
- `Card`

### Why
These unlock all later refactors.

---

## Phase 2 — Shell and Navigation

### Build
- sidebar nav component
- topbar
- subnav tabs
- command/search bar
- nav icon system
- anchored menu standardization

### BRIDGE mapping
Apply to:
- app shell
- nav/sidebar
- top utilities
- page-level controls

---

## Phase 3 — Data / Product Primitives

### Build
- metric cards
- key/value summary grid
- alerts/banners
- empty states
- activity/log blocks
- table system
- progress indicators

### Apply to
- Datasets
- Chat shell
- Workbench
- Workflows
- Imports
- Home

---

## Phase 4 — Transient Interaction System

### Build
- confirmation modal
- popover menu
- tooltip
- drawer
- toast/alert pattern

### Why
BRIDGE already benefits from this pattern in Chat. The rest of the app should converge on the same interaction model.

---

## Phase 5 — Specialized Dashboard System

### Build later
- charts
- diagnostic widgets
- radar/reticle-style visuals
- status clusters
- stronger ornamental wrappers

### Why
These should be layered on after the core app is stable.

---

# 11. BRIDGE-Specific Product Guidance

## Recommended adaptation strategy

### Keep
- dark/cyan palette
- crisp panel borders
- strong focus/hover states
- icon-led nav
- polished cards and overlays
- expressive transient state styling

### Tone down
- excessive reticles
- always-on glow
- too many ornamental corners
- circular sci-fi control metaphors in standard forms

## Use the expressive variant for
- Home/dashboard
- health/monitoring/status panels
- future analytics surfaces

## Use the restrained variant for
- Chat
- Settings
- Imports
- Datasets
- Workbench
- Workflows
- Automations

---

# 12. Decisions That Still Need To Be Made

## Visual / design decisions

1. **How ornamental should the default app UI be?**
   - restrained by default
   - or stronger HUD treatment everywhere

2. **Should BRIDGE formalize a design-system layer now?**
   - yes, incremental migration recommended
   - or defer until more pages stabilize

3. **How much chart/dashboard specialization is actually needed?**
   - do we need specialized dashboard widgets now
   - or should we focus entirely on app/product surfaces first

4. **How strong should glow/border treatments be?**
   - subtle everyday UI
   - stronger only on hover/focus/status

## Product / IA decisions

5. **Should Datasets remain the central handoff object?**
   - current recommendation: yes

6. **How should Imports vs Datasets be framed?**
   - current recommendation:
     - Imports = create/update data
     - Datasets = inspect/use data

7. **How strongly should Chat remain the primary surface?**
   - current recommendation: first-class top-level surface

8. **Should Home become more dashboard-like or remain action-oriented?**
   - current recommendation: action-oriented first, metrics second

## Engineering decisions

9. **CSS architecture choice**
   - tokenized CSS variables + component primitives
   - or CSS-in-TS / utility-first / another approach

10. **Component migration strategy**
   - incremental page-by-page migration
   - not a wholesale redesign rewrite

11. **Icon system choice**
   - maintain in-house SVG icon set
   - or eventually adopt a standard stroke icon set and style it to match

---

# 13. Recommended Immediate Next Steps

## Short-term

1. Create a first-pass token layer
2. Standardize `Card`, `Button`, `Input`, `Modal`, `Popover`
3. Refactor nav/sidebar into reusable shell primitives
4. Apply the new surface system to Home + Datasets first

## Medium-term

5. Refactor Workbench and Workflows onto the same primitives
6. Standardize table and detail-summary patterns
7. Unify empty/loading/error states app-wide

## Later

8. Introduce specialized dashboard widgets
9. Add more expressive motion/glow/details selectively
10. Expand chart/diagnostic visuals only where justified

---

# 14. Working Recommendation

The best path for BRIDGE is:

> Build a restrained, tokenized core system first, then selectively layer in the more expressive HUD-like ideas from the concept art where they help the product rather than distract from it.

That keeps the app distinctive without making it exhausting to use.
