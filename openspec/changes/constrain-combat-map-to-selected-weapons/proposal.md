# Change: Constrain Combat Map To Selected Weapons

## Why

Combat map projection still used every configured weapon for the selected unit
after the player narrowed the attack plan to a subset of weapons. That could
make range bands, firing arcs, and valid-target highlights overpromise attacks
that the current selected weapon set could not actually make.

## What Changes

- Carry selected weapon IDs from the attack plan into map combat projection.
- Filter valid-target derivation and command-preview combat projection to the
  same selected weapon set.
- Preserve the existing all-weapons preview behavior when no weapons are
  selected yet.

## Non-Goals

- Change BattleTech range, arc, LOS, heat, ammo, or to-hit math.
- Change attack resolution or weapon-selection UI behavior.
- Treat missing/unknown selected weapon IDs as all weapons.
