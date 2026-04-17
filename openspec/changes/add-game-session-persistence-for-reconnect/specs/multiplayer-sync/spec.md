# multiplayer-sync Specification Delta

## ADDED Requirements

### Requirement: Local Event Log Persistence

The system SHALL persist every appended game event to IndexedDB under
the active match id, on both the host and the guest peer, so a browser
refresh does not lose match state.

#### Scenario: Every append reaches disk

- **GIVEN** a live networked match
- **WHEN** the host appends a movement event
- **THEN** the event SHALL be written to IndexedDB under
  `matchEvents` with key `[matchId, sequence]`
- **AND** the guest's own IndexedDB SHALL also contain that event after
  it arrives via the peer channel

#### Scenario: Session rehydrates from log

- **GIVEN** a match log for `matchId='sess_abc'` is present in
  IndexedDB with 40 events
- **WHEN** `InteractiveSession.fromMatchLog('sess_abc')` is called
- **THEN** the returned session SHALL have 40 events
- **AND** `currentState` SHALL match the state produced by replaying
  those 40 events in order

### Requirement: Reconnect Protocol

The system SHALL define a peer-channel protocol that reconciles a
reconnecting guest's local event log with the host's authoritative log.

#### Scenario: Guest requests missing events

- **GIVEN** a guest reconnecting with `lastLocalSeq = 25`
- **WHEN** the guest's reconnect handler runs
- **THEN** it SHALL send `{kind: 'reconnect-request', matchId,
lastLocalSeq: 25}` over the peer channel
- **AND** the host SHALL respond with `{kind: 'replay-stream', events}`
  containing all events whose sequence > 25

#### Scenario: Replay chunked for large logs

- **GIVEN** the host has 200 events newer than the guest's `lastLocal
Seq`
- **WHEN** the replay stream is sent
- **THEN** it SHALL be split into chunks of at most 64 events per
  message
- **AND** the final chunk SHALL carry a flag `done: true`

#### Scenario: Matchid mismatch rejected

- **GIVEN** the host's current session is `sess_abc`
- **WHEN** a reconnect-request arrives with `matchId: 'sess_xyz'`
- **THEN** the host SHALL respond `{kind: 'peer-rejected', reason:
'wrong-match'}`

### Requirement: Peer Pending Grace Window

The system SHALL pause phase advancement and run a grace window before
ending a match when a peer becomes unreachable.

#### Scenario: Grace window starts on peer loss

- **GIVEN** a live networked match
- **WHEN** the guest's Yjs awareness is lost
- **THEN** the host SHALL enter `localMatchStatus: 'guestPending'`
- **AND** a 60-second grace timer SHALL start
- **AND** phase advancement SHALL be paused

#### Scenario: Peer returns within grace window

- **GIVEN** a host in `'guestPending'` at `T+30 seconds`
- **WHEN** the guest reconnects and completes the reconnect protocol
- **THEN** `localMatchStatus` SHALL return to `'live'`
- **AND** phase advancement SHALL resume

#### Scenario: Grace window expires

- **GIVEN** a host in `'guestPending'` at `T+60 seconds` with no
  reconnect
- **WHEN** the grace timer fires
- **THEN** the host SHALL append `GameEnded` with
  `{winner: 'draw', reason: 'aborted'}`
- **AND** the session SHALL become `Completed`

### Requirement: Match Log Retention

The system SHALL retain the event log for completed matches for 7 days,
enabling post-match inspection and re-replay.

#### Scenario: Completed match log kept

- **GIVEN** a match that ended normally 3 days ago
- **WHEN** the app starts up
- **THEN** the match log SHALL still be present in IndexedDB
- **AND** re-hydration via `fromMatchLog` SHALL still work

#### Scenario: Old match log purged

- **GIVEN** a completed match log that is 8 days old
- **WHEN** `purgeOldMatches()` runs at app startup
- **THEN** the log SHALL be deleted from IndexedDB
- **AND** `matches` metadata for that match SHALL also be deleted
