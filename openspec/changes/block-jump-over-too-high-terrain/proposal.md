# Block Jump Over Too-High Terrain

## Why

MegaMek rejects jump paths that cannot clear the represented terrain height
along the route, not only landings whose base elevation rises above available
jump MP. MekStation already blocks too-high jump landings, but a low landing
behind a taller intervening elevation or building can still be highlighted as
legal.

## What

- Add represented jump-clearance projection for the straight jump path.
- Count base elevation plus represented building levels as jump path height.
- Keep terrain-cost skipping for normal jump landings unchanged.
- Add preview-to-commit agreement coverage for a blocked jump-clearance path.

## Impact

Jump overlays stop over-promising legal landings behind terrain/buildings that
the engine should reject, and committed movement returns the same blocked
reason shown by the map.
