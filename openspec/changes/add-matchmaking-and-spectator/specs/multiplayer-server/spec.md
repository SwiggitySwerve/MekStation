## ADDED Requirements

### Requirement: Spectator Seat Kind

The system SHALL support a third seat `kind`, `'spectator'`, alongside `'human'` and `'ai'`. A spectator seat SHALL own no game units, SHALL be excluded from side assignment, SHALL be excluded from the readiness gate, and SHALL NOT count toward a layout's player-seat budget. A spectator seat SHALL be occupied by an authenticated player id bound at WebSocket-upgrade time.

#### Scenario: Spectator seat owns no units

- **GIVEN** a match with a `kind: 'spectator'` seat occupied by a player
- **WHEN** side assignment is computed at launch
- **THEN** the spectator seat SHALL receive no game units
- **AND** the spectator SHALL NOT be recorded as a match participant

#### Scenario: Spectator seat does not block launch

- **GIVEN** a match whose human seats are all occupied and ready and which also has a spectator seat
- **WHEN** the host sends `LaunchMatch`
- **THEN** the readiness gate SHALL ignore the spectator seat
- **AND** the match SHALL launch

#### Scenario: Spectator does not consume a player slot

- **GIVEN** a `1v1` match with two human seats and one spectator seat
- **WHEN** the seat roster is inspected
- **THEN** the layout SHALL still have exactly two human-playable seats

### Requirement: Spectator Connection

The system SHALL allow a `spectator`-kind seat to connect to an `active` match over the existing WebSocket. The spectator SHALL receive the replay history followed by live events exactly as a player does, and the server SHALL reject any `Intent` originating from a `spectator`-kind seat.

#### Scenario: Spectator joins and receives the stream

- **GIVEN** an active match and a spectator connecting with `SessionJoin`
- **WHEN** the server handles the join
- **THEN** the server SHALL stream the replay via `ReplayStart`, `ReplayChunk`, and `ReplayEnd`
- **AND** the spectator SHALL then receive live `Event` messages

#### Scenario: Spectator intent rejected

- **GIVEN** a connected spectator
- **WHEN** the spectator sends an `Intent` envelope
- **THEN** the server SHALL reply `Error {code: 'INVALID_INTENT', reason: 'spectator-cannot-act'}`
- **AND** no event SHALL be appended

### Requirement: Spectator Fog-of-War Scope

The server SHALL treat a spectator as a distinct fog audience. In a fog-on match a spectator SHALL receive only the most-redacted view — never more information than the least-informed participant — so spectating cannot reveal a unit hidden from a player. In a fog-off match a spectator SHALL receive the full unredacted event stream.

#### Scenario: Spectator of a fog-on match sees no hidden units

- **GIVEN** a fog-on match with a unit hidden from one participant
- **WHEN** the server broadcasts events to a connected spectator
- **THEN** the spectator SHALL NOT receive an event revealing a unit that is hidden from a participant

#### Scenario: Spectator of a fog-off match sees everything

- **GIVEN** a match with `config.fogOfWar: false` and a connected spectator
- **WHEN** the server broadcasts an event
- **THEN** the spectator SHALL receive the identical unredacted event
