# multiplayer-sync Specification

## Purpose

TBD - created by archiving change add-multiplayer-lobby-and-matchmaking-2-8. Update Purpose after archive.
## Requirements
### Requirement: Lobby Update Broadcast

The server SHALL broadcast lobby state to all connected clients in the
match whenever any seat or metadata changes during the lobby phase.

#### Scenario: Seat change broadcasts update

- **GIVEN** a match in `status: 'lobby'` with 4 connected clients
- **WHEN** one player occupies seat `alpha-1`
- **THEN** all 4 clients SHALL receive an `Event {type: 'lobby_
updated', payload: {seats, meta}}` within 200ms
- **AND** each client's local lobby view SHALL update to reflect the
  new seat occupant

#### Scenario: Occupant leaves broadcasts update

- **GIVEN** a seated player who sends `LeaveSeat`
- **WHEN** the server processes the intent
- **THEN** the seat's occupant SHALL be cleared
- **AND** a `lobby_updated` event SHALL be broadcast to the remaining
  clients

### Requirement: Room Code UI Contract

The system SHALL expose the 6-character room code prominently in the
lobby UI and support a one-click invite link that resolves to the
lobby page via the code.

#### Scenario: Lobby page shows code

- **GIVEN** a client lands on `/gameplay/mp-lobby/[matchId]`
- **WHEN** the page renders
- **THEN** the current `roomCode` SHALL be visible in the header
- **AND** a copy-to-clipboard button SHALL copy an absolute invite URL
  of the form `<origin>/gameplay/mp-invite/{roomCode}`

#### Scenario: Invite URL resolves and navigates

- **GIVEN** a user visits `/gameplay/mp-invite/{roomCode}`
- **WHEN** the page mounts
- **THEN** the page SHALL call `/api/multiplayer/invites/{roomCode}`
- **AND** on a valid response, SHALL navigate to
  `/gameplay/mp-lobby/{matchId}`

#### Scenario: Expired code renders error

- **GIVEN** a room code whose match is already active
- **WHEN** the user visits the invite URL
- **THEN** the page SHALL render an error message
  `"This match has already started"`
- **AND** offer a link back to the landing page

### Requirement: Redacted Event Shape

The system SHALL support a redacted variant of any event so that
partially-visible events can be transmitted without leaking hidden
fields to the recipient.

#### Scenario: Attack event redacts attacker

- **GIVEN** an `AttackResolved` event whose full payload includes
  `{attackerId, targetId, damage, hitLocation, rolls, weapon}`
- **WHEN** the event is redacted for a target who cannot see the
  attacker
- **THEN** the redacted form SHALL contain `{targetId, damage,
hitLocation, rolls}`
- **AND** the redacted form SHALL omit `attackerId` and `weapon`

#### Scenario: Destruction event redaction

- **GIVEN** a full `UnitDestroyed` event payload with cause, last
  damage event, crit history
- **WHEN** the event is redacted for an observer who cannot see the
  destroyed enemy
- **THEN** the redacted form SHALL contain only `{unitId}`

### Requirement: Client Gracefully Handles Missing Events

Clients SHALL gracefully handle the absence of events they would see
in an open-information match, without crashing or producing
inconsistent UI state.

#### Scenario: Enemy disappears from map

- **GIVEN** a fog-on match and an enemy unit that moves out of LOS
- **WHEN** the observing client stops receiving that enemy's events
- **THEN** the enemy token SHALL be displayed at its last-known
  position with a `"last seen"` indicator
- **AND** the client SHALL NOT crash attempting to animate an event
  it never received

#### Scenario: Enemy reappears with new known position

- **GIVEN** an enemy previously hidden that re-enters LOS
- **WHEN** the first visible event referencing that unit arrives
- **THEN** the enemy token SHALL jump to the newly revealed position
  without intermediate animation frames
- **AND** the UI MAY show a brief `"spotted!"` indicator

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

