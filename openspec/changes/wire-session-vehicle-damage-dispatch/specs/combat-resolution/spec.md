# Spec Delta: Combat Resolution

## ADDED Requirements

### Requirement: Session Vehicle Damage Dispatch

The system SHALL resolve committed weapon hits against targets whose derived
unit state carries `combatState.kind === "vehicle"` with the vehicle combat
pipeline rather than the generic Mek hit-location and damage pipeline.

#### Scenario: Represented vehicle target uses vehicle damage

- **GIVEN** a weapon attack hits a target with `combatState.kind === "vehicle"`
- **WHEN** the session resolves the attack
- **THEN** the hit location SHALL be selected by the vehicle hit-location table
  for the computed attack direction
- **AND** the emitted `AttackResolved.location` SHALL be the corresponding
  vehicle armor location such as `Front`, `Left`, `Right`, `Rear`, `Turret`, or
  `Rotor`
- **AND** emitted `DamageApplied` events SHALL carry vehicle armor and
  structure remaining values from `vehicleResolveDamage`
- **AND** the generic Mek damage transfer chain SHALL NOT be used for that hit.

#### Scenario: Hull-down fixed location is honored during session resolution

- **GIVEN** a hull-down represented vehicle target is hit through a protected
  arc
- **AND** the vehicle has an available represented turret
- **WHEN** the session resolves the attack
- **THEN** the committed hit SHALL resolve to `Turret`
- **AND** no normal vehicle location-table dice SHALL be consumed for that hit.

#### Scenario: Vehicle motive and crash events are replay-visible

- **GIVEN** vehicle damage triggers motive damage, immobilization, or VTOL rotor
  crash handling
- **WHEN** the session resolves the attack
- **THEN** the event stream SHALL include the applicable vehicle events:
  `MotiveDamaged`, `MotivePenaltyApplied`, `VehicleImmobilized`, and
  `VTOLCrashCheck`
- **AND** fatal vehicle damage SHALL emit `UnitDestroyed` with a compatible
  destruction cause.
