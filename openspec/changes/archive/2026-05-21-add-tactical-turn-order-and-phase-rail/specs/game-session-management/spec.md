## ADDED Requirements

### Requirement: Tactical Phase Queue Projection

The game session SHALL expose a UI-safe projection of phase, round, initiative order, active side, active unit, unresolved units, and blockers.

#### Scenario: Movement phase projection lists unresolved units
- **GIVEN** a tactical session is in the Movement phase
- **WHEN** the UI requests the phase queue projection
- **THEN** the projection SHALL include the current round, current phase, active side, active unit id when any, and all units that still require movement or legal skip resolution

#### Scenario: Phase blocker names unresolved work
- **GIVEN** a player attempts to advance the phase while required actions remain
- **WHEN** the phase queue projection is computed
- **THEN** it SHALL include blocker entries naming the unit id, side, phase, and missing action type

### Requirement: Activation Focus Requests

The game session SHALL provide focus requests for active-unit changes without coupling camera movement to engine logic.

#### Scenario: Active unit emits focus request
- **GIVEN** auto-center on activation is enabled in UI settings
- **WHEN** the active unit changes
- **THEN** the session/UI adapter SHALL expose a focus request containing the unit id and axial coordinate
- **AND** the map camera SHALL decide how to animate or ignore that request

#### Scenario: Replay focus follows cursor
- **GIVEN** the replay cursor enters an event that changes active unit or phase
- **WHEN** the replay UI computes phase projection
- **THEN** focus request state SHALL reflect the replay cursor
- **AND** no live session command SHALL be enabled because of the replay focus
