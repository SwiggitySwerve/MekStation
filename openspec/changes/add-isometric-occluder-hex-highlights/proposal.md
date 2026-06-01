# Proposal: Add Isometric Occluder Hex Highlights

## Why

Isometric mode already boosts units that may be hidden behind tall terrain, but the terrain that causes the visibility issue is not identified on the map. Players can see the hidden unit pop forward without an equally clear indication of which stacked elevation is blocking the view.

The map should highlight the occluding hex and its elevation stack so isometric readability works from both sides of the problem: the unit that needs foreground visibility and the tall terrain that may hide it.

## What Changes

- Derive an isometric occluder lookup from existing terrain occlusion data.
- Mark occluding hexes with data attributes that list the unit ids and reasons they may obscure.
- Render an isometric-only outline/badge on occluding terrain hexes.
- Emphasize the stacked elevation layers for occluding terrain.

## Out of Scope

- Changing line-of-sight or combat legality.
- Changing top-down rendering.
- Changing camera rotation rules.

## Impact

- Affected spec: `tactical-map-interface`
- Affected code: `src/components/gameplay/HexMapDisplay/*`
- Tests: projection helper coverage plus focused render coverage for isometric occluder hex metadata/highlight
