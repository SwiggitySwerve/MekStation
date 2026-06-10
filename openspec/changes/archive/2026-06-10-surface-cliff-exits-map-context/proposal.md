# Surface Cliff Exits Map Context

## Why

MegaMek board cliff-top exits now import into `IHexTerrain`, and movement projection uses that metadata to distinguish sheer cliffs from ordinary elevation changes. The map still needs to expose those represented directional cliff edges in the same terrain/elevation explanation surfaces players and tests inspect.

## What Changes

- Include represented `cliffTopExits` in terrain/elevation projection source detail when present.
- Expose cliff exit directions on rendered hex and terrain label metadata.
- Show cliff exit directions in terrain hover and action hover terrain context.

## Out of Scope

- Changing movement, combat, LOS, cover, or parser behavior.
- Inferring cliff edges from elevation deltas when no `cliffTopExits` metadata is represented.
