# Proposal: Route Movement Command Payloads

## Why

Movement commands already return structured `mode` payloads for walk, run, and jump, but the tactical command surfaces drop those payloads before the game page receives them. In interactive Movement phase, a Walk/Run/Jump command click can therefore look like a plain `lock` action instead of selecting the movement mode that drives the map overlay.

## What Changes

- Forward structured command payloads from the tactical action dock and command context menus.
- Route walk/run/jump command payloads in the game page into the existing planned-movement seed state.
- Reuse the same empty-plan shape used by movement type switching so the shared movement projection recalculates reachable hexes for the chosen mode.
- Preserve legacy action-id dispatch for commands without movement-mode payloads.

## Out of Scope

- Changing movement cost, heat, terrain, elevation, or jump validation rules.
- Changing how committed movement applies to the engine.
- Adding new movement commands or replacing the legacy `lock` action id.

## Impact

- Affected spec: `tactical-map-interface`
- Affected code: command dispatch surfaces, gameplay page action handling, movement planning helpers
- Tests: focused command dispatch and movement helper coverage
