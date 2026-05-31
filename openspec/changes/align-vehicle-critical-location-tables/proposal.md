# Align Vehicle Critical Location Tables

## Why

Session vehicle attacks now dispatch critical hits, but the critical helper
still uses one generic 2d6 table. MegaMek uses different Tank / VTOL critical
tables by struck location: front, rear, side/body, turret, and VTOL rotor can
produce different critical effects from the same roll.

This gap can make the map/replay layer explain the wrong committed result. A
front TAC roll of 12 should be a crew-killed result, not a generic ammo
explosion, while VTOL rotor criticals should surface rotor damage /
flight-stabilizer / rotor-destroyed outcomes.

## What Changes

- Add location-sensitive vehicle critical table selection based on the struck
  vehicle location, VTOL motion type, engine type, and existing engine-hit
  state.
- Preserve the existing generic table API for older direct callers, but route
  session vehicle attacks through the location-sensitive table.
- Correct fuel-tank critical application so non-fusion fuel-tank hits destroy
  the vehicle as a fuel explosion instead of merely incrementing engine hits.
- Replay representable new outcomes into vehicle combat state, including
  crew-kill, commander/pilot/copilot injury counters, turret lock/destruction,
  and VTOL rotor immobilization.

## Out Of Scope

- Full target weapon/cargo/stabilizer import parity for vehicle critical
  availability checks.
- Dual-turret split location identity beyond the current generic turret
  abstraction.
- External differential sweeps against MegaMek across all Tank/VTOL critical
  state permutations.
