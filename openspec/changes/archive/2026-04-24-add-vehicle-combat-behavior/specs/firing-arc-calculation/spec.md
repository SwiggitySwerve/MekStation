# firing-arc-calculation (delta)

## ADDED Requirements

### Requirement: Vehicle Firing Arcs

The firing-arc calculator SHALL compute vehicle arcs from facing and turret state.

#### Scenario: Ground vehicle Front arc

- **GIVEN** a tracked combat vehicle facing north
- **WHEN** firing arc is computed for the Front location
- **THEN** the arc SHALL be a 60° wedge centered on north

#### Scenario: Ground vehicle Side arcs

- **GIVEN** the same vehicle
- **WHEN** firing arcs are computed for Left Side and Right Side
- **THEN** each arc SHALL span 120°
- **AND** together with Front (60°) and Rear (60°) SHALL cover the full 360°

#### Scenario: Turret arc overrides chassis facing

- **GIVEN** a vehicle with an unlocked Single turret
- **WHEN** firing arc is computed for the Turret location
- **THEN** the arc SHALL be 360° and independent of chassis facing

#### Scenario: Locked turret reverts to Front arc

- **GIVEN** a vehicle whose turret has taken a Turret Locked critical
- **WHEN** firing arc is computed for turret weapons
- **THEN** the arc SHALL be the chassis Front arc only

#### Scenario: Sponson forward-side arc

- **GIVEN** a vehicle with a left sponson turret
- **WHEN** firing arc is computed for that sponson
- **THEN** the arc SHALL be the 180° left-front hemisphere only
