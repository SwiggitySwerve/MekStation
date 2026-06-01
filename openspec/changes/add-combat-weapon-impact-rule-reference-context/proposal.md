# Add Combat Weapon Impact Rule Reference Context

## Why

Combat hover tooltips already explain projected weapon heat, listed damage, and
ammo consumption for the weapons that can fire at a target. The aggregate
combat projection now carries MegaMek-backed rule-reference evidence, but the
per-weapon impact detail rows remain local metadata only. A player, test, or
accessibility inspector should be able to inspect a specific heat/damage/ammo
impact row and connect it to the same shared combat projection evidence as the
target hex.

## What Changes

- Pass the shared tactical projection into combat weapon impact rows.
- Expose combat-channel source and rule-reference metadata on the weapon-impact
  row group.
- Render each weapon impact as an inspectable row with the same combat-channel
  rule-reference metadata plus its existing heat, damage, ammo consumption, and
  ammo-remaining state.

## Out Of Scope

- Recalculating weapon heat, damage, ammo consumption, expected damage, or
  attack legality.
- Changing attack command validation or committed attack resolution.
- Adding new combat damage or ammo rules.
