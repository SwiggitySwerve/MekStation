# Align Tactical Map Rules Projection

## Why

The tactical map is becoming the main surface for movement and combat decisions, but recent work exposed a recurring failure mode: visual highlights can drift from the actual rules engine. Examples include fog targetability using the wrong grid, raw legacy `attackRange` overriding weapon-backed projection, and firing-arc shading ignoring selected rear-mounted weapons.

BattleTech movement, terrain, elevation, visibility, firing arc, and weapon-range interactions are rules-heavy. The map must explain those interactions clearly in both top-down and isometric modes while remaining a renderer of rules-backed projections, not a second rules implementation.

## What Changes

- Make `tactical-map-interface` require a shared rules-projection contract for movement, combat, terrain/elevation, visibility, and isometric presentation.
- Require top-down hexes to display terrain and elevation in a readable BattleTech board-game style, with Antiyoy-like clarity but BattleTech-specific data.
- Require isometric mode to preserve the same axial-coordinate rules contract while adding stacked elevation readability, rotation, and tools for seeing/selecting units behind high terrain.
- Require movement and combat highlights to agree with commit validation through preview-vs-commit fixtures.
- Pin the source-of-truth order: official BattleTech rules where citable, MegaMek tactical behavior as practical oracle, MekHQ only for campaign/scenario workflows, and local OpenSpec/Jest fixtures for project acceptance.

## Capabilities

### Modified Capabilities

- `tactical-map-interface`

## Impact

- Affected specs: `tactical-map-interface`, with behavioral dependencies on `movement-system`, `combat-resolution`, `terrain-system`, `terrain-rendering`, `fog-of-war`, `line-of-sight-visualization`, `firing-arc-calculation`, and `camera-controls`.
- Affected code areas: `src/components/gameplay/GameplayLayout*`, `src/components/gameplay/HexMapDisplay/*`, tactical overlay hooks, movement projection utilities, combat range projection utilities, fog/visibility adapters, terrain rendering, and map projection controls.
- Verification must include focused unit tests for projection agreement, OpenSpec validation, typecheck, lint, and browser/visual checks for top-down plus isometric map readability before this change is archived.
