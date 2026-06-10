# Spec Delta: Combat Resolution

## ADDED Requirements

### Requirement: Destruction Lifecycle Events

Damage caused by runtime movement consequences SHALL fan out through the same
destruction lifecycle event vocabulary as weapon and physical-attack damage.

#### Scenario: Movement consequence damage destroys a location

- **GIVEN** a movement-phase runtime consequence applies damage through
  `DamageApplied`
- **WHEN** that damage destroys a location
- **THEN** the event stream SHALL append a movement-phase `LocationDestroyed`
  event for that location
- **AND** any normal transfer overflow SHALL append a movement-phase
  `TransferDamage` event.

#### Scenario: Movement consequence damage destroys the unit

- **GIVEN** a movement-phase runtime consequence applies fall damage
- **WHEN** the damage resolver marks the unit destroyed
- **THEN** the event stream SHALL append a movement-phase `UnitDestroyed`
  event before later pilot-hit consequence events.
