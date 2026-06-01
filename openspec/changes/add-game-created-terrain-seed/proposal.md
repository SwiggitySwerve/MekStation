# Add GameCreated Terrain Seed

## Why

Replay projection can now consume later `TerrainChanged` events, but the
initial generated or configured battlefield terrain is still implicit in
the live engine grid. A saved event log can therefore replay the opening
position as a flat clear map until the first terrain mutation appears.

## What Changes

- Add optional `IGameCreatedPayload.hexTerrain` for non-default starting
  terrain and elevation.
- Seed that payload from the engine grid for automated and interactive
  sessions without serializing every flat clear hex.
- Rebuild recovered interactive grids from the `GameCreated` terrain seed
  plus later `TerrainChanged` overrides.
- Project the seed into replay `hexTerrain` at sequence zero.

## Out of Scope

- Changing movement, LOS, or combat terrain rules.
- Migrating older replay logs that predate `hexTerrain`.
- Rendering changes for top-down or isometric terrain labels.
