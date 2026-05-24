# Proposal: Block Locked Movement Projections

## Why

The tactical map should only project movement the engine can still accept. After a unit locks movement for the current Movement phase, reachable-hex overlays and movement commands must stop presenting that unit as movable, and any attempted second movement declaration must be rejected by the same engine-facing reason.

## What Changes

- Add a shared movement declaration eligibility check for locked/resolved unit lock states.
- Reject committed movement for units that already locked movement this phase.
- Hide movement range, hover, and MP legend projections for locked/resolved selected units.
- Disable movement commands with the same player-facing reason.

## Out of Scope

- Changing initiative order, phase advancement, or which unit is selected by default.
- Changing terrain, elevation, heat, or pathfinding costs.
- Adding a new undo/replan flow for already locked movement.

## Impact

- Affected specs: `tactical-map-interface`
- Affected code: movement validation, action availability, game-session movement planning
- Tests: focused engine rejection, command availability, and map planning helper coverage
