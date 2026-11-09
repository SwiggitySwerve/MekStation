## Why

A standalone `SimulationRunner` log folds deterministically through `deriveState`,
but that replay does not equal the runner's private final unit state. A stand-still
smoke test previously hid the distinction by comparing already-cleared values.

The reproducible real-bot corpus uses seeds 1–8, four hydrated Atlas AS7-D units,
ten turns and map radius 4. Fired-weapon values differ for 15 of 32 units and
phase damage for 10 of 32. Every unit also differs in the presence of `activeMASC`
and the EMP counter keys. These are measured characterization values, not
required game rules or desired permanent divergences.

## What Changes

- Commit the corpus inputs and a comparison harness, without raw run dumps.
- Pin current per-seed and aggregate differences so future fixes require an
  explicit characterization update.
- Test ordered deterministic playback, roster identity, turn progression and
  terminal interpretation through the real runner and replay reducer.
- Correct the older stand-still test's explanation of the separate causes.
- State the replay guarantee and its limits in `simulation-system` and
  `game-state-management` delta specifications.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `simulation-system`: distinguish runner event playback from private-state
  reconstruction and retain a reproducible characterization corpus.
- `game-state-management`: document the narrower interpretation of a standalone
  runner log without changing the common event fold.

## Impact

Only runner tests and this OpenSpec change package change. Interactive sessions,
GameEngine auto-resolve, multiplayer journal authority, P2P, replay consumers and
scenario-pack producers retain their runtime behavior. No event, schema pack,
fixture, persisted format or checkpoint identity changes.

## Non-goals

- Emit `PhaseChanged`, infer missing phase boundaries, or fix fired-weapon or
  sparse-key replay differences.
- Establish complete runner-private unit-state equality or authoritative resume.
- Add a runtime admission fence. This documentation is not enforcement.
- Decide whether this characterization closes D-8; full fidelity is a separate
  Root decision.
