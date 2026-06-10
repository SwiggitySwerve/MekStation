# Separate Vehicle Critical Stabilizer Mount Presence

## Why

MegaMek's Tank critical selection checks live, unjammed weapons before accepting
weapon-jam / weapon-destroyed entries, but stabilizer entries only require that
a weapon is mounted at the struck location and that the stabilizer has not
already been hit. MekStation's first target-equipment availability slice
collapsed those two ideas into a single "live weapon" availability signal, which
could incorrectly fall through stabilizer criticals when represented mount
metadata still proves a weapon exists there.

## What Changes

- Derive vehicle `weaponLocations` from all represented vehicle weapon mounts.
- Keep `jammableWeaponLocations` and `destroyableWeaponLocations` scoped to
  weapons that are not already destroyed.
- Add focused coverage proving a location with only unavailable mounted weapons
  still accepts stabilizer criticals while weapon criticals fall through.
- Update follow-up tracking so remaining work names cargo import parity,
  runtime weapon/stabilizer state mutation, dual-turret identity, and external
  oracle sweeps instead of treating initial stabilizer mount presence as open.

## Out Of Scope

- Runtime decrement of target weapon availability after a committed vehicle
  weapon critical.
- Runtime stabilizer hit-state mutation after a committed stabilizer critical.
- Cargo/passenger import parity and dual-turret split identity.
