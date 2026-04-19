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
