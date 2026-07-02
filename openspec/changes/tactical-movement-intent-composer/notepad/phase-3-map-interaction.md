# Notepad — Phase 3 (Map Interaction) learnings

Written by the phase-3 (map-interaction) worker for phase-4 (composer UI) + orchestrator.

## Architecture map (verified this session)

- **Single owner of every movement prop**: `src/components/gameplay/pages/gameSession/GameSessionPage.movement.ts`
  (`useGameMovementPlanning`). It computes `movementRangeHexes`, `hoveredPath`, `hoverMpCost`, `mpLegend`,
  `handleHexClick`, `handleMovementModeSelect` and hands them up through `[id].tsx` → `GameplayLayout` →
  `GameplayMapPanel` → `HexMapDisplay`. Phase 4's composer UI should read the SAME `movementIntent` store slice
  this phase now drives, not re-derive.
- **Map is prop-driven, not store-driven.** `HexMapDisplay` renders a per-hex `tacticalProjectionFrame`
  (`GameplayLayout.tacticalProjection.ts` → `buildTacticalMapHexProjectionLookup`). The frame is built FROM the
  `movementRange` prop. So "render all affordable envelopes" = "put the right hexes in `movementRangeHexes`".
- **Coloring is automatic.** `HexCell.overlayModel.ts::colorForMovementType` already maps
  Walk→cyan(`#67e8f9`) / Run→yellow(`#fef08a`, dashed) / Jump→red(`#f87171`) / blocked→gray(`#64748b`,
  cross-hatch). Multiple modes on one hex ride in `movementModeOptions` via
  `HexCell.movementOptionSummaries.ts::withSameHexMovementOptions`. NO HexCell edits were needed for 3.1.
- **Phase-1 store actions live on `useGameplayStore`**: `addPostureAction`, `appendWaypoint(leg, finalFacing)`,
  `popWaypoint(restoredFinalFacing)`, `setFinalFacing`, `resetComposition`, `lockIn`, `commitComposedMovement`.
  Selectors are pure fns in `useGameplayStore.movementIntent.ts` (`selectLedgerTotalMp`, `selectBudgetOptions`,
  `selectAffordableBudgets`).
- **Phase-2 routing** lives in `src/utils/gameplay/movement/intentRouting.ts` (`routeLeg`/`routeLegMemoized`,
  `remainingMpForMode`, `reachableEnvelopesByMode`, `placeableWaypointHexes`).

## Decisions this phase made (phase 4 must honor)

1. **Envelope generation stays inside the movement hook** using the existing rule-correct
   `deriveMovementRangeForType` path (threads `environmentalConditions` + `optionalRules`), NOT phase-2's
   `reachableEnvelopesByMode` (which omits ruleOptions). Per-mode envelopes are filtered to
   `budgetMp − ledgerTotal` remaining MP, then merged per-hex with `withSameHexMovementOptions`. This keeps the
   "NO UI-local MP math" invariant AND the environmental/optional-rule parity the legacy envelope had.
2. **Hover anchor** = last waypoint hex (fallback unit hex). Cumulative MP = `ledgerTotalMp + legMp`.
3. **Click** routes a leg via `routeLegMemoized` (locked mode if locked, else the cheapest affordable mode) then
   `appendWaypoint`. Clicking the current last waypoint, or Backspace, `popWaypoint`s. Legacy
   `selectMovementPlan`/`setPlannedMovement` path is retained behind a `composerEnabled` guard so phase 4 can flip
   the dock without breaking the legacy path (the mpLegend + dock buttons still call `handleMovementModeSelect`).
4. **Locked mode**: until the player Locks-In, envelopes show all affordable modes and a click uses the cheapest
   affordable mode that reaches the hex. Phase 4's BudgetResolver Lock-In sets `lockedMode`; after that the map
   anchors routing to the locked mode.

## Phase-3 delivered (COMPLETE, verified green)

- New pure derivation `src/components/gameplay/pages/gameSession/GameSessionPage.movementIntent.ts`
  (`buildIntentEnvelopeHexes` 3.1, `resolveIntentHoverPreview` 3.2, `resolveWaypointClick` 3.3, geometry helpers).
- New React glue `GameSessionPage.movementIntent.hook.ts` (`useIntentComposerMap`) — extracted to keep the
  main movement hook under the 400-line oxlint `max-lines` cap.
- `useGameMovementPlanning` now exposes `composerActive`, `composedLegs`, `lastWaypointHex`,
  `handleWaypointBackspace`, `handleFacingSelect`, and overrides `movementRangeHexes`/`hoveredPath`/`hoverMpCost`/
  `hoverUnreachable` with intent-first values when `composerActive`.
- New SVG `src/components/gameplay/overlays/WaypointLayer.tsx` (3.4) + HTML
  `overlays/FacingPickerOverlay.tsx` (3.5), mounted via mapPanel `svgOverlayChildren` / `overlayChildren`.
- Threaded a single grouped `intentComposer?: IntentComposerMapProps` prop through
  GameplayLayout.types → GameplayLayout → render → mainContent → mapPanel (one prop, not five loose ones).
  Built at `[id].tsx` from the movement hook.
- Tests: `__tests__/GameSessionPage.movementIntent.derivation.test.ts` (8, real routing engine — envelope shrink
  Walk4/Run6→Walk2/Run4, no-envelope-when-exhausted, hover re-anchor, click append/pop/ignore) +
  `overlays/__tests__/WaypointLayer.test.tsx` (6). Evidence PNG 09 confirms simultaneous Walk/Run envelopes render.

## Phase-4 handoff (composer UI)

- The composer UI should read the SAME `movementIntent` slice + `selectBudgetOptions`/`selectAffordableBudgets`
  selectors. `BudgetResolver` Lock-In must call `lockIn(mode)` then `commitComposedMovement(intent, mode)` — the
  map's `routeCheapestLeg` already honors `intent.lockedMode` (routes only under the locked mode once set).
- `composerActive` currently = movement phase + player unit + capability + grid. Phase 4 removing the dock
  movement-verb buttons does NOT need to touch the map — the legacy `handleMovementModeSelect`/`mpLegend` path
  stays wired but becomes dead once the dock buttons are gone. Keep the legacy fall-through in `handleHexClick`
  (the `!composerActive` branch) for non-movement phases.
- FacingPickerOverlay renders as a bottom-right map panel (not pixel-tracked to the hex) — robust under pan/zoom;
  if phase 4 wants it floating exactly on the waypoint, project via `hexToPixel` + camera transform (fragile).

## Gotchas

- `MovementType` is the enum (values `'walk'`/`'run'`/`'jump'`); design D5 called it `MovementMode` but no such enum
  exists (phase-1 note). `MapMovementKind` = `'walk'|'run'|'jump'` is the legend/prop string type.
- `deriveReachableHexes` returns BOTH reachable and blocked hexes; filter on `.reachable && mpCost <= remaining`.
- oxfmt single-quote; a rogue hook double-quotes edited files — run `npx oxfmt --write` then `--check` last.
