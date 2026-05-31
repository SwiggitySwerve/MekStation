# Spec Delta: Game State

## ADDED Requirements

### Requirement: Component Damage Preserves Actuator Location When Available

Component damage state SHALL preserve actuator critical damage by combat
location when the critical-hit resolver receives a combat location.

#### Scenario: Actuator critical hit records location-keyed damage

- **GIVEN** a critical slot actuator is destroyed in a known combat location
- **WHEN** the critical effect updates component damage
- **THEN** the aggregate actuator flag SHALL remain set for existing consumers
- **AND** the same actuator SHALL be marked under `actuatorsByLocation` for the
  hit location.
