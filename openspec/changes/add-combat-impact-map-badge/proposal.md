# Add Combat Impact Map Badge

## Why

Combat projections already carry the projected heat, ammo use, listed damage, and expected damage for attackable targets. Tooltips and command previews expose those details, but the compact on-map target badge only shows the range band, forcing the player to hover before seeing the basic impact of a legal attack.

## What Changes

- Add a compact attack-impact badge for attackable target hexes with available weapon impacts.
- Show projected heat, listed damage, expected damage when available, and total ammo spent in the badge text.
- Preserve the same values as badge metadata without recalculating attack legality or weapon impact in the renderer.

## Out of Scope

- Changing weapon selection, damage calculation, ammo consumption, to-hit, LOS, or attack commit rules.
- Showing impact badges for blocked attacks.
