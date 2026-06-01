# Use AirMek Landing Fall Tonnage

## Why

Failed AirMek landing-control rolls currently resolve the fall consequence with
a fixed placeholder tonnage. MegaMek fall/crash damage scales by the unit being
moved, so the tactical map command path must use the represented unit's catalog
tonnage when calculating the `UnitFell` damage preview/result.

## What Changes

- Carry adapted catalog tonnage into the interactive-session resolver lookup map.
- Resolve failed AirMek landing-control falls with the selected unit's represented
  tonnage instead of a fixed placeholder.
- Keep the existing fallback only for synthetic sessions with no represented
  tonnage.

## Source Notes

- MegaMek `TWGameManager.crashAirMek(...)` delegates failed landing-control rolls
  into `doEntityFallsInto(...)`, which operates on the entity that just landed.
- MekStation's current fall model already scales fall damage by tonnage through
  `resolveFall(...)`; this change supplies the moved unit's tonnage to that
  existing resolver.
