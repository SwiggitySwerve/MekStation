## ADDED Requirements

### Requirement: Tactical Replay Timeline Controls

The replay system SHALL provide tactical timeline controls that synchronize map state, combat feed, turn rail, and unit inspectors.

#### Scenario: Replay cursor updates tactical shell
- **GIVEN** a tactical replay is loaded
- **WHEN** the user moves the replay cursor to a specific event
- **THEN** the map SHALL show unit positions and overlays for that event time
- **AND** the combat feed SHALL highlight the event
- **AND** the turn rail and inspectors SHALL reflect replay cursor state rather than live session state

#### Scenario: Playback controls are deterministic
- **GIVEN** the same replay event log and terrain source
- **WHEN** playback advances from start to end twice
- **THEN** unit positions, destroyed/withdrawn states, heat, visible pins, and feed highlights SHALL match between runs

### Requirement: Tactical Replay Map Fidelity

Replay data SHALL carry or deterministically derive the map radius, terrain/elevation grid, objective locations, pins with replay scope, and projection-relevant settings.

#### Scenario: Encounter replay restores battlefield
- **GIVEN** an encounter replay was captured from a non-clear terrain map
- **WHEN** the replay is loaded
- **THEN** the tactical map SHALL restore the same map radius, terrain/elevation visuals, objective locations, and initial unit deployments
- **AND** replay rendering SHALL not fall back to a clear placeholder grid unless the original match did

#### Scenario: Missing terrain source is explicit
- **GIVEN** a legacy replay lacks terrain source data
- **WHEN** the replay viewer loads it
- **THEN** the viewer SHALL label terrain as reconstructed or unavailable
- **AND** it SHALL not imply terrain fidelity that cannot be proven from the replay payload
