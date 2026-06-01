# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Movement Projection Detail Surface

Movement projection state controls SHALL include replayable altitude-control
actions for represented VTOL/WiGE vehicle combat state. Climb and Descend
commands SHALL dispatch runtime movement-state events, and replayed events
SHALL update the represented vehicle altitude consumed by map projection.

#### Scenario: VTOL altitude command updates represented altitude

- **GIVEN** a selected movement-phase vehicle has represented combat state with
  motion type `VTOL`
- **AND** the represented vehicle combat state has altitude 2
- **WHEN** the player chooses the Climb altitude-control command
- **THEN** the command SHALL dispatch a runtime movement-state event with
  `source: "altitude_control_action"`
- **AND** the event SHALL carry represented vehicle altitude 3
- **WHEN** the event is replayed
- **THEN** the vehicle combat state SHALL expose altitude 3 to map projection

#### Scenario: WiGE descent refreshes blocked ground projection

- **GIVEN** a selected movement-phase vehicle has represented combat state with
  motion type `WiGE`
- **AND** the represented vehicle combat state has altitude 1
- **AND** ordinary ground movement projection is blocked by altitude controls
- **WHEN** a Descend altitude-control event replays altitude 0
- **THEN** the vehicle combat state SHALL expose altitude 0
- **AND** the altitude-control ground-projection blocker SHALL no longer apply
