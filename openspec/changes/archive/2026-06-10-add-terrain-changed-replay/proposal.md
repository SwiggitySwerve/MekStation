# Add Terrain Changed Replay

## Why

Battlefield wreck terrain currently mutates the live tactical grid, but replay and recovery need the resolved terrain mutation recorded in the event log. Recomputing terrain from `UnitDestroyed` during replay would require tonnage, optional-rule, and grid context that replay consumers do not own.

## What Changes

- Add a typed `TerrainChanged` game event carrying the resolved hex, terrain string, elevation, prior terrain, reason, source unit, and source event.
- Emit `TerrainChanged` when TacOps battlefield wreckage converts a destroyed unit's hex to rough terrain.
- Rebuild recovered interactive grids from event-derived terrain overrides.
- Project `TerrainChanged` into replay `hexTerrain` so timeline scrubbing shows terrain only at and after the mutation event.

## Out of Scope

- Serializing full initial map terrain into `GameCreated`.
- Adding new terrain-changing rules beyond represented battlefield wreckage.
- Isometric or top-down rendering changes.
