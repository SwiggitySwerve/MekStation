# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Movement Projection Detail Surface

Required represented LAM AirMek landing-control checks SHALL resolve during the
runtime movement-state command that lands the unit. The event stream SHALL
explain the command in source order: landing state mutation, canonical
`PSRTriggered`, `PSRResolved`, and failed-landing fall consequences when the
roll fails.

#### Scenario: Passing AirMek landing-control descent resolves immediately

- **GIVEN** a selected movement-phase Land-Air 'Mech descends from represented
  AirMek WiGE altitude 1 to ground level
- **AND** the landing-control metadata marks the roll as required
- **WHEN** the landing-control roll passes
- **THEN** the event stream SHALL append `RuntimeMovementStateChanged`,
  `PSRTriggered`, and `PSRResolved` in that order
- **AND** the unit SHALL have no remaining pending AirMek landing PSR.

#### Scenario: Failed AirMek landing-control descent emits fall consequences

- **GIVEN** a selected movement-phase Land-Air 'Mech descends from represented
  AirMek WiGE altitude 1 to ground level
- **AND** the landing-control metadata marks the roll as required
- **WHEN** the landing-control roll fails
- **THEN** the event stream SHALL append `RuntimeMovementStateChanged`,
  `PSRTriggered`, `PSRResolved`, `UnitFell`, and `PilotHit` in that order
- **AND** `UnitFell` SHALL use `reasonCode: PSRTrigger.AirMekLanding`
- **AND** the unit SHALL be prone with the AirMek landing PSR cleared.
