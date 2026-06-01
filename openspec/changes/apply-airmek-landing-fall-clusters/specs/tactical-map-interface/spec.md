# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Movement Projection Detail Surface

Failed represented LAM AirMek landing-control checks SHALL apply the resolved
fall clusters to the unit's armor/internal state in the same movement-command
event sequence that explains the failed landing.

#### Scenario: Failed AirMek landing-control descent applies fall clusters

- **GIVEN** a selected movement-phase Land-Air 'Mech fails a required
  AirMek landing-control roll
- **WHEN** the runtime movement-state command resolves the failed landing
- **THEN** the event stream SHALL append `UnitFell` followed by one or more
  `DamageApplied` fall-cluster events before the pilot-hit consequence
- **AND** replaying the event stream SHALL reduce the unit's armor/internal
  state by the fall-cluster damage.
