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
