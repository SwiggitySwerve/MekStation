# Spec Delta: Combat Resolution

## ADDED Requirements

### Requirement: Location-Sensitive Vehicle Critical Tables

The vehicle critical resolver SHALL select critical effects using the struck
vehicle location instead of one generic vehicle critical table.

#### Scenario: Front vehicle critical roll uses the front table

- **GIVEN** a represented ground vehicle is critically hit in the front
- **WHEN** the vehicle critical roll total is 12
- **THEN** the applied critical effect SHALL be `crew_killed`.

#### Scenario: Rear vehicle critical roll uses engine fuel context

- **GIVEN** a represented ground vehicle is critically hit in the rear
- **WHEN** the vehicle critical roll total is 12
- **AND** the vehicle has a non-fusion fuel-bearing engine
- **THEN** the applied critical effect SHALL be `fuel_tank`.

#### Scenario: Turret vehicle critical roll can lock or destroy the turret

- **GIVEN** a represented vehicle is critically hit in the turret
- **WHEN** the vehicle critical roll total is 9 or 12
- **THEN** the applied critical effect SHALL be `turret_locked` for 9 and
  `turret_destroyed` for 12.

#### Scenario: VTOL rotor critical roll uses rotor-specific results

- **GIVEN** a represented VTOL is critically hit in the rotor
- **WHEN** the vehicle critical roll total is 6, 9, or 11
- **THEN** the applied critical effect SHALL be `rotor_damage`,
  `flight_stabilizer`, or `rotor_destroyed` respectively.
