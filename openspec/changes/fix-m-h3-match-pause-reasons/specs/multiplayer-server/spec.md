## ADDED Requirements

### Requirement: Match Pause Reasons

The authoritative server SHALL tell every attached socket why a match is paused. `MatchPaused` SHALL carry a required `reason` of `peer-pending`, `gm-absent` or `opponent-fault`, chosen as the active cause with the highest precedence, from `opponent-fault` down to `peer-pending`. It SHALL list every pending seat in `pendingSlots` and SHALL carry the grace fields only while a seat is pending. The server SHALL broadcast a new `MatchPaused` snapshot whenever the set of active causes changes and SHALL broadcast `MatchResumed` only when no cause remains. The server SHALL send the current snapshot to each socket that joins a paused match. A refused engine intent SHALL name the active cause. Pause frames SHALL NOT be persisted or replayed.

#### Scenario: Opponent fault is announced

- **GIVEN** an active co-op mission whose server opponent command fails
- **WHEN** the server stops the opponent
- **THEN** every attached socket SHALL receive `MatchPaused` with `reason: 'opponent-fault'` and no pending seats

#### Scenario: GM absence is announced and cleared

- **GIVEN** an active co-op mission
- **WHEN** the campaign GM disconnects and later reconnects
- **THEN** players SHALL receive `MatchPaused` with `reason: 'gm-absent'` and then `MatchResumed`

#### Scenario: A rejoin does not resume a match still waiting for the GM

- **GIVEN** a match paused for a pending seat while the campaign GM is absent
- **WHEN** the pending player rejoins
- **THEN** the server SHALL broadcast a `gm-absent` snapshot
- **AND** the server SHALL NOT broadcast `MatchResumed`

#### Scenario: A late joiner learns of the pause

- **GIVEN** a paused match
- **WHEN** a player or spectator joins
- **THEN** that socket SHALL receive the current `MatchPaused` snapshot after its replay and lobby frames

### Requirement: Opponent Fault Exit

A faulted server opponent SHALL keep the match paused until an explicit exit. A `SessionJoin` from a seated participant SHALL clear the fault and retry the opponent once; success SHALL resume the match when no other cause remains, and a repeated failure SHALL pause it again with `opponent-fault`. A spectator join SHALL NOT retry. A successful `ForfeitMatch` SHALL end the pause and broadcast `MatchResumed`. A refused `ForfeitMatch` SHALL leave every pause cause in place. The server SHALL NOT end a faulted match through the legacy abort path.

#### Scenario: Seated rejoin retries the opponent

- **GIVEN** a match paused by an opponent fault whose cause has cleared
- **WHEN** a seated participant rejoins
- **THEN** the opponent turn SHALL commit exactly once
- **AND** the server SHALL broadcast `MatchResumed`

#### Scenario: Spectator join leaves the fault latched

- **GIVEN** a match paused by an opponent fault
- **WHEN** a spectator joins
- **THEN** the opponent SHALL NOT be retried
- **AND** the spectator SHALL receive the `opponent-fault` snapshot

#### Scenario: Refused forfeit keeps the pause

- **GIVEN** a match paused for a pending seat
- **WHEN** a non-host sends `ForfeitMatch`
- **THEN** the match SHALL remain paused and engine intents SHALL still be refused
