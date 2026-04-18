# multiplayer-server Specification Delta

## ADDED Requirements

### Requirement: Seat Connection Lifecycle

The system SHALL track connection lifecycle for each match seat with
the states `'connected'`, `'pending'`, `'timed-out'`, and
`'replaced-by-ai'`, and SHALL broadcast changes to all connected
clients.

#### Scenario: Connect transitions

- **GIVEN** a seat `alpha-1` in `'pending'` state
- **WHEN** the owning player's WebSocket re-attaches and
  authentication succeeds
- **THEN** the seat SHALL transition to `'connected'`
- **AND** all clients SHALL receive a `seat_status_changed` event

#### Scenario: Disconnect transitions

- **GIVEN** a seat `alpha-2` in `'connected'` state
- **WHEN** the owning player's WebSocket closes
- **THEN** the seat SHALL transition to `'pending'`
- **AND** a per-seat grace timer SHALL start

#### Scenario: Grace timeout

- **GIVEN** a seat in `'pending'` whose grace timer expires
- **WHEN** the timer fires
- **THEN** the seat SHALL transition to `'timed-out'`
- **AND** the host SHALL be prompted to choose a fallback action

### Requirement: Pause on Pending Human Seat

The system SHALL pause phase advancement and intent processing
whenever any human seat is in `'pending'` state, unless the host has
explicitly enabled `ProceedWithoutPending`.

#### Scenario: Pause broadcasts to all clients

- **GIVEN** a live match with 4 human seats
- **WHEN** one human disconnects
- **THEN** the server SHALL emit `Event {type: 'match_paused',
payload: {pendingSeats: [...], graceRemaining}}`
- **AND** no further phase transitions SHALL occur until either
  reconnection or timeout resolution

#### Scenario: Resume on reconnect

- **GIVEN** a paused match with exactly one seat `'pending'`
- **WHEN** that seat reconnects
- **THEN** the server SHALL emit `Event {type: 'match_resumed'}`
- **AND** intent processing SHALL resume

#### Scenario: Host can proceed without pending

- **GIVEN** a paused match
- **WHEN** the host sends `Intent {kind: 'ProceedWithoutPending'}`
- **THEN** the pause SHALL lift
- **AND** the pending seat(s) SHALL remain in `'pending'` but phase
  advancement SHALL continue (their owned units idle until reconnect)

### Requirement: Reconnect Handshake

The system SHALL define a reconnect handshake that authenticates the
returning player against the disconnected seat and streams the
missing events.

#### Scenario: Reconnect to own seat

- **GIVEN** seat `alpha-1` in `'pending'` whose prior occupant was
  `playerId: pid_abc`
- **WHEN** a WebSocket authenticates as `pid_abc` and sends
  `SessionJoin {matchId, playerId: 'pid_abc', lastSeq}`
- **THEN** the server SHALL bind the socket to seat `alpha-1`
- **AND** the server SHALL stream events from `lastSeq+1` via
  `ReplayStart` + chunks + `ReplayEnd`
- **AND** the seat SHALL transition to `'connected'`

#### Scenario: Rejoin with wrong identity rejected

- **GIVEN** seat `alpha-1` whose prior occupant was `pid_abc`
- **WHEN** a player with `playerId: pid_other` attempts to rejoin
  that seat
- **THEN** the server SHALL respond `Error {code: 'SEAT_OCCUPIED_BY_
OTHER_PLAYER'}`
- **AND** the seat binding SHALL remain unchanged

### Requirement: Grace Timeout Fallback

The system SHALL offer the host three fallback actions when a seat
times out: forfeit that side, replace with AI, or extend the grace
window.

#### Scenario: Forfeit side fallback

- **GIVEN** a timed-out seat
- **WHEN** the host chooses `'forfeit-side'`
- **THEN** the server SHALL append `GameEnded` with `winner = the
opposite side`, `reason = 'forfeit'`
- **AND** the match SHALL become `'completed'`

#### Scenario: Replace with AI fallback

- **GIVEN** a timed-out seat
- **WHEN** the host chooses `'replace-with-ai'`
- **THEN** the seat SHALL transition to `'replaced-by-ai'`
- **AND** a `BotPlayer` SHALL be spawned in-process to occupy the
  seat for the rest of the match

#### Scenario: Extend grace fallback

- **GIVEN** a timed-out seat
- **WHEN** the host chooses `'wait-longer'`
- **THEN** the grace timer SHALL restart at the current
  `reconnectGraceSeconds` value
- **AND** the seat SHALL return to `'pending'`

#### Scenario: Host non-response defaults to AI

- **GIVEN** a timed-out seat and no host response for 60 seconds
- **WHEN** the default timer fires
- **THEN** the server SHALL apply `'replace-with-ai'` automatically

### Requirement: Supersede Stale Socket

The server SHALL close an older open socket for a `playerId` whenever
that same `playerId` authenticates a new socket, so the newest
authenticated connection is always the active one.

#### Scenario: New socket supersedes old

- **GIVEN** a player with an open WebSocket connection
- **WHEN** the same player authenticates from a second device and
  sends `SessionJoin` for the same match
- **THEN** the server SHALL accept the new socket
- **AND** the server SHALL close the old socket with `Close {reason:
'SUPERSEDED_BY_NEW_SESSION'}`

### Requirement: Server Restart Survives Matches

The system SHALL ensure that a server restart does not end active
matches; the authoritative state SHALL be recoverable from the
`IMatchStore`.

#### Scenario: Server restart preserves match

- **GIVEN** an active match `sess_abc` with 30 persisted events
- **WHEN** the server process restarts
- **THEN** on startup the server SHALL enumerate matches with `status:
'active'` and re-instantiate `ServerMatchHost` for each
- **AND** clients reconnecting after restart SHALL receive the full
  replay starting from their `lastSeq`
