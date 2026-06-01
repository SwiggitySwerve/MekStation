# Apply AirMek Landing Fall Clusters

## Why

The failed AirMek landing-control path now emits a `UnitFell` consequence, but
the resolved fall clusters were not applied to armor/internal state. That left a
map-command result where the event log said the unit crashed while the unit's
armor/structure stayed unchanged.

## What Changes

- Reuse the existing fall cluster result from `resolveFall(...)`.
- Apply each cluster through the existing `resolveDamage(...)` +
  `DamageApplied` reducer path.
- Allow `DamageApplied` events caused by runtime movement consequences to carry
  the current movement phase instead of always stamping weapon attack phase.

## Source Notes

- MegaMek `TWGameManager.crashAirMek(...)` routes failed AirMek landing-control
  checks into `doEntityFallsInto(...)`.
- MekStation already has a fall cluster model and armor/internal reducer path;
  this change connects the AirMek landing command path to that reducer instead
  of inventing a separate crash-damage channel.
