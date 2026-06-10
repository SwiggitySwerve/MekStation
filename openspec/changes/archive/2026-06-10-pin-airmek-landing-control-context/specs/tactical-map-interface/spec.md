# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Movement Projection Detail Surface

Movement projection state controls SHALL include source-backed landing-control
context when a represented LAM AirMek uses altitude controls to descend to
ground level. The runtime event emitted by the map command SHALL distinguish a
clean landing from a damage-sensitive landing-control check, and the
player-facing tactical feed SHALL explain the result without requiring the
player to infer it from hidden unit damage.

#### Scenario: Clean AirMek descent explains no landing check

- **GIVEN** a selected movement-phase Land-Air 'Mech is in AirMek conversion
  mode with represented WiGE movement at altitude 1
- **AND** the AirMek has no effective gyro damage, destroyed leg, or qualifying
  leg-actuator damage
- **WHEN** the player commits Descend to altitude 0
- **THEN** the emitted runtime movement-state event SHALL set
  `lamAirMekAltitude` to 0
- **AND** it SHALL include AirMek landing-control metadata stating that the
  landing check is not required.

#### Scenario: Damaged AirMek descent exposes landing-control roll context

- **GIVEN** a selected movement-phase Land-Air 'Mech is in AirMek conversion
  mode with represented WiGE movement at altitude 1
- **AND** the AirMek has effective gyro damage, a destroyed leg, upper leg,
  lower leg, foot actuator damage, or TacOps-enabled hip actuator damage
- **WHEN** the player commits Descend to altitude 0
- **THEN** the emitted runtime movement-state event SHALL set
  `lamAirMekAltitude` to 0
- **AND** it SHALL mark the AirMek landing-control check as required
- **AND** it SHALL carry the source-backed modifier total and readable modifier
  details for the damaged leg state
- **AND** the event log SHALL show the landing-control result to the player.
