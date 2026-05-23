# Add Combat Projection Damage Envelope

## Why

The tactical map combat projection already owns target legality, range, LOS, arc, to-hit, heat, and ammo impact. Weapon command preview still computes expected damage separately from selected weapon status data.

That leaves one attack preview value outside the shared rules-backed projection. Expected damage should travel with the same `ICombatRangeHex` data used by map hover, projection explanations, and command preview.

## What Changes

- Add projected weapon damage metadata to combat projection weapon impacts.
- Add aggregate listed damage and hit-probability-weighted expected damage to `ICombatRangeHex`.
- Render projected damage in combat hover/explanation/aria text when an attackable target has available weapons.
- Refactor weapon command preview expected damage to read from combat projection.

## Out of Scope

- Changing attack resolution, dice rolling, hit location, cluster table resolution, or ammo bin selection.
- Replacing weapon status damage data with a fuller canonical weapon catalog.
- Changing movement, physical attack, LOS, cover, or firing arc rules.
