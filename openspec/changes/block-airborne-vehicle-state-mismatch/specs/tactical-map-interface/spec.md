# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Movement Preview And Commit Agreement

Represented altitude-positive VTOL or WiGE vehicle combat state SHALL block
ordinary ground movement projection even when the selected movement capability
has a stale, missing, or mismatched motive mode. The blocked projection and
commit validation SHALL expose the same altitude-control reason. Represented
VTOL/WiGE vehicles at altitude zero SHALL continue to use the ordinary movement
projection for their selected capability.

#### Scenario: Airborne WiGE state blocks stale ground capability

- **GIVEN** a vehicle unit has represented combat state with motion type `WiGE`
- **AND** the represented vehicle combat state has altitude 2
- **AND** the selected movement capability still reports ordinary walk movement
- **WHEN** the tactical map projects a walk destination for that unit
- **THEN** the destination SHALL be unreachable
- **AND** the blocked reason SHALL explain that airborne WiGE movement uses
  altitude controls
- **WHEN** the same destination is submitted to commit validation
- **THEN** commit validation SHALL reject the move with the same reason

#### Scenario: Airborne VTOL state blocks stale ground capability

- **GIVEN** a vehicle unit has represented combat state with motion type `VTOL`
- **AND** the represented vehicle combat state has altitude 2
- **AND** the selected movement capability still reports ordinary walk movement
- **WHEN** the tactical map projects a walk destination for that unit
- **THEN** the destination SHALL be unreachable
- **AND** the blocked reason SHALL explain that airborne VTOL movement uses
  altitude controls
- **WHEN** the same destination is submitted to commit validation
- **THEN** commit validation SHALL reject the move with the same reason

#### Scenario: Landed WiGE state preserves ordinary projection

- **GIVEN** a vehicle unit has represented combat state with motion type `WiGE`
- **AND** the represented vehicle combat state has altitude 0
- **WHEN** the tactical map projects a movement destination for that unit
- **THEN** the altitude-control blocker SHALL NOT be applied
