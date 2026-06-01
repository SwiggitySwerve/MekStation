# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Movement Projection Detail Surface

Movement projection state controls SHALL include represented ProtoMek Glider
altitude in the same rules-backed altitude-control path used for VTOL/WiGE
vehicle altitude. When a selected Glider has WiGE movement and represented
altitude, Climb and Descend command availability SHALL reflect the source-backed
ProtoMek altitude envelope and SHALL dispatch replayable runtime state consumed
by later movement projection and commit validation.

#### Scenario: ProtoMek Glider altitude controls honor source ceiling

- **GIVEN** a selected movement-phase ProtoMek Glider has represented WiGE
  movement and current altitude
- **WHEN** the player inspects Climb or Descend command availability
- **THEN** Climb SHALL be unavailable once represented altitude reaches 12
- **AND** legal Climb and Descend commands SHALL dispatch replayable
  `protoAltitude` state with represented altitude-control step count and MP cost
- **AND** later movement projection and commit validation SHALL reserve that
  altitude-control MP before ordinary path MP.

#### Scenario: Airborne Glider ground projection explains altitude ownership

- **GIVEN** a represented ProtoMek Glider has positive altitude
- **WHEN** movement reachability is projected for ordinary ground movement
- **THEN** the projection SHALL be blocked as WiGE altitude-control-owned instead
  of pretending the Glider can spend ordinary ground movement from that airborne
  state.
