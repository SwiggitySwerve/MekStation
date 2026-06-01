# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Movement Projection Detail Surface

Movement projection state controls SHALL include represented LAM AirMek WiGE
elevation in the same rules-backed altitude-control path used for VTOL/WiGE
vehicle altitude and ProtoMek Glider altitude. When a selected LAM is in AirMek
mode with WiGE movement, Climb and Descend command availability SHALL reflect
the source-backed LandAirMek elevation envelope and SHALL dispatch replayable
runtime state consumed by later movement projection and commit validation.

#### Scenario: LAM AirMek altitude controls honor source ceiling

- **GIVEN** a selected movement-phase Land-Air 'Mech is in AirMek conversion
  mode with represented WiGE movement
- **WHEN** the player inspects Climb or Descend command availability
- **THEN** Climb SHALL be unavailable once represented AirMek WiGE elevation
  reaches 25
- **AND** legal Climb and Descend commands SHALL dispatch replayable
  `lamAirMekAltitude` state with represented altitude-control step count and MP
  cost
- **AND** later movement projection and commit validation SHALL reserve that
  altitude-control MP before ordinary path MP.

#### Scenario: Elevated AirMek ground projection explains altitude ownership

- **GIVEN** a represented Land-Air 'Mech is in AirMek mode with positive WiGE
  elevation
- **WHEN** movement reachability is projected for ordinary ground movement
- **THEN** the projection SHALL be blocked as AirMek altitude-control-owned
  instead of pretending the LAM can spend ordinary ground movement from that
  elevated state.
