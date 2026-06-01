# Resolve AirMek Landing Crash Criticals

## Why

Failed AirMek landing fall clusters now reduce armor/internal state and emit
destruction lifecycle events, but structure-exposing crash damage still stops
short of the normal critical-hit follow-through. That means replay and tactical
map consumers can see internal damage without the critical-hit/component
destruction explanation the combat resolver would provide.

## What Changes

- Run AirMek landing fall cluster damage with the shared critical-hit context.
- Emit movement-phase `CriticalHit`, `CriticalHitResolved`, and
  `ComponentDestroyed` events when crash damage triggers represented criticals.
- Preserve movement-phase stamping for critical cascades such as gyro PSRs,
  pilot hits, and unit destruction.
- Keep structural destruction and critical-induced destruction from duplicating
  `UnitDestroyed` events.

## Source Notes

- MegaMek failed AirMek landings resolve through fall/crash damage rather than
  an explanation-only marker.
- MekStation's shared damage resolver already owns structure-damage critical
  triggers and critical-resolution event output; landing crash damage should
  consume that same path so map/replay consumers see one causal vocabulary.
