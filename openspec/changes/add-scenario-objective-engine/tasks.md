# Tasks: Add Scenario Objective Engine

## 1. Objective Data Model

- [ ] 1.1 Add `IObjectiveMarker`, `HexKey`, `ObjectiveControlRule`, and `IObjectiveOutcome` to `src/types/scenario/ScenarioInterfaces.ts`
- [ ] 1.2 Add `objectives: Record<HexKey, IObjectiveMarker>` to the game-session state type in `src/types/gameplay/GameSessionCoreTypes.ts`, defaulting to `{}`
- [ ] 1.3 Map each non-`destroy` `IVictoryCondition` onto objective config (hex count, `holdTurnsRequired`, `requiredUnits`)
- [ ] 1.4 Unit tests for the new types and a session serialization round-trip preserving the objective map

## 2. Objective Placement During Generation

- [ ] 2.1 In `ScenarioGenerator`, place objective hexes per objective type — Capture: 1–3 interior hexes; Defend: hexes inside the defender deployment zone; Breakthrough: exit-edge hexes opposite the attacker deployment
- [ ] 2.2 Seed placement from the scenario seed so identical seeds yield identical objective maps
- [ ] 2.3 Tests: each objective type yields a valid non-empty objective map; same seed → identical placement; markers sit on in-bounds hexes

## 3. Objective Control Detection

- [ ] 3.1 Implement `detectObjectiveControl(marker, session)` — sole-occupancy rule, contested keeps the last controller
- [ ] 3.2 Implement per-turn `holdProgress` advancement (increment while held, reset to 0 on loss of control)
- [ ] 3.3 Tests: sole occupancy flips control; contested keeps last controller; a vacated hex keeps its last controller

## 4. Objective Victory Evaluation

- [ ] 4.1 Implement `evaluateObjectiveOutcome(session): IObjectiveOutcome | null` covering Destroy / Capture / Defend / Breakthrough
- [ ] 4.2 Capture: attacker wins when it holds all objective hexes for `holdTurnsRequired` consecutive turns
- [ ] 4.3 Defend: defender wins at `turnLimit` if still in control; attacker wins immediately on capturing all objective hexes
- [ ] 4.4 Breakthrough: attacker wins when `requiredUnits` of its units have reached an exit hex
- [ ] 4.5 Tests per objective type, including partial progress, control loss mid-hold, and timeout

## 5. Game-Over Wiring

- [ ] 5.1 Call `evaluateObjectiveOutcome` from the game-over check in `GameOutcomeCalculator` / `SimulationRunnerState` / `gameSessionCore` before the destruction fallback
- [ ] 5.2 An objective outcome takes precedence over the turn-limit draw
- [ ] 5.3 Tests: an objective win ends the game even with units alive on both sides; a markerless scenario still ends on destruction

## 6. Objective Marker Rendering

- [ ] 6.1 Add `ObjectiveMarkersLayer` to `HexMapDisplay.layers`, above the terrain overlay and below unit tokens
- [ ] 6.2 Style markers by control state — neutral / friendly / enemy / contested — and show `holdProgress` for Capture
- [ ] 6.3 Storybook story plus render tests for each control state

## 7. Objective Lifecycle Events

- [ ] 7.1 Add `ObjectiveCaptured`, `ObjectiveLost`, `ObjectiveProgress` to `GameEventType` with payloads
- [ ] 7.2 Emit the events from the control-detection pass once per turn
- [ ] 7.3 Tests: events are deterministic; replaying the event log reconstructs objective state

## 8. Verification

- [ ] 8.1 Integration test: a generated Capture scenario is won by holding the objective for the required turns
- [ ] 8.2 Integration test: a generated Breakthrough scenario is won by moving the required units to the exit edge
- [ ] 8.3 Integration test: a generated Defend scenario is won by the defender surviving to the turn limit in control
- [ ] 8.4 `openspec validate --strict` clean; build, lint, and typecheck pass
