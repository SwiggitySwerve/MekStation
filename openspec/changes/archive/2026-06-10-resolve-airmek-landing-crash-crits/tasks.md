# Tasks: Resolve AirMek Landing Crash Criticals

- [x] 1. Thread AirMek landing fall cluster damage through shared critical
  context and deterministic dice.
- [x] 2. Emit movement-phase critical hit, resolved critical, component
  destruction, PSR, pilot-hit, and critical-destruction events from the shared
  critical stream.
- [x] 3. Avoid duplicate `UnitDestroyed` events when the critical stream itself
  destroys the unit.
- [x] 4. Add focused runtime movement tests and update tactical-map audit notes.
