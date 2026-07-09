## Why

Single-player campaign battles are unplayable: every interactive session starts in the Initiative phase, but the single-player tactical surface renders no control to advance out of it (the action dock registers zero Initiative-phase commands and `advance-phase-button` exists only on the networked surface). Clicking the map while stuck throws an unhandled `Not in movement phase` error. The GM escape hatch is also broken — approving "Advance Phase (GM)" updates the turn-rail projection while the engine session stays in Initiative, so the next real action crashes. Found in the 2026-07-07 live playtest (`.sisyphus/evidence/playtest/2026-07-07-live-playtest/REVIEW.md`, findings C1 + C2).

## What Changes

- Add a player-facing phase-advance affordance to the single-player tactical surface that is present in EVERY phase, including Initiative (where it reads as "Roll Initiative"/begin-round semantics), wired to the engine's existing `advanceInteractiveSessionPhase` transition (which already rolls initiative and advances to Movement).
- Make approved GM tactical interventions commit to the live `InteractiveSession` — approval must mutate real engine state (and append the intervention record), not just the display projection. Turn-rail "pending" projections must reconcile to the committed engine state.
- Replace the unhandled `Not in movement phase` throw surfaced by map interaction with a phase-guarded UI: out-of-phase map intents are either not offered (no movement overlay/prompt during Initiative) or rejected with a visible, friendly message — never an uncaught error.
- Fix `setInteractiveSessionLogic` (store adoption) so a session in Initiative does not drop the UI into unit-select/movement affordances that the engine will reject.

## Capabilities

### New Capabilities

_None — all changes modify existing spec'd behavior._

### Modified Capabilities

- `tactical-map-interface`: "Phase Progression Controls" requirement gains Initiative-phase coverage — a progression control SHALL exist in every phase on every play surface (single-player included), and out-of-phase map interactions SHALL be prevented or explained, never thrown.
- `gm-tactical-command-surface`: "GM Confirmation Shows Private and Public Effects" / tactical intervention surface gains an explicit commit guarantee — an approved tactical intervention SHALL be applied to the live engine session such that subsequent player actions validate against the post-intervention state.

## Impact

- **UI**: `src/components/gameplay/TacticalActionDock/` (new Initiative/all-phase advance command; command registry), `src/components/gameplay/TacticalTurnRail/` (rail reflects committed phase, pending-badge reconciliation), SP game page `src/pages/gameplay/games/[id].tsx` wiring.
- **Store/engine glue**: `src/stores/useGameplayStore.session.ts` (`setInteractiveSessionLogic` Initiative handling), `src/stores/useGameplayStore.actionHandlers.ts`, `src/engine/InteractiveSession.phases.ts` (`advanceInteractiveSessionPhase` — reuse, not rewrite), `src/utils/gameplay/gameSessionCore.movement.ts` (guard surfaced as UI rejection, engine throw stays as a defensive invariant).
- **GM commit path**: `src/lib/interventions/GmTacticalCommandPreviewAdapter.ts`, `GmCombatInterventionImplementer.ts` / `GmCombatInterventionProjection.ts`, `src/hooks/gameplay/usePhaseQueueProjection.ts`, `TacticalActionDock.gmIntervention.tsx` — approval must route projected effects into the `InteractiveSession` (same authority/redaction pipeline, new commit step).
- **Tests**: dock command-registry tests (Initiative no longer command-less), store adoption tests, GM approval integration test asserting engine phase change, e2e journey step (deep-play harness journey 1/3 will capture the fix automatically once implemented).
- **Non-goals**: multiplayer networked surface (already has End Phase); auto-initiative/auto-phase settings; fixing the mission-roster handoff (C4), dev multiplayer store split (C3), or starmap crash (C5) — separate changes; any change to initiative RULES (2d6 roll semantics stay as implemented in `rollInitiative`).
