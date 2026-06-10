# Pin Hull-Down Vehicle Side Tables

## Why

MegaMek gives hull-down tanks a different hit-location path than ordinary
vehicle attacks: protected incoming arcs do not roll on the normal vehicle
table. They either strike the turret or the incoming side location, and backed
entry flips the protected direction. MekStation already projects hull-down
cover and attacker restrictions, so the vehicle hit-location primitive needs
the same source-backed behavior before full vehicle combat dispatch is wired.

## What Changes

- Add hull-down vehicle/vehicle-mode QuadVee fixed hit-location support to the
  vehicle hit-location resolver.
- Preserve whether a hull-down entry path used a backward step on replayed
  unit state.
- Document the source-backed behavior and keep focused tests around normal
  tables, VTOL rotor redirection, turret handling, and backed entry.

## Out Of Scope

- Full session-level vehicle damage dispatch.
- Distinguishing MegaMek dual-turret split locations beyond MekStation's
  current generic `turret` vehicle location.
- New UI rendering for the fixed-location result metadata.
