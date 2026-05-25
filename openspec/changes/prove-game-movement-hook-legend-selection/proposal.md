# Proposal: Prove Game Movement Hook Legend Selection

## Why

The map legend selection path is already wired through the tactical-map browser harness, but the live game-session movement hook also needs a direct regression. Without that hook proof, a future refactor could leave the map legend browser scenario passing while the real `GameSessionPage` callback stops seeding selected-unit movement projection state.

## What Changes

- Add focused hook coverage for `useGameMovementPlanning.handleMovementModeSelect`.
- Prove the legend callback seeds the selected unit's planned movement at its current position and facing.
- Prove disabled Jump selection remains inert when the live movement capability reports no Jump MP.

## Out of Scope

- Changing movement projection, terrain, elevation, heat, LOS, or committed movement validation rules.
- Adding a full live route Playwright flow.
- Changing the tactical command dock movement path.

## Impact

- Affected spec: `tactical-map-interface`
- Affected code: game-session movement planning tests
- Tests: focused Jest hook coverage plus strict OpenSpec validation
