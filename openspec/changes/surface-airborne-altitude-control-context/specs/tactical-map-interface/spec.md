# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Movement Preview And Commit Agreement

Blocked movement projections SHALL expose altitude-control context for
represented altitude-positive VTOL or WiGE vehicle combat state. That context
names the represented control mode and represented altitude responsible for the
block.
The altitude-control context SHALL be explanatory and SHALL NOT imply that full
airborne altitude pathing, hover, takeoff, landing, or altitude-change controls
are available from ordinary ground movement projection.

#### Scenario: Airborne WiGE blocked projection exposes altitude-control context

- **GIVEN** a vehicle unit has represented combat state with motion type `WiGE`
- **AND** the represented vehicle combat state has altitude 2
- **WHEN** the tactical map projects a blocked ordinary ground movement
  destination for that unit
- **THEN** the destination SHALL be unreachable
- **AND** the projection SHALL expose that altitude controls are required
- **AND** the projection SHALL expose altitude-control mode `wige`
- **AND** the projection SHALL expose represented altitude 2

#### Scenario: Airborne VTOL blocked projection exposes altitude-control context

- **GIVEN** a vehicle unit has represented combat state with motion type `VTOL`
- **AND** the represented vehicle combat state has altitude 2
- **WHEN** the tactical map projects a blocked ordinary ground movement
  destination for that unit
- **THEN** the destination SHALL be unreachable
- **AND** the projection SHALL expose that altitude controls are required
- **AND** the projection SHALL expose altitude-control mode `vtol`
- **AND** the projection SHALL expose represented altitude 2

### Requirement: Tactical Map Explanation Layer

Top-down movement hexes SHALL surface altitude-control context without relying
on color alone. Movement badges, invalid movement badges, accessible labels,
tooltip reason rows, and same-hex movement-option metadata SHALL expose the same
context when a blocked movement projection is owned by represented
altitude-positive VTOL/WiGE altitude controls.

#### Scenario: Blocked altitude-control hex is inspectable

- **GIVEN** a top-down tactical-map hex has a blocked movement projection with
  altitude-control mode `wige`
- **AND** the blocked movement projection has represented altitude 2
- **WHEN** the map renders the movement overlay
- **THEN** the hex metadata SHALL mark altitude-control required
- **AND** the hex metadata SHALL expose mode `wige` and altitude 2
- **AND** the accessible movement label SHALL include the altitude-control mode
  and altitude
- **AND** the invalid movement badge SHALL use a non-color altitude-control cue
- **AND** the tooltip reason row SHALL expose the same altitude-control context
