# Design: Tactical Map Hex Projection

## Decision

Create a pure projection helper under `src/utils/gameplay/` that takes the already-derived map inputs and returns one immutable projection per hex. `HexMapDisplay` remains the owner of interaction state, but the cell renderer receives movement/combat/terrain/path facts from the projection rather than re-looking them up independently.

## Projection Shape

Each `ITacticalMapHexProjection` carries:

- `hex` and stable `key`
- `terrain`
- optional `movement`
- optional `combat`
- `isSelected`
- `isHovered`
- optional `pathIndex`
- `inAttackRange`
- `intent`: terrain, movement, combat, movement+combat, path, or selected
- `status`: neutral, legal, blocked, or mixed
- `blockedReasons`
- `explanation`

## Source of Truth

The projection helper does not calculate movement costs, LOS, cover, range bands, firing arcs, or to-hit values. It only composes:

- `IMovementRangeHex` values from the movement projection/pathfinder.
- `ICombatRangeHex` values from combat projection.
- `IHexTerrain` values from the rendered grid.
- selected/hover/path state from `HexMapDisplay`.

## Backward Compatibility

Legacy callers that pass only `attackRange` still get `inAttackRange=true` for those hexes. Weapon-backed combat projection continues to win when weapon data is configured.

## Test Strategy

- Unit-test the helper with legal movement, blocked movement, attackable combat, blocked combat, mixed movement/combat, default terrain, and legacy attack range.
- Render-test `HexMapDisplay` metadata in top-down and isometric modes to prove both modes consume the same projection facts.
