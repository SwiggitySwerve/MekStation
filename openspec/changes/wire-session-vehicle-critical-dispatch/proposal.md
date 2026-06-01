# Wire Session Vehicle Critical Dispatch

## Why

The session weapon path now routes represented vehicle targets through vehicle
hit-location and damage state, but TAC and structure-exposing hits still stopped
before the vehicle critical-hit helper. That left replay state unable to show
vehicle crew stun, engine-hit, weapon-destroyed, and ammo-explosion outcomes
from committed weapon fire, even though those effects are part of the
rules-backed tactical explanation the map depends on.

MegaMek confirms that vehicle criticals are rolled through the tank critical
path after a qualifying vehicle hit: `TWGameManager.criticalTank(...)` rolls 2d6
and calls `Tank.getCriticalEffect(...)`, while `Tank.java` and `VTOL.java`
resolve location-sensitive effects such as driver/commander hits, weapon
damage, stabilizers, sensors, engines, fuel tanks, ammo, turret locks, and rotor
effects.

## What Changes

- Trigger the existing vehicle critical helper from session vehicle attacks on
  TAC or structure-exposing vehicle damage.
- Emit replay-visible critical, crew-stun, component-destroyed, ammo-explosion,
  and unit-destroyed events for the applied vehicle critical result.
- Preserve vehicle engine type and ammo explosion damage metadata in session
  state so critical effects have the context they need.
- Update reducers so replayed vehicle critical events mutate the vehicle combat
  envelope.

## Out Of Scope

- Replacing the existing simplified MekStation vehicle critical table with the
  full MegaMek location-sensitive `Tank.getCriticalEffect(...)` /
  `VTOL.getCriticalEffect(...)` tables.
- Dual-turret split critical resolution beyond the current generic turret
  location.
- External MegaMek differential sweeps across the full vehicle critical matrix.
