# Spec Delta: Game State Management

## ADDED Requirements

### Requirement: Vehicle Critical Replay State

The game-state reducer SHALL mirror replayed vehicle critical effects into the
vehicle combat-state envelope.

#### Scenario: Vehicle engine critical is replayed

- **GIVEN** a unit with `combatState.kind === "vehicle"`
- **WHEN** a `CriticalHitResolved` event with `effect: "engine_hit"` is replayed
- **THEN** the unit's vehicle combat-state `motive.engineHits` SHALL increase
  by one.

#### Scenario: Vehicle driver critical is replayed

- **GIVEN** a unit with `combatState.kind === "vehicle"`
- **WHEN** a `CriticalHitResolved` event with `effect: "driver_hit"` is replayed
- **THEN** the unit's vehicle combat-state `motive.driverHits` SHALL increase
  by one.

#### Scenario: Vehicle ammo critical destruction is replayed

- **GIVEN** a unit with `combatState.kind === "vehicle"`
- **WHEN** a crit-induced `AmmoExplosion` and matching `UnitDestroyed` event are
  replayed
- **THEN** the unit SHALL be marked destroyed
- **AND** the inner vehicle combat state SHALL carry
  `destructionCause: "ammo_explosion"`.
