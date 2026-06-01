# Queue AirMek Landing PSRs

## Why

`pin-airmek-landing-control-context` exposes when a represented LAM AirMek
descent to ground level requires MegaMek's landing control roll. The next
rules-backed step is to connect that map-facing landing metadata to the
existing PSR queue so the tactical map and engine state agree: if the map says
the damaged landing needs a control roll, the session must carry a pending
canonical PSR before the turn advances.

## What Changes

- Add a canonical `airmek_landing` PSR trigger and factory.
- Queue `PSRTriggered` immediately after an AirMek landing runtime
  movement-state event when the landing metadata says a roll is required.
- Preserve `reasonCode` from `PSRTriggered` into `pendingPSRs`.
- Resolve AirMek landing PSRs with the landing-specific modifier carried by
  the runtime event instead of generic gyro and actuator modifiers that would
  double-count MegaMek's `checkAirMekLanding()` result.

## Source Pins

- MegaMek `MovePathHandler.java:1079-1084` calls `landAirMek(...)` when an
  AirMek lands from WiGE-style movement.
- MegaMek `TWGameManager.java:20858-20863` calls
  `LandAirMek.checkAirMekLanding()` and only crashes the unit when that skill
  check fails.
- MegaMek `LandAirMek.java:789-847` computes the AirMek landing check from
  effective gyro hits, destroyed legs, leg actuators, and optional TacOps hip
  actuator damage.

## Out Of Scope

- Applying failed AirMek landing crash/fall damage.
- Full airborne AirMek/WiGE pathing, hover, takeoff, velocity, or automatic
  minimum-distance landing.
