# Import Vehicle Critical Target Equipment Availability

## Why

Vehicle critical fallthrough now understands availability context, but committed
session attacks still treated target vehicle weapons as unrepresented even when
the adapter already knew each vehicle weapon's mounted location. That left
weapon-jam, weapon-destroyed, and stabilizer entries optimistic in places where
MekStation could prove the struck location had no relevant target weapon state.

MegaMek Tank / VTOL critical selection checks per-location weapon availability,
per-location mounted weapon presence for stabilizers, loaded cargo, and prior
stabilizer damage before accepting those critical entries. MekStation should
feed any represented target-equipment facts into the same fallthrough path while
keeping unknown cargo/stabilizer import state optimistic.

## What Changes

- Carry optional vehicle critical availability metadata on `vehicleInit`.
- Derive target weapon mount presence and live weapon availability from adapted
  vehicle weapon mount locations during session setup.
- Feed the committed session vehicle critical resolver from the target unit's
  represented availability metadata.
- Keep cargo-loaded and stabilizer-hit fields explicit opt-ins until MekStation
  has a source-backed import path for those facts.

## Out Of Scope

- Full cargo/passenger import parity for vehicle critical `cargo_hit` entries.
- Runtime mutation for vehicle stabilizer critical state after a stabilizer hit.
- Dual-turret split identity beyond the current generic turret hit location.
- External differential sweeps across all MegaMek vehicle equipment states.
