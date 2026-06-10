# Surface Building Identity Map Context

## Why

Generated and encoded building terrain can now carry a stable `buildingId`, and physical attack previews use that identity when push legality depends on whether attacker and target share a building. The map needs to expose that represented identity so terrain/elevation evidence is auditable from the same surfaces players and tests inspect.

## What Changes

- Include building id, level, and construction factor in terrain/elevation projection source detail when present.
- Expose represented building ids on rendered hex metadata.
- Show building ids in terrain hover and action hover terrain context.

## Out of Scope

- Changing movement, combat, LOS, cover, or physical attack legality.
- Guessing building identity for legacy simple terrain strings that do not carry ids.
