# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Movement Projection Detail Surface

Failed represented LAM AirMek landing-control checks SHALL expose crash
destruction outcomes in the movement-command event stream, not only as changed
armor/internal numbers.

#### Scenario: Failed AirMek landing-control descent destroys the unit

- **GIVEN** a selected movement-phase Land-Air 'Mech fails a required
  AirMek landing-control roll
- **AND** the represented fall cluster damage destroys a location or the unit
- **WHEN** the runtime movement-state command resolves the failed landing
- **THEN** the event stream SHALL include the matching `LocationDestroyed` and
  `UnitDestroyed` lifecycle events with movement phase
- **AND** the lifecycle events SHALL appear before the pilot-hit consequence.
