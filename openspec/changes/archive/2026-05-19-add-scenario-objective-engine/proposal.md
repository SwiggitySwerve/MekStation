# Change: Add Scenario Objective Engine

## Why

Generated combat scenarios can only be won by total destruction. `ScenarioObjectiveType` (`destroy`, `capture`, `defend`, `escort`, `recon`, `breakthrough`) is declared in `src/types/scenario/ScenarioInterfaces.ts`, and `IVictoryCondition` exists in the `encounter-system` spec, but `determineWinner()` / `isGameOver()` only ever count surviving units (`src/services/game-resolution/GameOutcomeCalculator.ts`, `src/simulation/runner/SimulationRunnerState.ts`). Capture / Defend / Breakthrough are unwinnable because there is no spatial objective concept: `IHex` carries no objective data, `HexMapDisplay` has no objective layer, and `ScenarioGenerator` never places objective hexes.

This change builds the objective-hex spatial system — placement, control detection, victory evaluation, rendering, and event logging — for the hex-based core objective types, so a procedurally generated scenario can actually be played to a non-destruction outcome.

## What Changes

- ADDED objective-marker data model: `IObjectiveMarker` keyed by hex coordinate (`"q,r"`), carried on the game session as a separate objective map — `IHex` stays unchanged
- ADDED objective placement during scenario generation: `ScenarioGenerator` places objective hexes appropriate to the scenario's objective type and deployment zones, seeded for determinism
- ADDED objective control detection: a side controls an objective hex under a sole-occupancy rule; contested hexes stay with the last controller
- ADDED objective-based victory evaluation wired into the game-over check for `Destroy`, `Capture`, `Defend`, and `Breakthrough`
- ADDED an objective-marker render layer in `HexMapDisplay` (`ObjectiveMarkersLayer`) with control-state styling
- ADDED objective lifecycle events (`ObjectiveCaptured`, `ObjectiveLost`, `ObjectiveProgress`) appended to the typed event log

## Dependencies

- **Requires**: `encounter-system` (`IVictoryCondition`) and `scenario-generation` (objective-type enum, deployment zones) — both already source-of-truth
- **Required By**: Wave 2 AI change `ai-coordination-and-objectives` (the AI must read objective markers to play the scenario, not just kill units)

## Impact

- Affected specs: `scenario-objectives` (new capability)
- Affected code: `src/types/scenario/ScenarioInterfaces.ts`, `src/simulation/generator/ScenarioGenerator.ts`, `src/services/game-resolution/GameOutcomeCalculator.ts`, `src/simulation/runner/SimulationRunnerState.ts`, `src/utils/gameplay/gameSessionCore.ts` (game-over check), `src/components/gameplay/HexMapDisplay/` (new layer), `src/types/gameplay/GameSessionCoreTypes.ts` (new event types)
- New event types: `ObjectiveCaptured`, `ObjectiveLost`, `ObjectiveProgress`
- No database migrations — objective markers serialize with the game session
- Reproducibility preserved: placement and control detection are deterministic functions of seed and unit positions

## Non-Goals

- `Escort` and `Recon` objective types — they need a protected-unit lifecycle and intel-hex reveal mechanics; deferred to a later change
- Multi-stage / sequential objectives (capture A, then defend A) — single-objective evaluation only
- Objective rewards / campaign salvage tie-in — campaign integration is Wave 4
- AI objective-seeking behavior — the AI consuming markers is Wave 2
