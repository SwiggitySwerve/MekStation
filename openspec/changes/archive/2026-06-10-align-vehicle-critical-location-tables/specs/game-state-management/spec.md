# Spec Delta: Game State Management

## ADDED Requirements

### Requirement: Representable Vehicle Critical Replay Effects

The game-state reducer SHALL mirror representable vehicle critical effects into
the vehicle combat-state envelope.

#### Scenario: Fuel tank critical destroys the vehicle

- **GIVEN** a unit with `combatState.kind === "vehicle"`
- **WHEN** a `CriticalHitResolved` event with `effect: "fuel_tank"` is replayed
- **THEN** the vehicle combat state SHALL be marked destroyed
- **AND** the inner destruction cause SHALL be `fuel_tank_explosion`.

#### Scenario: Turret lock critical updates turret lock state

- **GIVEN** a unit with `combatState.kind === "vehicle"`
- **WHEN** a `TurretLocked` event is replayed after a `turret_locked` critical
- **THEN** the vehicle turret lock state SHALL mark the affected turret locked.

#### Scenario: Rotor destroyed critical immobilizes a VTOL

- **GIVEN** a VTOL unit with `combatState.kind === "vehicle"`
- **WHEN** a `CriticalHitResolved` event with `effect: "rotor_destroyed"` is
  replayed
- **THEN** the vehicle motive state SHALL be immobilized.

#### Scenario: Vehicle damage replay updates inner armor and structure

- **GIVEN** a unit with `combatState.kind === "vehicle"`
- **WHEN** a `DamageApplied` event is replayed against a vehicle location
- **THEN** the vehicle combat-state envelope SHALL update the matching inner
  armor and structure values
- **AND** destroyed vehicle locations SHALL be recorded inside the vehicle
  state, not only on the outer unit record.

#### Scenario: Weapon critical replay records availability state

- **GIVEN** a unit with `combatState.kind === "vehicle"`
- **WHEN** a `CriticalHitResolved` event with `effect: "weapon_destroyed"` is
  replayed for a mounted vehicle weapon
- **THEN** the affected weapon SHALL be unavailable in the vehicle combat-state
  envelope.

#### Scenario: Critical destruction cause survives unit destruction replay

- **GIVEN** a vehicle critical has already marked the vehicle destroyed with a
  critical-specific destruction cause
- **WHEN** a later `UnitDestroyed` event for the same vehicle is replayed
- **THEN** the vehicle combat-state envelope SHALL preserve the
  critical-specific destruction cause instead of replacing it with a generic
  unit-destroyed cause.
