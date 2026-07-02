# Notepad — Phase 4 (Composer UI) learnings

Written by the phase-4 (composer-ui) worker for phase-5 (test migration + verification) + orchestrator.

## What phase 4 delivered (COMPLETE, verified green)

- **New component tree** `src/components/gameplay/MovementIntentComposer/`:
  - `MovementIntentComposer.tsx` — container; reads the `movementIntent` slice + phase-1 selectors,
    hosts the three sub-panels, owns pending-mode state + posture hotkeys + Lock-In.
  - `PosturePalette.tsx` (4.2) — legal postures w/ MP costs; disabled entries carry a non-color-only
    glyph (`⊘`) + sr-only reason (`data-posture-disabled-glyph`).
  - `CostLedger.tsx` (4.3) — per-item rows (`ledger-row-N`), running total (`movement-cost-ledger-total`),
    per-budget affordability chips (`ledger-budget-<mode>` w/ `data-budget-affordability` =
    affordable|exhausted|over), world-change flag (`movement-cost-ledger-recompute-flag`).
  - `BudgetResolver.tsx` (4.4) — affordable modes w/ heat+to-hit consequence lines
    (`budget-consequences-<mode>`), Forced badge, explicit `movement-lock-in-btn` (never auto-picks).
  - `posturePaletteSource.ts` — pure derivation; legality from the REAL posture-command availability
    predicates, MP from `getStandingCost`/`getHullDownEntryCost`. No UI-local math.
  - `composer.types.ts` — `IMovementComposerContext` (the grouped dock context) + `IPosturePaletteEntry`.
- **Dock hosting (4.1)**: `TacticalActionDock` gained an `intentComposer?: IMovementComposerContext` prop;
  renders `<MovementIntentComposer>` leading the movement/PRIMARY-ACTION zone when active. Threaded as
  `composerDockContext` GameplayLayout (built internally in `GameplayLayout.tsx` from `intentComposer.
  composerActive` + `selectedMovementCapability` + `actionContext`) → render → actionDockSlot → dock.
- **Movement-verb removal (4.1)**: `movementTraversalCommands.ts` reduced to Evade ONLY (Walk/Run/Sprint/
  Jump removed). Evade stays a `movement`-category command with hotkey `E` (ADR models Evade as a Posture
  Action; hotkey doctrine reserves E=Evade). Its availability predicate is the single source of truth the
  composer's Posture Palette reuses for Evade legality.
- **In-map mpLegend demotion (4.1)**: `GameplayLayout.mapPanel.tsx` withholds `onMovementModeSelect` from
  `HexMapDisplay` when `composerActive` → the `mp-legend` renders NON-interactive (its buttons lose
  `data-selectable`). Single Movement Authority satisfied: composer is the only interactive selector.
- **Evade posture (spec/type)**: added `'EVADE'` to `PostureActionType`. The composer's Evade posture has
  0 path MP (charged via the run/evade budget), so it never shrinks the placeable set.

## Test coupling updated IN THIS PHASE (all green)

- `movementCommands.01/02.test.ts` — command-list now `[evade, stand, carefulStand, hullDown, goProne,
  masc, supercharger, stabilize, cancel]`; walk/run/sprint/jump availability tests removed.
- `TacticalActionDock.01/02.test.tsx` — walk/run/jump button assertions → evade; movement command-preview
  PANEL still renders (keys off any `movement`-category command = Evade), but COMMIT is composer-owned so
  the run/walk commit-button tests are dropped.
- `useCommandRegistry.test.ts` — movement.walk/jump inclusion → evade/stand; hex filter no longer yields a
  movement command (traversal verbs were the only `targetsHex` commands).
- `HexContextMenu.test.tsx` — hex menu no longer offers movement commands (empty in Movement). NOTE:
  `HexContextMenu` is a DORMANT component (only its own test consumes it) — not mounted in the live HUD.
- `GameplayLayout.tacticalProjectionFrame.test.tsx` — dropped the walk-button disabled assertion (preview
  panel carries the blocked reason now).
- `useCommandPreview.test-helpers.ts` — the `walk` binding points at `movement.evade` (preview infra is
  category-driven, unchanged).

## Phase-5 handoff (test migration + evidence)

- **e2e capture spec (`e2e/playable-command-feature-screens.spec.ts`) already asserts the phase-4 target**:
  `movement-type-switcher` count 0 (line 762), `command-btn-facing.rotate-right (D)`, `command-btn-
  movement.evade (E)` (line 766), and `tactical-action-dock:movement` ready-marker. My changes KEEP the
  `movement-type-switcher` at 0 (already gone via CombatPlanningPanel) and KEEP `command-btn-movement.evade
  (E)`. I did NOT touch e2e specs (phase 5 owns them). The capture-spec assertions I could break are all
  still satisfied.
- **`movement-mode-readout`** (CombatPlanningPanel.sections) is unchanged and still visible — it is a
  non-interactive readout, consistent with Single Movement Authority.
- **Composer testids for e2e re-anchoring**: `movement-intent-composer`, `movement-posture-palette`,
  `posture-action-<ACTION>`, `movement-cost-ledger`, `ledger-budget-<mode>`, `movement-budget-resolver`,
  `budget-option-<mode>`, `movement-lock-in-btn`.

## Keyboard/touch note (task 4.5)

- **Posture hotkeys** (window keydown, ignores input/textarea/contentEditable, ignores modifier chords):
  `e`=Evade, `s`=Stand Up, `c`=Careful Stand, `p`=Go Prone, `h`=Hull Down. A hotkey only fires the LEGAL,
  ENABLED posture — a disabled/absent posture is a no-op (cannot smuggle in an unaffordable action).
- **Backspace pop** is owned by phase 3 (`useIntentComposerMap`, window keydown) — unchanged.
- **Keyboard hex-cursor waypoint placement: DOES NOT EXIST and was NOT built** (per brief instruction).
  The map's `handleKeyDown` (`useMapInteraction.handlers.ts::useKeyboardHandler`) only handles isometric
  rotation (Q/E in `isometric2d` mode) — there is no hex-cursor navigation to hook waypoint placement onto.
  Building a hex keyboard-nav system is out of scope for this change; flag as a follow-up if a11y
  keyboard-only waypoint placement is required. Touch taps place waypoints via the existing `onHexClick`
  (composer's `handleComposerHexClick`), which is pointer/touch agnostic.
- **E hotkey collision**: the map rotates isometric on E, but only when map-focused in `isometric2d`
  projection AND the event reaches the map's onKeyDown; the composer's E→Evade listens on `window`. This
  matches the pre-existing dock Evade hotkey (E) + the hotkey doctrine (E=Evade). No new collision
  introduced. If a future isometric+composer session shows a real conflict, gate the composer E hotkey on
  non-isometric projection.

## Gotchas

- `TacticalActionDock.tsx` hit the 400-line oxlint `max-lines` cap after hosting the composer — extracted
  `previewCommandForContext` + `commandIdForPhysicalAttack` into `TacticalActionDock.previewSelect.ts`.
- `composerDockContext` is built INSIDE `GameplayLayout.tsx` (not passed from the page) to avoid a prop
  name collision and to reuse the already-computed `actionContext` + `selectedMovementCapability`.
- `MovementMotiveMode` excludes run/jump — test capabilities use `movementMode: 'walk'` not `'biped'`.
- oxfmt single-quote; the rogue editor hook double-quotes edited files — run `npx oxfmt --write` then
  `--check` last.
