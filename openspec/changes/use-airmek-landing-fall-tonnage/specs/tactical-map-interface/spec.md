# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Movement Projection Detail Surface

Required represented LAM AirMek landing-control checks SHALL resolve using the
selected unit's represented tonnage for failed landing fall consequences when
that tonnage is available to the interactive session.

#### Scenario: Failed AirMek landing-control descent reports tonnage-scaled fall damage

- **GIVEN** a selected movement-phase Land-Air 'Mech descends from represented
  AirMek WiGE altitude to ground level
- **AND** the landing-control roll fails
- **AND** represented catalog tonnage exists for that unit
- **WHEN** the runtime movement-state command emits the failed landing events
- **THEN** the `UnitFell` event SHALL report fall damage scaled by that unit
  tonnage and the represented landing fall height.
