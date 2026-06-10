# Show Combat Weapon Availability Count

## Why

Combat projections already know which weapons are available, blocked by arc,
blocked by range, or otherwise illegal. The compact on-map combat badge still
shows only the target range band, so a target with one usable weapon and several
blocked weapons looks the same as a fully usable target until the player hovers.

## What Changes

- Add a compact visible weapon availability count for multi-weapon combat
  projections.
- Source the count and blocked reason metadata from existing
  `weaponRangeOptions` projection data.
- Keep single-weapon target badges uncluttered.

## Impact

Players can tell from the map whether a highlighted target is broadly armed or
only partially legal before opening the detailed tooltip or committing a volley.
