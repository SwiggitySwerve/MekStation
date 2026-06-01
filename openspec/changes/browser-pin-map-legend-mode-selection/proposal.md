# Proposal: Browser Pin Map Legend Mode Selection

## Why

The map MP legend can now request Walk, Run, or Jump projection changes, but that behavior needs browser-level evidence on a real map surface. A component callback test proves wiring, while the tactical-map goal needs proof that a player click on the map legend changes the rendered reachable overlay.

## What Changes

- Add a stateful tactical-map browser harness scenario for MP legend mode selection.
- Reuse the existing derived biped walk, run, and jump movement projections as the data source.
- Verify in Playwright that clicking Jump and Walk legend rows updates the visible hex projection metadata and movement badge.

## Out of Scope

- Changing movement costs, pathfinding, heat, terrain, elevation, or commit validation.
- Replacing the gameplay page movement hook with an e2e-only implementation.
- Broad live game-session input coverage beyond the tactical map harness.

## Impact

- Affected spec: `tactical-map-interface`
- Affected code: tactical-map e2e harness, movement fixture exports, Playwright smoke coverage
- Tests: focused fixture Jest plus targeted Playwright browser smoke
