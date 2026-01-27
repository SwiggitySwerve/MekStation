# Comprehensive UX Audit — MekStation

## Context

### Original Request
Run a comprehensive, automated UX audit of every screen in MekStation using only agent-based review. Focus on visual cleanliness (balanced density — no dead space, not too dense), PWA/mobile usability across all devices, and component containment (no overlap, runoff, or clipping). Produce concrete fix plans for every finding.

### Interview Summary
**Key Discussions**:
- User priorities: density balance, PWA mobile capability, no overlapping/runoff components
- Additional dimensions agreed: visual hierarchy, empty states, content rhythm, touch targets, thumb reachability, input adaptation, overflow handling, z-index discipline, layout stability, responsive breakpoint integrity, loading states, text truncation, scroll containment, interactive element sizing, consistent component appearance
- Scope: ALL visual screens, ALL viewport sizes, identify + fix plans, adaptive interaction recommendations for complex game elements (armor diagram, hex grid, drag-drop slots)

**Research Findings**:
- MekStation: Next.js 16 (Pages Router), React 19, Zustand 5, Tailwind CSS 4
- ~25 visual routes, 106+ components, 15+ UI domains, 25+ Zustand stores
- Complex interactions: armor diagram (SVG clickable), hex grid map, drag-drop critical slots, record sheet display
- Existing infrastructure: Playwright E2E config, 11,000+ tests, Storybook with 42 stories
- No existing UX audit tooling — this is the first systematic review
- Mobile infrastructure is thin: only 3 mobile-specific components, touch hooks exist but usage unclear, Layout has fixed 256px sidebar on all viewports
- 4 visual themes (default, neon, tactical, minimal) with distinct styling
- Actual breakpoints: mobile < 768px, tablet 768–1024px, desktop ≥ 1024px (per `useDeviceType.ts`)

### Metis Review
**Identified Gaps** (all addressed):
- Breakpoints: Codebase uses 768/1024 transitions, not arbitrary values → **fixed**: audit uses 4 breakpoints (375, 768, 1024, 1280)
- Theme multiplier: 4 themes × 25 pages × 4 viewports = 400 states → **scoped**: default theme only, theme-specific risks flagged separately
- Parameterized routes need seed data → **added**: test data setup phase before screenshots
- Customizer catch-all is 6+ distinct UIs (one per unit type) → **expanded**: audit each unit type separately
- Missing empty states likely a major finding area → **added**: explicit empty vs populated state audit
- Service init loading state (`servicesReady`) gates all pages → **added**: pre-ready state audit dimension
- Agent output needs standardization → **added**: finding schema + severity scale as prerequisite
- Deduplication needed across 17+ agent outputs → **added**: explicit dedup phase in synthesis
- Fix plan specificity varies → **standardized**: required format for every fix plan
- Scope creep risks: WCAG, performance, design system architecture, feature requests → **locked down** (see guardrails)

---

## Work Objectives

### Core Objective
Systematically audit every visual screen in MekStation across 4 viewport sizes, evaluating 10 quality dimensions, and produce a prioritized findings report with concrete fix plans per issue.

### Concrete Deliverables
1. **Screenshot evidence library**: Every visual page captured at 375px, 768px, 1024px, 1280px in populated and empty states → `.sisyphus/evidence/`
2. **Domain review findings**: Structured findings from 12+ specialist reviewer agents
3. **Cross-cutting findings**: Holistic findings from 5 cross-cutting reviewer agents
4. **Synthesized audit report**: Deduplicated, prioritized findings with fix plans → `.sisyphus/audit-report.md`

### Definition of Done
- [ ] Every visual route reviewed at all 4 viewports
- [ ] Every finding has severity rating (P0–P3), evidence, and fix plan
- [ ] Cross-cutting patterns identified and findings deduplicated
- [ ] Findings prioritized into a remediation roadmap (P0 → P3)
- [ ] Synthesis report critically reviewed for completeness

### Must Have
- Standardized finding schema used by ALL agents
- Severity scale with concrete examples
- Fix plans that include: affected files, what to change, complexity, cross-component impact
- Both empty state AND populated state reviewed for list/collection pages
- Evidence (screenshots or code references) for every finding
- Adaptive interaction recommendations for complex mobile interactions (not CSS-only)

### Must NOT Have (Guardrails)
- **NO full WCAG/accessibility audit** — visual UX only (touch targets, readability, interactive visibility)
- **NO performance measurement** — loading states evaluated visually only (does indicator exist, prevent shift)
- **NO design system architecture audit** — CSS internals out of scope, only on-screen consistency matters
- **NO feature requests counted as findings** — enhancements go in separate "Opportunities" appendix
- **NO functional bug reports in main findings** — bugs noted in separate appendix
- **NO Electron-specific UI** — audit is web/PWA only
- **NO print stylesheet audit** — out of scope
- **NO desktop behavior changes** when recommending mobile adaptations (preserve existing desktop UX)
- **NO system-wide redesigns** — adaptive interaction proposals scoped to specific components only

---

## Audit Standards (PREREQUISITE — Defined Before Any Agent Runs)

### Severity Scale

| Level | Name | Definition | Example |
|-------|------|-----------|---------|
| **P0** | Blocker | Content inaccessible, functionality broken, data loss risk | Button completely hidden off-screen on mobile; modal un-dismissable |
| **P1** | Critical | Significant usability degradation, content obscured/truncated, touch unreachable | Text overflows container and overlaps adjacent element; touch target < 30px |
| **P2** | Major | Poor UX but workaround exists, visual inconsistency, suboptimal density | Excessive whitespace wastes 40% of viewport; inconsistent button styles |
| **P3** | Minor | Polish, micro-interaction gaps, nice-to-have improvements | Missing hover state; skeleton loader slightly taller than content |

### Finding Schema

Every finding from every agent MUST follow this structure:
```
**Finding ID**: [AGENT]-[NUMBER] (e.g., LIST-001)
**Route**: /path/to/page
**Viewport**: phone (375px) | tablet (768px) | tablet-desktop (1024px) | desktop (1280px)
**Dimension**: [which audit dimension from the 10 below]
**Severity**: P0 | P1 | P2 | P3
**Finding**: [One-sentence description]
**Evidence**: [Screenshot path or code reference showing the issue]
**Fix Plan**:
  - Files: [affected file paths]
  - Change: [what to change conceptually]
  - Complexity: trivial | small | medium | large
  - Cross-impact: YES (affects N other components) | NO (isolated)
  - Confidence: high | medium | low (low = needs developer review)
```

### Audit Dimensions (10 Focus Areas)

1. **Density & Space** — balanced whitespace, no dead zones, no cramming
2. **Responsiveness** — intentional layouts at each breakpoint, not CSS squishing
3. **Component Containment** — no overlap, clip, bleed, runoff, or z-index fights
4. **Visual Hierarchy** — clear eye flow, obvious primary actions, scannable structure
5. **Loading & Transition States** — skeleton loaders, no layout shift, graceful loading
6. **Text & Overflow** — truncation strategy for long BattleTech names, table overflow
7. **Mobile Interaction** — touch targets ≥ 44px, scroll containment, thumb reachability
8. **Design Consistency** — same component = same appearance everywhere
9. **Empty States** — intentional design when no data, not blank/broken
10. **State Transitions** — service init loading, error states, offline indicators

### Viewport Matrix

| Viewport | Width | Represents | Breakpoint Context |
|----------|-------|------------|-------------------|
| Phone | 375px | iPhone SE / small Android | Below `md` (768px) — mobile layout |
| Tablet | 768px | iPad Mini / small tablet | At `md` — tablet layout triggers |
| Tablet-Desktop | 1024px | iPad / large tablet | At `lg` — desktop layout triggers |
| Desktop | 1280px | Standard laptop/monitor | Above `lg` — full desktop |

### Theme Strategy
- **Primary audit**: Default theme only
- **Theme risk flags**: Note where theme-specific styling (neon cyan, tactical monospace, minimal flat) could cause issues
- **NOT audited per-theme**: Individual screen × viewport × theme matrix (deferred to follow-up)

---

## Task Flow

```
[Phase 0: Setup]
  TODO 1 (test data) → TODO 2 (screenshots)

[Phase 1: Domain Reviews — ALL PARALLEL]
  TODO 3 through TODO 14 (12 specialist agents, all independent)

[Phase 2: Cross-Cutting Reviews — ALL PARALLEL]
  TODO 15 through TODO 19 (5 holistic agents, all independent)

[Phase 3: Synthesis — SEQUENTIAL]
  TODO 20 (oracle aggregation) → TODO 21 (final report)
```

## Parallelization

| Group | Tasks | Reason |
|-------|-------|--------|
| A (sequential) | 1 → 2 | Screenshots depend on test data being available |
| B (parallel) | 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14 | Independent domain reviews |
| C (parallel) | 15, 16, 17, 18, 19 | Independent cross-cutting reviews |
| D (sequential) | 20 → 21 | Report depends on all findings being collected |

| Task | Depends On | Reason |
|------|------------|--------|
| 2 | 1 | Screenshots need populated routes |
| 3–14 | 2 | Domain reviews need screenshot evidence |
| 15–19 | 2 | Cross-cutting reviews need screenshot evidence |
| 20 | 3–19 | Synthesis needs all findings |
| 21 | 20 | Report needs synthesized data |

---

## TODOs

### Phase 0: Preparation

- [ ] 1. Prepare Test Data & Seed State for Parameterized Routes

  **What to do**:
  - Start the dev server (`npm run dev` or `bun dev`)
  - Navigate to list pages to discover existing data IDs, OR create test data via the app's UI/API:
    - At least 1 unit in the customizer (each of: BattleMech, Vehicle, Aerospace — the 3 most common types)
    - At least 1 pilot
    - At least 1 force (with pilot + unit assigned)
    - At least 1 encounter (configured with force)
    - At least 1 campaign (with force, mission, personnel)
    - At least 1 completed game (with replay data if possible)
  - Record all created entity IDs in a manifest file: `.sisyphus/evidence/test-data-manifest.json`
  - Verify each parameterized route loads correctly with the test IDs

  **Must NOT do**:
  - Do NOT modify production data or databases
  - Do NOT create data that can't be cleaned up
  - Do NOT skip any entity type — parameterized routes need real IDs

  **Parallelizable**: NO (must complete before screenshots)

  **References**:

  **Pattern References**:
  - `src/pages/gameplay/pilots/create.tsx` — Pilot creation flow
  - `src/pages/gameplay/forces/create.tsx` — Force creation flow
  - `src/pages/gameplay/encounters/create.tsx` — Encounter creation flow
  - `src/pages/gameplay/campaigns/create.tsx` — Campaign creation flow

  **API References**:
  - `src/pages/api/units/` — Unit CRUD endpoints
  - `src/pages/api/pilots/` — Pilot CRUD endpoints
  - `src/pages/api/forces/` — Force CRUD endpoints
  - `src/pages/api/encounters/` — Encounter management
  - `src/pages/api/` — All API routes for data seeding

  **Route References** (parameterized routes that need real IDs):
  - `/compendium/units/[id]` — Unit detail
  - `/compendium/equipment/[id]` — Equipment detail
  - `/customizer/[unitId]/[tabId]` — Unit builder tabs
  - `/gameplay/pilots/[id]` — Pilot detail
  - `/gameplay/forces/[id]` — Force detail
  - `/gameplay/encounters/[id]` — Encounter detail
  - `/gameplay/campaigns/[id]` — Campaign detail
  - `/gameplay/campaigns/[id]/forces` — Campaign forces
  - `/gameplay/campaigns/[id]/missions` — Campaign missions
  - `/gameplay/campaigns/[id]/personnel` — Campaign personnel
  - `/gameplay/games/[id]` — Game detail
  - `/gameplay/games/[id]/replay` — Game replay
  - `/share/[token]` — Shared content

  **Acceptance Criteria**:
  - [ ] Dev server is running and accessible
  - [ ] `.sisyphus/evidence/test-data-manifest.json` exists with all entity IDs
  - [ ] Each parameterized route loads with test data (no error pages)
  - [ ] At minimum: 1 BattleMech unit, 1 Vehicle unit, 1 Aerospace unit, 1 pilot, 1 force, 1 encounter, 1 campaign

  **Commit**: NO (test data setup, no code changes)

---

- [ ] 2. Screenshot Every Visual Route at All 4 Viewports

  **What to do**:
  - Using Playwright browser automation, systematically capture screenshots of every visual route
  - For EACH route, capture at all 4 viewport widths: 375px, 768px, 1024px, 1280px
  - For list/collection pages, capture BOTH states:
    - **Populated**: With test data loaded (normal usage)
    - **Empty**: With no data (if achievable — e.g., filtered to show 0 results)
  - For the customizer catch-all route, capture each unit type separately:
    - BattleMech: Structure, Armor, Equipment, Criticals, Preview tabs
    - Vehicle: all available tabs
    - Aerospace: all available tabs
  - For dialog-heavy pages, capture with key dialogs open (save, share, export)
  - Capture the pre-`servicesReady` state for at least the home page and one list page
  - Save all screenshots to `.sisyphus/evidence/screenshots/` with naming: `{route-slug}_{viewport}_{state}.png`
  - Generate a screenshot manifest: `.sisyphus/evidence/screenshot-manifest.md` listing every screenshot with metadata

  **Must NOT do**:
  - Do NOT capture API routes (no UI)
  - Do NOT capture `_app.tsx` or `_document.tsx` in isolation
  - Do NOT test multiple themes (default theme only)
  - Do NOT resize or modify screenshots — capture as-rendered

  **Parallelizable**: NO (depends on TODO 1; sequential within, but Phase 1 depends on this)

  **References**:

  **Configuration References**:
  - `playwright.config.ts` — Existing Playwright config with device definitions and screenshot settings
  - `src/hooks/useDeviceType.ts` — Breakpoint definitions (mobile < 768, tablet 768–1024, desktop ≥ 1024)

  **Route Manifest** (ALL visual routes to capture):
  ```
  STATIC ROUTES:
  /                           — Home dashboard
  /settings                   — App settings
  /contacts                   — Contact info
  /compendium                 — Compendium hub
  /compendium/units           — Unit browser (list page — capture empty + populated)
  /compendium/equipment       — Equipment browser (list page — capture empty + populated)
  /compendium/rules           — Rules reference
  /units                      — My units (list page — capture empty + populated)
  /gameplay/quick             — Quick play entry
  /gameplay/pilots            — Pilot roster (list — empty + populated)
  /gameplay/pilots/create     — Pilot creation wizard
  /gameplay/forces            — Force list (empty + populated)
  /gameplay/forces/create     — Force creation
  /gameplay/encounters        — Encounter list (empty + populated)
  /gameplay/encounters/create — Encounter creation
  /gameplay/campaigns         — Campaign list (empty + populated)
  /gameplay/campaigns/create  — Campaign creation
  /gameplay/games             — Game history (empty + populated)
  /gameplay/repair            — Repair management
  /compare                    — Multi-unit comparison
  /audit/timeline             — Event timeline
  /share                      — Share hub

  PARAMETERIZED ROUTES (use IDs from test-data-manifest.json):
  /compendium/units/[id]                — Unit detail
  /compendium/equipment/[id]            — Equipment detail
  /compendium/rules/[id]                — Rule detail
  /customizer/[unitId]/structure        — Builder: Structure tab (×3 unit types)
  /customizer/[unitId]/armor            — Builder: Armor tab (×3 unit types)
  /customizer/[unitId]/equipment        — Builder: Equipment tab (×3 unit types)
  /customizer/[unitId]/criticals        — Builder: Criticals tab (×3 unit types)
  /customizer/[unitId]/preview          — Builder: Preview tab (×3 unit types)
  /gameplay/pilots/[id]                 — Pilot detail
  /gameplay/forces/[id]                 — Force detail
  /gameplay/encounters/[id]             — Encounter detail
  /gameplay/campaigns/[id]              — Campaign detail
  /gameplay/campaigns/[id]/forces       — Campaign forces
  /gameplay/campaigns/[id]/missions     — Campaign missions
  /gameplay/campaigns/[id]/personnel    — Campaign personnel
  /gameplay/games/[id]                  — Game detail
  /gameplay/games/[id]/replay           — Game replay
  ```

  **Acceptance Criteria**:
  - [ ] `.sisyphus/evidence/screenshots/` directory contains screenshots for all routes
  - [ ] Each route has 4 viewport captures (375, 768, 1024, 1280)
  - [ ] List pages have both empty and populated captures where achievable
  - [ ] Customizer has captures for BattleMech, Vehicle, and Aerospace unit types (×5 tabs each)
  - [ ] `.sisyphus/evidence/screenshot-manifest.md` documents every screenshot
  - [ ] Total screenshot count: approximately 150–250 images

  **Commit**: NO (evidence collection, no code changes)

---

### Phase 1: Domain-Specific Reviews (ALL PARALLEL)

> **IMPORTANT**: All tasks 3–14 run IN PARALLEL. Each specialist reviewer agent operates independently.
> Each agent receives: the audit standards (severity scale, finding schema, dimensions), relevant screenshots, and the source code for the components under review.
> Each agent's prompt MUST include the full audit standards from the "Audit Standards" section above.

---

- [ ] 3. List Page Reviews

  **What to do**:
  - Invoke the `list-page-reviewer` agent
  - Review ALL list/browse pages across all 4 viewports, in both empty and populated states
  - Evaluate against all 10 audit dimensions, with emphasis on: density & space, responsiveness, component containment, empty states
  - For each finding, produce output following the standardized finding schema

  **Must NOT do**:
  - Do NOT suggest new features (e.g., "add advanced filtering") — evaluate existing UI only
  - Do NOT audit the filter/sort logic (functional), only the filter/sort UI presentation

  **Parallelizable**: YES (with all TODO 4–14)

  **References**:

  **Pages to Review**:
  - `/compendium/units` — Unit browser with filtering, sorting, pagination
  - `/compendium/equipment` — Equipment database browser
  - `/units` — My units list
  - `/gameplay/pilots` — Pilot roster
  - `/gameplay/forces` — Force management list
  - `/gameplay/encounters` — Encounter list
  - `/gameplay/campaigns` — Campaign list
  - `/gameplay/games` — Game history list

  **Component References**:
  - `src/components/common/Pagination.tsx` — Pagination component pattern
  - `src/components/common/FilterButton.tsx` — Filter UI pattern
  - `src/components/common/SkeletonLoader.tsx` — Loading state pattern
  - `src/components/ui/ViewModeToggle.tsx` — Grid/list view toggle

  **Screenshot Evidence**: `.sisyphus/evidence/screenshots/compendium-units_*.png`, etc.

  **Acceptance Criteria**:
  - [ ] Every list page reviewed at all 4 viewports
  - [ ] Empty states evaluated (are they designed or blank?)
  - [ ] Filter/sort UI evaluated for mobile usability
  - [ ] Pagination evaluated for touch targets
  - [ ] All findings follow standardized schema
  - [ ] Fix plans include affected files and complexity ratings

  **Commit**: NO (review output, no code changes)

---

- [ ] 4. Detail Page Reviews

  **What to do**:
  - Invoke the `detail-page-reviewer` agent
  - Review ALL detail/view pages across all 4 viewports
  - Evaluate header layouts, content sections, action buttons, related data displays
  - Pay special attention to how dense BattleTech data (stats, equipment lists, damage values) renders on mobile

  **Must NOT do**:
  - Do NOT evaluate data correctness (functional) — only presentation

  **Parallelizable**: YES (with all TODO 3, 5–14)

  **References**:

  **Pages to Review**:
  - `/compendium/units/[id]` — Unit detail with stats, equipment, record sheet
  - `/compendium/equipment/[id]` — Equipment detail with specs
  - `/compendium/rules/[id]` — Rule detail
  - `/gameplay/pilots/[id]` — Pilot detail with skills, XP, history
  - `/gameplay/forces/[id]` — Force detail with unit assignments
  - `/gameplay/encounters/[id]` — Encounter detail with setup
  - `/gameplay/campaigns/[id]` — Campaign detail hub
  - `/gameplay/campaigns/[id]/forces` — Campaign force assignment
  - `/gameplay/campaigns/[id]/missions` — Campaign mission tracker
  - `/gameplay/campaigns/[id]/personnel` — Campaign personnel roster
  - `/gameplay/games/[id]` — Game detail with results

  **Component References**:
  - `src/components/ui/StatDisplay.tsx` — Stat display pattern
  - `src/components/ui/Badge.tsx` — Badge/label pattern
  - `src/components/ui/Card.tsx` — Card container pattern

  **Screenshot Evidence**: `.sisyphus/evidence/screenshots/compendium-units-id_*.png`, etc.

  **Acceptance Criteria**:
  - [ ] Every detail page reviewed at all 4 viewports
  - [ ] Header + action button layout evaluated for mobile
  - [ ] Dense stat blocks evaluated for readability at each viewport
  - [ ] Long content (BattleTech names, descriptions) overflow handled
  - [ ] All findings follow standardized schema

  **Commit**: NO

---

- [ ] 5. Form & Wizard Reviews

  **What to do**:
  - Invoke the `form-reviewer` agent
  - Review ALL creation/editing forms and multi-step wizards
  - Evaluate: field layout, label positioning, validation feedback, wizard step indicators, mobile keyboard handling, submit button placement

  **Must NOT do**:
  - Do NOT evaluate validation logic (functional) — only the visual feedback of validation
  - Do NOT audit form data persistence (functional)

  **Parallelizable**: YES (with all TODO 3–4, 6–14)

  **References**:

  **Pages to Review**:
  - `/gameplay/pilots/create` — Multi-step pilot creation wizard
  - `/gameplay/forces/create` — Force creation form
  - `/gameplay/encounters/create` — Encounter setup form
  - `/gameplay/campaigns/create` — Campaign creation form

  **Component References**:
  - `src/components/ui/FormField.tsx` — Form field pattern
  - `src/components/ui/Input.tsx` — Input component
  - `src/components/common/ControlledInput.tsx` — Controlled input pattern
  - `src/components/common/CustomDropdown.tsx` — Dropdown selector
  - `src/components/gameplay/PilotCreationWizard.tsx` — Wizard pattern

  **Acceptance Criteria**:
  - [ ] Every form reviewed at all 4 viewports
  - [ ] Mobile keyboard impact on form layout evaluated
  - [ ] Touch target sizing for form controls verified (≥ 44px)
  - [ ] Wizard step indicator mobile layout reviewed
  - [ ] Submit button reachability on mobile (thumb zone) checked

  **Commit**: NO

---

- [ ] 6. Editor & Builder Reviews (Customizer — 3 Unit Types × 5 Tabs)

  **What to do**:
  - Invoke the `editor-reviewer` agent
  - Review the unit customizer/builder across ALL unit types and ALL tabs
  - This is the most complex UI in MekStation — treat each unit type × tab as a distinct audit target
  - Evaluate: tab navigation, workspace layout, live validation, auto-save indicators, drag-drop equipment assignment, armor allocation interaction, critical slot assignment
  - Special attention to mobile: these are precision interactions designed for mouse — evaluate whether they work with touch

  **Must NOT do**:
  - Do NOT propose removing features from desktop to accommodate mobile
  - Do NOT audit construction rule validation logic (functional) — only the UI feedback
  - Adaptive interaction proposals must include "minimum viable" AND "full vision" variants

  **Parallelizable**: YES (with all TODO 3–5, 7–14)

  **References**:

  **Pages to Review**:
  - `/customizer/[battlemechId]/structure` — BattleMech structure tab
  - `/customizer/[battlemechId]/armor` — BattleMech armor allocation (interactive SVG diagram)
  - `/customizer/[battlemechId]/equipment` — BattleMech equipment assignment (drag-drop)
  - `/customizer/[battlemechId]/criticals` — BattleMech critical slot assignment (drag-drop)
  - `/customizer/[battlemechId]/preview` — BattleMech preview / record sheet
  - `/customizer/[vehicleId]/structure` — Vehicle structure tab
  - `/customizer/[vehicleId]/armor` — Vehicle armor tab
  - `/customizer/[vehicleId]/equipment` — Vehicle equipment tab
  - `/customizer/[vehicleId]/criticals` — Vehicle criticals tab
  - `/customizer/[vehicleId]/preview` — Vehicle preview
  - `/customizer/[aerospaceId]/structure` — Aerospace structure tab
  - `/customizer/[aerospaceId]/armor` — Aerospace armor tab
  - `/customizer/[aerospaceId]/equipment` — Aerospace equipment tab
  - `/customizer/[aerospaceId]/criticals` — Aerospace criticals tab
  - `/customizer/[aerospaceId]/preview` — Aerospace preview

  **Component References**:
  - `src/components/customizer/armor/ArmorDiagram.tsx` — Interactive armor SVG (complex touch interaction)
  - `src/components/customizer/armor/MechSilhouette.tsx` — Mech outline SVG
  - `src/components/customizer/armor/ArmorFillPatterns.tsx` — Visual fill indicators
  - `src/components/customizer/equipment/DraggableEquipment.tsx` — Drag-drop equipment (react-dnd)
  - `src/components/customizer/criticals/` — Critical slot assignment UI
  - `src/components/mobile/EquipmentAssignmentAdapter.tsx` — Existing mobile alternative for equipment

  **Interaction Pattern References**:
  - `src/hooks/useTouchTarget.ts` — Touch target hook
  - `src/hooks/useSwipeGestures.ts` — Swipe gesture hook
  - `src/hooks/useLongPress.ts` — Long press hook
  - `src/hooks/useHaptics.ts` — Haptic feedback hook
  - `src/hooks/useVirtualKeyboard.ts` — Virtual keyboard management

  **Acceptance Criteria**:
  - [ ] All 3 unit types × 5 tabs reviewed at all 4 viewports (60 total screen states)
  - [ ] Armor diagram interaction evaluated for touch usability
  - [ ] Drag-drop equipment/critical slots evaluated for touch
  - [ ] EquipmentAssignmentAdapter (mobile) coverage evaluated — does it handle all scenarios?
  - [ ] Tab navigation evaluated for mobile (scrollable tabs? truncated labels?)
  - [ ] Workspace layout density balanced at each viewport
  - [ ] Adaptive interaction proposals include min-viable + full-vision variants

  **Commit**: NO

---

- [ ] 7. Game UI Reviews

  **What to do**:
  - Invoke the `game-ui-reviewer` agent
  - Review all gameplay screens: quick play flow, hex map, record sheet, combat tracking
  - Evaluate game-specific patterns: phase banners, action bars, heat tracking, ammo counters, event log
  - Special attention to hex grid on mobile (does it scroll, zoom, or become unusable?)

  **Must NOT do**:
  - Do NOT audit game mechanics or resolution logic
  - Do NOT propose simplifying game rules for mobile

  **Parallelizable**: YES (with all TODO 3–6, 8–14)

  **References**:

  **Pages to Review**:
  - `/gameplay/quick` — Quick play setup, review, play, results
  - `/gameplay/repair` — Repair management

  **Component References**:
  - `src/components/gameplay/HexMapDisplay.tsx` — Hex grid map (canvas/SVG)
  - `src/components/gameplay/RecordSheetDisplay.tsx` — Record sheet viewer
  - `src/components/gameplay/HeatTracker.tsx` — Heat bar visualization
  - `src/components/gameplay/ArmorPip.tsx` — Armor status indicators
  - `src/components/gameplay/AmmoCounter.tsx` — Ammunition tracking
  - `src/components/gameplay/PhaseBanner.tsx` — Turn phase indicator
  - `src/components/gameplay/EventLogDisplay.tsx` — Combat event log
  - `src/components/gameplay/ActionBar.tsx` — Action button bar
  - `src/components/gameplay/ScenarioGenerator.tsx` — Battle setup
  - `src/components/gameplay/QuickGameSetup.tsx` — Quick play unit selection
  - `src/components/gameplay/QuickGamePlay.tsx` — Active gameplay
  - `src/components/gameplay/QuickGameResults.tsx` — Results display
  - `src/components/gameplay/QuickGameTimeline.tsx` — Turn timeline

  **Acceptance Criteria**:
  - [ ] All quick play flow steps reviewed at all 4 viewports
  - [ ] Hex map evaluated for mobile interaction (pinch-zoom? scroll trap? too small?)
  - [ ] Record sheet readability at phone viewport evaluated
  - [ ] Action bar touch target sizing verified
  - [ ] Phase banner / heat tracker / ammo counter density evaluated
  - [ ] Event log scrolling behavior on mobile verified

  **Commit**: NO

---

- [ ] 8. Replay & Timeline Reviews

  **What to do**:
  - Invoke the `replay-reviewer` agent
  - Review replay/playback UI and event timeline
  - Evaluate: playback controls, speed selector, timeline scrubbing, keyboard shortcuts display, event overlay

  **Parallelizable**: YES (with all TODO 3–7, 9–14)

  **References**:

  **Pages to Review**:
  - `/gameplay/games/[id]/replay` — Game replay viewer
  - `/audit/timeline` — Event history timeline

  **Component References**:
  - `src/components/audit/timeline/EventTimeline.tsx` — Timeline display
  - `src/components/audit/timeline/TimelineFilters.tsx` — Filter controls
  - `src/components/audit/timeline/TimelineSearch.tsx` — Search UI
  - `src/components/audit/replay/ReplayControls.tsx` — Playback controls
  - `src/components/audit/replay/ReplayTimeline.tsx` — Replay timeline bar
  - `src/components/audit/replay/ReplaySpeedSelector.tsx` — Speed control
  - `src/components/audit/replay/ReplayKeyboardHandler.tsx` — Keyboard shortcuts

  **Acceptance Criteria**:
  - [ ] Replay controls evaluated for touch usability (play/pause, scrub, speed)
  - [ ] Timeline evaluated for dense event rendering (overlap? clipping?)
  - [ ] Filter/search UI evaluated for mobile
  - [ ] Keyboard shortcuts discoverability evaluated (desktop only)
  - [ ] All findings follow standardized schema

  **Commit**: NO

---

- [ ] 9. Comparison View Reviews

  **What to do**:
  - Invoke the `comparison-reviewer` agent
  - Review multi-unit comparison page
  - Evaluate: side-by-side layout at each viewport, stat alignment, diff highlighting, scrolling behavior with many units

  **Parallelizable**: YES (with all TODO 3–8, 10–14)

  **References**:

  **Pages to Review**:
  - `/compare` — Multi-unit side-by-side comparison

  **Component References**:
  - `src/stores/useMultiUnitStore.ts` — Comparison state management
  - Components in comparison view (find via explore agent if needed)

  **Acceptance Criteria**:
  - [ ] Comparison layout evaluated at all 4 viewports
  - [ ] Mobile comparison strategy evaluated (horizontal scroll? stacked? tabbed?)
  - [ ] Stat alignment and diff visibility checked
  - [ ] 2-unit vs 3+ unit comparison evaluated

  **Commit**: NO

---

- [ ] 10. Settings Page Reviews

  **What to do**:
  - Invoke the `settings-reviewer` agent
  - Review settings and preferences UI
  - Evaluate: section organization, toggle/dropdown sizing, mobile layout

  **Parallelizable**: YES (with all TODO 3–9, 11–14)

  **References**:

  **Pages to Review**:
  - `/settings` — App settings page

  **Component References**:
  - `src/components/settings/DesktopSettingsDialog.tsx` — Settings UI
  - `src/stores/useAppSettingsStore.ts` — App preferences
  - `src/stores/useAppearanceStore.ts` — Theme/appearance settings
  - `src/stores/useAccessibilityStore.ts` — Accessibility settings

  **Acceptance Criteria**:
  - [ ] Settings page reviewed at all 4 viewports
  - [ ] Toggle/dropdown touch targets verified
  - [ ] Section grouping evaluated for scannability
  - [ ] Theme selector UI evaluated

  **Commit**: NO

---

- [ ] 11. Navigation & App Shell Reviews

  **What to do**:
  - Invoke the `navigation-reviewer` agent
  - Review the entire navigation system: sidebar, top bar, mobile bottom nav, breadcrumbs, category navigation
  - Evaluate across ALL viewport transitions — this is where responsive breakpoints matter most
  - Check: sidebar behavior at 768/1024 transitions, hamburger menu on mobile, bottom nav coverage, back navigation patterns

  **Must NOT do**:
  - Do NOT evaluate route structure or URL patterns (information architecture) — only navigation UI

  **Parallelizable**: YES (with all TODO 3–10, 12–14)

  **References**:

  **Global Navigation Components**:
  - `src/components/common/Layout.tsx` — App shell with sidebar (fixed 256px — potential mobile issue)
  - `src/components/common/TopBar.tsx` — Top navigation bar (3 layouts: mobile/tablet/desktop)
  - `src/components/common/CategoryNavigation.tsx` — Section navigation
  - `src/components/mobile/BottomNavBar.tsx` — Mobile bottom navigation
  - `src/components/mobile/PanelStack.tsx` — Mobile panel navigation
  - `src/components/common/NavigationIcons.tsx` — Navigation iconography

  **Hook References**:
  - `src/hooks/useDeviceType.ts` — Breakpoint detection (mobile < 768, tablet 768–1024, desktop ≥ 1024)
  - `src/stores/useNavigationStore.ts` — Navigation state

  **Acceptance Criteria**:
  - [ ] Sidebar behavior at each breakpoint evaluated (does 256px sidebar collapse on mobile?)
  - [ ] TopBar three-layout transitions verified (hamburger → icons-only → full labels)
  - [ ] Bottom nav bar coverage evaluated (does it cover all primary actions?)
  - [ ] Breadcrumb / back navigation patterns evaluated
  - [ ] Navigation hierarchy consistency checked across sections

  **Commit**: NO

---

- [ ] 12. Card & Entity Display Reviews

  **What to do**:
  - Invoke the `card-reviewer` agent
  - Review all card components used to display entities (units, pilots, equipment)
  - Evaluate: card layouts at each viewport, content truncation, action button placement, stat readability

  **Parallelizable**: YES (with all TODO 3–11, 13–14)

  **References**:

  **Component References**:
  - `src/components/units/UnitCardStandard.tsx` — Standard unit card
  - `src/components/units/UnitCardCompact.tsx` — Compact unit card
  - `src/components/units/UnitCardExpanded.tsx` — Expanded unit card
  - `src/components/gameplay/PilotMechCard.tsx` — Pilot-mech pairing card
  - `src/components/ui/Card.tsx` — Base card component
  - `src/components/ui/CategoryCard.tsx` — Category navigation card

  **Acceptance Criteria**:
  - [ ] All card variants reviewed at all 4 viewports
  - [ ] Long BattleTech names evaluated (truncation vs wrap vs overflow)
  - [ ] Card action buttons touch target sizing verified
  - [ ] Card grid layout responsiveness evaluated (1-col mobile → multi-col desktop)
  - [ ] Stat display density within cards evaluated

  **Commit**: NO

---

- [ ] 13. Data-Dense Display Reviews

  **What to do**:
  - Invoke the `density-reviewer` agent
  - Review screens with high information density: record sheets, cost breakdowns, equipment tables, damage assessments
  - Evaluate: table overflow strategy, data readability, information hierarchy, scroll behavior

  **Parallelizable**: YES (with all TODO 3–12, 14)

  **References**:

  **Component References**:
  - `src/components/gameplay/RecordSheetDisplay.tsx` — BattleTech record sheet (very data-dense)
  - `src/components/gameplay/repair/RepairCostBreakdown.tsx` — Cost analysis table
  - `src/components/gameplay/repair/DamageAssessmentPanel.tsx` — Damage tracking
  - Equipment tables in compendium views

  **Acceptance Criteria**:
  - [ ] Record sheet evaluated at phone viewport (readable? scrollable? or broken?)
  - [ ] Tables evaluated for horizontal overflow strategy (scroll, collapse, responsive layout)
  - [ ] Data hierarchy evaluated (what's primary info vs secondary vs tertiary)
  - [ ] No content overlap or clipping in dense displays

  **Commit**: NO

---

- [ ] 14. Split Panel & Layout Reviews

  **What to do**:
  - Invoke the `panel-reviewer` agent
  - Review any split-panel or multi-pane layouts
  - Evaluate: panel sizing at each viewport, divider behavior, panel collapse/stack on mobile

  **Parallelizable**: YES (with all TODO 3–13)

  **References**:

  **Pages/Components to Review**:
  - Customizer layout (sidebar equipment list + main workspace)
  - Comparison view (multi-panel side-by-side)
  - Any detail pages with sidebar panels
  - `src/components/common/Layout.tsx` — Main app layout with sidebar

  **Acceptance Criteria**:
  - [ ] Split panels evaluated at all 4 viewports
  - [ ] Mobile panel stacking strategy evaluated (collapse, tabs, or squeeze?)
  - [ ] Panel resize/divider behavior verified
  - [ ] No panel content overflow or clipping

  **Commit**: NO

---

### Phase 2: Cross-Cutting Reviews (ALL PARALLEL)

> **IMPORTANT**: All tasks 15–19 run IN PARALLEL. Each reviews the ENTIRE app holistically, not individual pages.
> Each receives the full screenshot manifest + audit standards.

---

- [ ] 15. Holistic UX Audit (Nielsen's Heuristics)

  **What to do**:
  - Invoke the `ux-auditor` agent
  - Evaluate the ENTIRE application against Nielsen's 10 usability heuristics
  - Focus on systemic patterns that appear across multiple pages, not individual page issues
  - Identify: consistency violations, error prevention gaps, user control issues, recognition problems

  **Must NOT do**:
  - Do NOT duplicate per-page findings from Phase 1 — focus on cross-page patterns
  - Do NOT expand into accessibility or performance

  **Parallelizable**: YES (with TODO 16–19)

  **References**:

  **Heuristics to Evaluate**:
  1. Visibility of system status
  2. Match between system and real world
  3. User control and freedom
  4. Consistency and standards
  5. Error prevention
  6. Recognition rather than recall
  7. Flexibility and efficiency of use
  8. Aesthetic and minimalist design
  9. Help users recognize, diagnose, recover from errors
  10. Help and documentation

  **Screenshot Manifest**: `.sisyphus/evidence/screenshot-manifest.md`

  **Acceptance Criteria**:
  - [ ] All 10 heuristics evaluated with specific examples from MekStation
  - [ ] Systemic patterns identified (not per-page issues)
  - [ ] Each finding includes multiple affected routes
  - [ ] Severity ratings consistent with P0–P3 scale

  **Commit**: NO

---

- [ ] 16. Visual Accessibility Review (Visual Aspects Only)

  **What to do**:
  - Invoke the `accessibility-auditor` agent with SCOPED instructions
  - Evaluate ONLY visual accessibility: touch target sizing (≥ 44px), interactive element visibility, text readability, color contrast for text (not full WCAG)
  - This is NOT a full WCAG audit — scope is limited to visual usability

  **Must NOT do**:
  - Do NOT audit screen reader compatibility, ARIA attributes, or keyboard navigation (out of scope)
  - Do NOT expand into full WCAG 2.2 compliance audit

  **Parallelizable**: YES (with TODO 15, 17–19)

  **References**:
  - `src/stores/useAccessibilityStore.ts` — Existing accessibility settings
  - All screenshot evidence across all viewports

  **Acceptance Criteria**:
  - [ ] Touch target sizing verified across all interactive elements
  - [ ] Text readability at phone viewport evaluated
  - [ ] Color contrast for body text and labels checked
  - [ ] Interactive element visibility (can you tell it's clickable?) verified

  **Commit**: NO

---

- [ ] 17. Visual Design Consistency Review

  **What to do**:
  - Invoke the `visual-reviewer` agent
  - Evaluate design consistency across the ENTIRE app
  - Check: button styles, card styles, spacing, typography, color usage, icon consistency
  - Identify where the same component looks different on different pages
  - Flag theme-specific risks (neon cyan contrast, tactical monospace layout impact, minimal flat styling)

  **Must NOT do**:
  - Do NOT audit CSS architecture or Tailwind class usage (internal)
  - Do NOT propose a design system redesign — evaluate current consistency only

  **Parallelizable**: YES (with TODO 15–16, 18–19)

  **References**:
  - `src/components/ui/Button.tsx` — Button component
  - `src/components/ui/Card.tsx` — Card component
  - `src/components/ui/Badge.tsx` — Badge component
  - `src/components/ui/Input.tsx` — Input component
  - `src/styles/globals.css` — Global styles and theme definitions
  - `src/providers/GlobalStyleProvider.tsx` — Theme switching (4 themes: default, neon, tactical, minimal)

  **Acceptance Criteria**:
  - [ ] Button consistency across all pages evaluated
  - [ ] Card/container consistency evaluated
  - [ ] Spacing system consistency checked (are gaps consistent?)
  - [ ] Typography scale consistency verified
  - [ ] Theme-specific risks flagged (at minimum for neon, tactical, minimal themes)

  **Commit**: NO

---

- [ ] 18. Interaction & Loading State Review

  **What to do**:
  - Invoke the `interaction-reviewer` agent
  - Evaluate micro-interactions, loading states, transition feedback, and animation across the app
  - Check: do actions provide feedback? Do loading states exist? Do transitions feel smooth? Is layout stable during loads?
  - Evaluate the `servicesReady` gate — what do users see before services initialize?

  **Parallelizable**: YES (with TODO 15–17, 19)

  **References**:
  - `src/components/common/SkeletonLoader.tsx` — Loading skeleton pattern
  - `src/components/ui/Toast.tsx` — Toast notification feedback
  - `src/pages/_app.tsx` — Service initialization (`servicesReady` state)
  - `src/hooks/useOfflineStatus.ts` — Offline state detection
  - `src/services/service-worker.ts` — Service worker registration

  **Acceptance Criteria**:
  - [ ] Loading states evaluated for all data-fetching pages
  - [ ] Pre-servicesReady state documented
  - [ ] Action feedback evaluated (do buttons show loading? do saves confirm?)
  - [ ] Layout stability during loading verified (no content shift)
  - [ ] Offline/error state UI evaluated

  **Commit**: NO

---

- [ ] 19. Navigation Coherence Review

  **What to do**:
  - Invoke the `navigation-reviewer` agent (cross-cutting pass — different from TODO 11's component review)
  - Evaluate navigation COHERENCE across the entire app: is it always clear where you are, how you got here, and where you can go?
  - Check: breadcrumb consistency, back button behavior, deep link recovery, mobile navigation coverage

  **Must NOT do**:
  - Do NOT re-evaluate component-level navigation UI (covered in TODO 11)
  - Focus on FLOW and WAYFINDING, not widget appearance

  **Parallelizable**: YES (with TODO 15–18)

  **References**:
  - Full route structure (see screenshot manifest)
  - `src/components/common/Layout.tsx` — App shell
  - `src/stores/useNavigationStore.ts` — Navigation state

  **Acceptance Criteria**:
  - [ ] "Where am I?" is clear on every page at every viewport
  - [ ] "How do I go back?" is always available
  - [ ] Deep link recovery evaluated (open `/gameplay/campaigns/[id]/missions` directly)
  - [ ] Mobile navigation covers all primary flows

  **Commit**: NO

---

### Phase 3: Synthesis & Report

---

- [ ] 20. Synthesize, Deduplicate, and Prioritize All Findings

  **What to do**:
  - Invoke the `oracle` agent with ALL findings from Phase 1 (TODOs 3–14) and Phase 2 (TODOs 15–19)
  - Task the oracle to:
    1. **Deduplicate**: Merge findings where multiple agents flagged the same root cause
    2. **Identify systemic patterns**: Group related findings (e.g., "8 pages missing loading states" = 1 pattern, not 8 findings)
    3. **Validate severity ratings**: Calibrate across agents (one agent's P2 is another's P3)
    4. **Prioritize**: Create a remediation roadmap ordered by: P0 first, then P1 sorted by effort (quick wins first)
    5. **Estimate totals**: Count unique findings per severity, per dimension, per page domain
    6. **Separate appendices**: Functional bugs → bug appendix. Feature requests → opportunities appendix.

  **Must NOT do**:
  - Do NOT add new findings — synthesis only
  - Do NOT change the content of fix plans — only merge/deduplicate

  **Parallelizable**: NO (depends on ALL of TODO 3–19)

  **References**:
  - All outputs from TODO 3 through TODO 19
  - Audit standards (severity scale, finding schema) for calibration reference

  **Acceptance Criteria**:
  - [ ] All findings from all agents collected and processed
  - [ ] Duplicate findings merged (with cross-references to original agents)
  - [ ] Systemic patterns identified and consolidated
  - [ ] Severity ratings calibrated across all agents
  - [ ] Remediation roadmap created with priority ordering
  - [ ] Finding counts: total, per severity, per dimension, per domain
  - [ ] Bug appendix separated from UX findings
  - [ ] Enhancement opportunities appendix separated

  **Commit**: NO

---

- [ ] 21. Generate Final Audit Report

  **What to do**:
  - Using the synthesized findings from TODO 20, generate the final audit report
  - Save to: `.sisyphus/audit-report.md`
  - Report structure:
    ```
    # MekStation UX Audit Report
    
    ## Executive Summary
    - Overall health score (findings by severity)
    - Top 10 most critical findings
    - Top 5 systemic patterns
    - Key strengths (what's working well)
    
    ## Findings by Severity
    ### P0 — Blockers
    ### P1 — Critical
    ### P2 — Major
    ### P3 — Minor
    
    ## Systemic Patterns
    (Cross-page issues grouped by root cause)
    
    ## Findings by Domain
    ### List Pages
    ### Detail Pages
    ### Forms & Wizards
    ### Editor/Builder
    ### Game UI
    ### Replay/Timeline
    ### Comparison
    ### Settings
    ### Navigation
    ### Cards & Entities
    ### Dense Data
    ### Panels & Layouts
    
    ## Findings by Dimension
    ### Density & Space
    ### Responsiveness
    ### Component Containment
    ### Visual Hierarchy
    ### Loading States
    ### Text & Overflow
    ### Mobile Interaction
    ### Design Consistency
    ### Empty States
    ### State Transitions
    
    ## Remediation Roadmap
    ### Immediate (P0 blockers)
    ### Sprint 1: Quick wins (P1, low effort)
    ### Sprint 2: High-impact fixes (P1, medium effort)
    ### Sprint 3: Systemic improvements (P2 patterns)
    ### Backlog: Polish (P3)
    
    ## Theme Risk Assessment
    (Flagged theme-specific risks for neon, tactical, minimal)
    
    ## Appendix A: Functional Bugs
    ## Appendix B: Enhancement Opportunities
    ## Appendix C: Screenshot Evidence Index
    ```

  **Must NOT do**:
  - Do NOT add findings not produced by the review agents
  - Do NOT change severity ratings from the synthesized output

  **Parallelizable**: NO (depends on TODO 20)

  **References**:
  - Synthesized findings from TODO 20
  - Screenshot manifest from TODO 2

  **Acceptance Criteria**:
  - [ ] `.sisyphus/audit-report.md` exists and follows the report structure
  - [ ] Executive summary captures the overall state concisely
  - [ ] All findings included with severity, evidence, and fix plans
  - [ ] Remediation roadmap is actionable (grouped by sprint, ordered by priority)
  - [ ] Theme risk assessment section included
  - [ ] Appendices separate bugs and enhancement requests from UX findings
  - [ ] Report is self-contained — readable without needing to reference agent outputs

  **Commit**: YES
  - Message: `audit(ux): complete comprehensive UX audit of all visual routes`
  - Files: `.sisyphus/audit-report.md`, `.sisyphus/evidence/screenshot-manifest.md`
  - Pre-commit: None (no code changes)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 21 | `audit(ux): complete comprehensive UX audit of all visual routes` | `.sisyphus/audit-report.md`, `.sisyphus/evidence/*` | Report exists and follows structure |

---

## Success Criteria

### Verification Commands
```bash
# Report exists
ls .sisyphus/audit-report.md

# Screenshot evidence collected
ls .sisyphus/evidence/screenshots/ | wc -l  # Expected: 150-250 files

# Manifest exists
ls .sisyphus/evidence/screenshot-manifest.md
ls .sisyphus/evidence/test-data-manifest.json
```

### Final Checklist
- [ ] Every visual route reviewed at all 4 viewports (375, 768, 1024, 1280)
- [ ] All 10 audit dimensions evaluated
- [ ] Every finding has severity, evidence, and fix plan
- [ ] Findings deduplicated and patterns identified
- [ ] Remediation roadmap prioritized (P0 → P3, quick wins first)
- [ ] Theme-specific risks flagged
- [ ] Bugs and enhancement requests separated into appendices
- [ ] Report is actionable — a developer can pick up Sprint 1 immediately
