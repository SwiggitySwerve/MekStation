# Wire Session Vehicle Damage Dispatch

## Why

Represented vehicle targets already have vehicle hit-location tables, motive
damage, rotor crash checks, and vehicle combat state primitives, but session
weapon resolution still sent hits through the generic Mek hit-location and
damage pipeline. That made tactical-map attack previews less trustworthy for
vehicle targets: the UI could explain vehicle-specific arcs or hull-down rules
while the committed event stream resolved a Mek location.

## What Changes

- Seed represented vehicle combat state from session unit data.
- Route weapon hits against `combatState.kind === "vehicle"` through vehicle
  hit-location and vehicle damage resolution.
- Emit replay-visible vehicle damage, motive, immobilization, VTOL crash, and
  destruction events from the session attack resolver.
- Keep hull-down vehicle fixed-location behavior in the committed attack path,
  including no normal location-roll consumption for protected turret hits.
- Mirror vehicle damage and motive events back into `IUnitGameState.combatState`
  during event replay.

## Out Of Scope

- MegaMek dual-turret split locations beyond MekStation's current generic
  `Turret` location.
- Full vehicle critical-hit table dispatch beyond existing event primitives.
- External MegaMek differential sweeps for the full vehicle attack matrix.
