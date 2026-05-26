# Block Hull-Down Vehicle Front Weapons

## Why

MegaMek blocks hull-down tanks from firing front-mounted weapons unless the
attack is indirect (`ComputeToHitIsImpossible.java:637-643`). MekStation already
projects attacker-side hull-down Mek leg-weapon and kick restrictions, but
vehicle front-mount restrictions remain a visible trust gap: the tactical map
can still show a direct front-mounted vehicle weapon as usable even though the
rules source rejects it.

## What Changes

- Source-pin the vehicle hull-down weapon gate to MegaMek
  `ComputeToHitIsImpossible.java:637-643`.
- Preserve vehicle mount metadata from live weapon status into attack planning
  weapons.
- Block direct front-mounted vehicle weapons in tactical combat projection,
  interactive commits, bot commits, and quick-sim weapon loops when the attacker
  is hull-down.
- Keep indirect front-mounted fire available when the weapon is declared in
  indirect mode.

## Out Of Scope

- Hull-down entry/exit movement actions.
- Full fortified-side-table behavior for vehicles and QuadVees.
- Punch/club hull-down hit-table nuances.
