# Spec Delta: Game State Management

## MODIFIED Requirements

### Requirement: Combat-State Seeding at Initialization

`createInitialUnitState` SHALL seed `combatState.kind === "vehicle"` for
represented vehicle-family units (`VEHICLE`, `VTOL`, and `SUPPORT_VEHICLE`)
when the session unit supplies `vehicleInit`.

#### Scenario: Vehicle init seeds vehicle combat state

- **GIVEN** an `IGameUnit` with `unitType: VEHICLE`, `VTOL`, or
  `SUPPORT_VEHICLE`
- **AND** the unit supplies `vehicleInit.motionType`,
  `vehicleInit.originalCruiseMP`, `vehicleInit.armor`, and
  `vehicleInit.structure`
- **WHEN** initial game state is created
- **THEN** the unit SHALL have `combatState.kind === "vehicle"`
- **AND** the inner state SHALL preserve the vehicle motion type, turret type,
  starting motive state, armor, structure, and VTOL altitude when supplied.

#### Scenario: Missing vehicle init is rejected

- **GIVEN** an `IGameUnit` with a represented vehicle-family `unitType`
- **AND** the required `vehicleInit` block or required field is missing
- **WHEN** initial game state is created
- **THEN** initialization SHALL throw an error naming the unit id and missing
  field.

## ADDED Requirements

### Requirement: Vehicle Combat-State Replay

Vehicle damage and vehicle-specific combat events SHALL update the
`combatState.kind === "vehicle"` envelope during event replay so derived state
matches the committed event log.

#### Scenario: DamageApplied mirrors vehicle armor and structure

- **GIVEN** a vehicle unit has `combatState.kind === "vehicle"`
- **WHEN** replay applies `DamageApplied` for a vehicle location
- **THEN** the top-level unit armor and structure SHALL update as before
- **AND** the inner vehicle combat state's armor, structure, and destroyed
  locations SHALL update for the same location.

#### Scenario: Motive events mutate vehicle motive state

- **GIVEN** a vehicle unit has `combatState.kind === "vehicle"`
- **WHEN** replay applies `MotiveDamaged`, `VehicleImmobilized`,
  `TurretLocked`, or `VehicleCrewStunned`
- **THEN** the inner vehicle combat state SHALL reflect the corresponding
  motive penalty, immobilized flag, turret lock, or crew-stun duration.
