# Decisions — add-interactive-combat-core-ui

## [2026-04-18] Action panel IS the record sheet, not a new component

**Choice**: Extend existing `RecordSheetDisplay` with the missing pieces (SPA list, unconscious banner, destroyed/jammed badges, inline ammo counter, header side-badge, empty placeholder text). No new `ActionPanel` component.

**Rationale**: The proposal is explicit — "this panel IS the Phase 1 record-sheet surface". `RecordSheetDisplay` already handles 80% of the contract (armor, heat, weapons, pilot wounds). Creating a parallel component would duplicate logic and drift the two views.

**Impact**: All action-panel task updates happen in `RecordSheetDisplay.tsx` + `RecordSheetPanels.tsx`. `GameplayLayout` already mounts `RecordSheetDisplay` in the right pane.

## [2026-04-18] Responsive drawer approach

**Choice**: Below `lg` (1024px) the record-sheet pane becomes an overlay drawer toggled by a button in the PhaseBanner. Above `lg`, split view unchanged.

**Rationale**: The existing split-view resize handle is desktop-only UX. Mobile/tablet users need a drawer pattern. Tailwind `lg:` breakpoint (1024px) matches the task requirement exactly.

**Impact**: `GameplayLayout` grows a `drawerOpen` state + a toggle. Uses CSS transforms for slide-in; no new dependency.

## [2026-04-18] SPA data flow

**Choice**: Add a new `unitSpas` record (unit-id → readonly array of `{ id, displayLabel, description }`) on `useGameplayStore` and pass it through `GameplayLayout` into `RecordSheetDisplay`. Demo fixture seeds a couple of known SPAs so the empty-state path is exercised too (one unit with SPAs, one without).

**Rationale**: Matches the existing `pilotNames` / `heatSinks` shape. Keeps the SPA resolution concern out of the render layer — the store (or a future session helper) decides what's visible. Phase 1 doesn't need designations rendered; just name + description tooltip.

**Impact**: New field on `GameplayState`, new fixture helper, new prop on `GameplayLayout` + `RecordSheetDisplay`.

## [2026-04-18] Phase banner active-side tint (task 10.3)

**Choice**: The banner's background is already phase-colored. Add a secondary accent dot + text label for the active side colored per the token side palette (Player = blue-500, Opponent = red-500).

**Rationale**: Preserves the phase-color channel (which is how users learn the phase visually) and layers side info without a color conflict. Task 10.3 says "shows active side with the same side color used on tokens" — this is literally that, rendered beside the turn label.

**Impact**: Extends `PhaseBanner` props + DOM; no breaking change to callers (new optional behaviour).

## [2026-04-18] Empty-hex click clears selection (task 2.2)

**Choice**: In `[id].tsx` the existing `handleHexClick` delegates to `handleInteractiveHexClick(hex)` in interactive mode (for movement target selection). When `interactivePhase === InteractivePhase.SelectUnit` (no movement target context) AND the clicked hex has no unit token, `selectUnit(null)` must fire.

**Rationale**: The spec's Scenario 2 ("Click empty hex clears selection") is the missing hook. Implementing it inside `handleInteractiveHexClick` keeps the mode-aware behaviour in one place.

**Impact**: Edit `useGameplayStore.ts` `handleInteractiveHexClick` branch + a non-interactive fallback in `[id].tsx`.

## [2026-04-18] Task 5.1 — compact ArmorPipRail instead of literal ArmorPip reuse

**Choice**: Introduce a new `ArmorPipRail` sub-component in `RecordSheetPanels.tsx` that renders per-location armor and internal structure as dense 8×8px dots (green = armor filled, amber = structure filled, red = location destroyed, gray = empty). Do not mount the existing full-size `ArmorPip` button component (48×48px, interactive cycle state machine) inside the combat record sheet.

**Rationale**: The spec language is "panel SHALL include armor pips for all eight locations" — generic pip visualization, not a specific React component. The existing `ArmorPip` is a click-to-damage toggle designed for the construction-tool record sheet; with up to 30 armor points per location it would blow the dense combat panel layout. The rail reuses `ArmorPip`'s visual palette (`bg-green-500`, `bg-red-500`, `bg-gray-300`) so the two surfaces remain visually consistent.

**Impact**: `RecordSheetPanels.tsx` exports `ArmorPipRail`; `LocationStatusRow` renders one AR + one IS rail per location, plus a RR rail on torsos. Existing numeric `N/M` row preserved for tests that key on it.

## [2026-04-18] Task 6.1 — keep SimpleHeatDisplay instead of reusing HeatTracker

**Choice**: Do not swap the combat action-panel heat readout to the standalone `HeatTracker` component. Keep `SimpleHeatDisplay` as the live-combat renderer.

**Rationale**: `HeatTracker` is built for construction-tool previews — it carries a scale selector (Single/Double/Triple heat mode), a cooling countdown, and a "MAX HEAT - SHUTDOWN" banner keyed to the old 30/50/70 scale. None of those are appropriate for live combat. `SimpleHeatDisplay` already satisfies the underlying spec scenario ("heat bar SHALL show current heat and dissipation capacity AND tick marks SHALL label canonical thresholds 8, 13, 17, 24") and §§ 6.2 + 6.3 render canonical tick marks + canonical color scale. Swapping to HeatTracker would regress those features.

**Impact**: Task 6.1 remains intentionally unchecked with a rationale note; 6.2 and 6.3 satisfy the spec requirement. Leave for a future change that consolidates the two heat renderers.

## [2026-04-18] Task 7.2 — thin InlineAmmoCounter instead of literal AmmoCounter reuse

**Choice**: Render ammo inline inside `WeaponRow` via a small `InlineAmmoCounter` sub-component that matches the `AmmoCounter` visual idiom (N/M rds, amber tint at 25%, red at empty) without mounting the full fire/reload UI.

**Rationale**: The real `AmmoCounter` component (`src/components/gameplay/AmmoCounter.tsx`) carries `onFire` + `onReload` callbacks and renders a full fire button, reload progress ring, and haptic feedback. That is the "combat ammo HUD" shape — wrong for a dense weapon row where ammo is secondary information. The spec's "reuse" intent is "match the visual language", which the inline renderer does.

**Impact**: Consistent ammo UX across the record sheet and fire HUD; no behavior split. Future change can promote the inline renderer into its own file if it grows.
