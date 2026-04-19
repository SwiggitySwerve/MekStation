# Design: Add Interactive Combat Core UI

This change did not ship with a pre-authored `design.md`; the architectural
intent lived in the proposal. During execution, several component-reuse
decisions turned out to be nuanced enough that they graduate into a
permanent record here so future changes (particularly ones that touch the
combat record sheet) don't rediscover the same tradeoffs.

## Architecture Decisions

### Decision: Action panel IS the Phase 1 record sheet

**Choice**: Extend the existing `RecordSheetDisplay` with missing pieces
(SPA list, unconscious banner, destroyed/jammed badges, inline ammo
counter, header side-badge, empty placeholder text, armor pip rail). No
new `ActionPanel` component.

**Rationale**: The proposal is explicit — "this panel IS the Phase 1
record-sheet surface". `RecordSheetDisplay` already handled ~80% of the
action panel contract (armor, heat, weapons, pilot wounds). Creating a
parallel component would duplicate logic and drift the two views.

**Discovered during**: Tasks 4.1, 4.2, 7.1, 7.2, 7.3, 8.1, 8.2, 8.3, 9.3

### Decision: Responsive drawer at `lg:` breakpoint

**Choice**: Below 1024px (Tailwind `lg:` breakpoint) the record-sheet
pane collapses into an overlay drawer toggled by a button in the
`PhaseBanner`. Above `lg`, split view is unchanged.

**Rationale**: The existing split-view resize handle is desktop-only UX.
Mobile/tablet users need a drawer pattern. `lg:` matches the task
requirement exactly (<1024px).

**Discovered during**: Task 1.3

### Decision: Task 5.1 — compact `ArmorPipRail` instead of literal `ArmorPip` reuse

**Choice**: Introduce a new `ArmorPipRail` sub-component in
`RecordSheetPanels.tsx` that renders per-location armor and internal
structure as dense 8×8 px dots (green = armor filled, amber = structure
filled, red = location destroyed, gray = empty). Do not mount the
existing full-size `ArmorPip` button component (48×48 px, interactive
cycle state machine) inside the combat record sheet.

**Rationale**: The spec language is "panel SHALL include armor pips for
all eight locations" — generic pip visualization, not a specific React
component. The existing `ArmorPip` is a click-to-damage toggle designed
for the construction-tool record sheet; with up to 30 armor points per
location it would blow the dense combat panel layout at 48 px per pip.
The new rail reuses `ArmorPip`'s visual palette (`bg-green-500`,
`bg-red-500`, `bg-gray-300`) so the two surfaces remain visually
consistent.

**Discovered during**: Task 5.1

### Decision: Task 6.1 — keep `SimpleHeatDisplay` instead of reusing `HeatTracker`

**Choice**: Do not swap the combat action-panel heat readout to the
standalone `HeatTracker` component. Keep `SimpleHeatDisplay` as the
live-combat renderer.

**Rationale**: `HeatTracker` is built for construction-tool previews —
it carries a scale selector (Single/Double/Triple heat mode), a cooling
countdown, and a "MAX HEAT - SHUTDOWN" banner keyed to the old 30/50/70
scale. None of those are appropriate for live combat. `SimpleHeatDisplay`
already satisfies the underlying spec scenario (_"heat bar SHALL show
current heat and dissipation capacity AND tick marks SHALL label
canonical thresholds 8, 13, 17, 24"_) and tasks 6.2 + 6.3 render
canonical tick marks + canonical color scale on top of it. Swapping to
`HeatTracker` would regress those features.

**Discovered during**: Task 6.1

### Decision: Task 7.2 — thin `InlineAmmoCounter` instead of literal `AmmoCounter` reuse

**Choice**: Render ammo inline inside `WeaponRow` via a small
`InlineAmmoCounter` sub-component that matches the `AmmoCounter` visual
idiom (N/M rds, amber tint at 25%, red at empty) without mounting the
full fire/reload UI.

**Rationale**: The real `AmmoCounter` component
(`src/components/gameplay/AmmoCounter.tsx`) carries `onFire` +
`onReload` callbacks and renders a full fire button, reload progress
ring, and haptic feedback. That is the "combat ammo HUD" shape — wrong
for a dense weapon row where ammo is secondary information. The spec's
"reuse" intent is "match the visual language", which the inline
renderer does.

**Discovered during**: Task 7.2

### Decision: SPA projection via `unitSpas` store record

**Choice**: Add a `unitSpas` record (unit id → readonly array of
`{ id, displayLabel, description }`) on `useGameplayStore` and pass it
through `GameplayLayout` into `RecordSheetDisplay`.

**Rationale**: Matches the existing `pilotNames` / `heatSinks` shape.
Keeps the SPA resolution concern out of the render layer — the store
(or a future session helper) decides what's visible. Phase 1 doesn't
need designations rendered; just name + description tooltip.

**Discovered during**: Tasks 8.1, 8.2, 8.3

### Decision: Phase banner active-side tint

**Choice**: The banner's background is already phase-colored. Layer a
secondary accent dot + text label for the active side colored per the
token side palette (Player = `blue-500`, Opponent = `red-500`).

**Rationale**: Preserves the phase-color channel (which is how players
learn the phase visually) and layers side info without a color conflict.
Task 10.3 says "shows active side with the same side color used on
tokens" — this is literally that, rendered beside the turn label.

**Discovered during**: Task 10.3

### Decision: Event log phase + actor columns

**Choice**: Extend `EventLogDisplay` so each `EventRow` renders an
explicit short phase chip (Init/Move/Atk/Phys/Heat/End) and an optional
actor column resolved from a new `actorLookup` prop
(`Record<unitId, designation>`). `GameplayLayout` builds the lookup from
the session's units and passes it down.

**Rationale**: Task 11.3 requires "phase, actor, one-line summary" on
every entry. The existing `formatEvent()` already produced summaries
but didn't surface phase or actor as their own visual channels. A
prop-based lookup keeps the log component presentation-only.

**Discovered during**: Task 11.3
