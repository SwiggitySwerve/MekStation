# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Movement Projection Detail Surface

Failed represented LAM AirMek landing-control checks SHALL expose crash
critical-hit outcomes in the same event stream that explains the movement
consequence.

#### Scenario: Failed AirMek landing-control descent causes a critical hit

- **GIVEN** a selected movement-phase Land-Air 'Mech fails a required
  AirMek landing-control roll
- **AND** the represented fall cluster damage exposes internal structure and
  triggers a represented critical hit
- **WHEN** the runtime movement-state command resolves the failed landing
- **THEN** map/replay consumers SHALL receive movement-phase critical and
  component-destruction events without recomputing critical state from armor
  numbers.
