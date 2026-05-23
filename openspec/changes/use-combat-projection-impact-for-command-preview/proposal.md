# Use Combat Projection Impact For Command Preview

## Why

The tactical map combat hover now receives projected weapon heat and ammo impact from `ICombatRangeHex`. The weapon command preview still recomputes the same heat/ammo values by scanning selected weapon statuses after filtering by projected weapon ids.

That leaves two UI paths responsible for attack cost display. The command preview should consume the same combat projection impact metadata as the map so both surfaces explain one rules-backed attack projection.

## What Changes

- Use `ICombatRangeHex.availableWeaponImpacts` and `availableWeaponHeat` for weapon command preview heat and ammo usage.
- Keep weapon status lookup only for expected damage, which is not yet represented in combat projection metadata.
- Preserve blocked-attack behavior: blocked previews do not spend heat or ammo.

## Out of Scope

- Adding expected damage to combat projection metadata.
- Changing attack resolution, weapon readiness, ammo bin selection, or to-hit math.
