# Apply Battlefield Wreck Terrain

## Why

The previous wreck-marker slice correctly stopped destroyed unit markers from acting as LOS blockers. MegaMek still has a separate optional battlefield wreckage rule: when enabled, some destroyed ground units convert the underlying hex to rough terrain. MekStation needs that distinction so wreck visuals stay non-blocking while optional wreck terrain can still affect later movement projections.

## What Changes

- Add a source-pinned TacOps battlefield wreckage optional rule key, `tacops_battle_wreck`.
- When a live interactive `UnitDestroyed` event appears, mutate the shared tactical grid at the destroyed unit's hex when the optional rule applies.
- Convert destroyed non-infantry/non-protomek units of at least 40 tons to level-1 rough terrain; allow large support tank profiles to upgrade to level-2 rough.
- Keep movement projection and commit behavior aligned by mutating the same grid already used by movement cost and pathfinding helpers.

## Out of Scope

- Treating wreck tokens themselves as terrain, cover, or LOS blockers.
- Adding an event-sourced `TerrainChanged` replay contract.
- Full large-support-vehicle catalog identification beyond the helper profile hook.
