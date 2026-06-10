# Align Vehicle Critical Availability Fallthrough

## Why

The location-sensitive vehicle critical tables now match MegaMek's Tank / VTOL
table shape, but MegaMek does not treat every table entry as always available.
When an entry such as ammo, an already-hit engine, a previously injured crew
role, a locked turret, or rotor damage on an already immobile VTOL cannot apply,
MegaMek falls through to the next entry in the struck-location table and retries
once from roll 6 before returning no critical.

Without that fallthrough, MekStation can either suppress a represented critical
to nothing or emit an effect that the rules engine would have skipped.

## What Changes

- Add availability-aware fallthrough to the vehicle critical table resolver.
- Feed session vehicle critical dispatch with represented state for explosive
  ammo, engine hits, driver/commander hit counters, primary turret lock, sensor
  hit count, and VTOL immobility.
- Preserve optimistic defaults for unrepresented weapon, cargo, stabilizer, and
  broader equipment import state so the resolver does not invent absence that
  MekStation cannot yet prove.

## Out Of Scope

- Full target weapon/cargo/stabilizer import parity for vehicle critical
  availability checks.
- Dual-turret split identity beyond the current generic turret location.
- External differential sweeps against MegaMek across all vehicle critical
  state permutations.
