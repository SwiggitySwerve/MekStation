# multiplayer-sync Specification

## Purpose

Defines Multiplayer Sync requirements for Lobby Update Broadcast, Room Code UI Contract, Redacted Event Shape, and Client Gracefully Handles Missing Events, preserving the source-of-truth scope introduced by archived change add-multiplayer-lobby-and-matchmaking-2-8.

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

### Requirement: Peer Event Channel

The system SHALL provide a peer-to-peer channel that transmits
`IGameEvent` records between two peers in a shared sync room, in the
order they are appended on the authoring peer.

#### Scenario: Host-appended event reaches guest

- **GIVEN** a host peer and a guest peer in the same sync room with an
  active networked match
- **WHEN** the host engine appends an event via `appendEvent`
- **THEN** the event SHALL be broadcast on the peer channel
- **AND** the guest SHALL receive the event within the next animation
  frame
- **AND** the guest's mirror session SHALL apply the event via its own
  `appendEvent` reducer

#### Scenario: Event ordering preserved

- **GIVEN** the host appends events `E1`, `E2`, `E3` in that order
- **WHEN** the events arrive on the guest
- **THEN** they SHALL be applied to the guest's session in the same
  order
- **AND** the guest's `currentState` after `E3` SHALL match the host's
  `currentState` after `E3`

#### Scenario: Own events are not re-applied

- **GIVEN** the host broadcasts an event `E1`
- **WHEN** the host's own channel subscription receives `E1`
- **THEN** the host SHALL detect that `E1.authorPeerId === localPeerId`
- **AND** the host SHALL NOT append `E1` a second time

### Requirement: Host-Authoritative RNG

The system SHALL designate exactly one peer as the host in any networked
match, and all random rolls SHALL originate on the host and be embedded
in the event payload so the guest can replay them deterministically.

#### Scenario: Host generates rolls via default DiceRoller

- **GIVEN** a host engine resolving an initiative event
- **WHEN** the host's `rollInitiative()` is called
- **THEN** the default `DiceRoller` SHALL be used
- **AND** the resulting dice values SHALL be stored on the emitted event
  under `payload.rolls`

#### Scenario: Guest replays rolls from event payload

- **GIVEN** a guest receiving a peer event with `payload.rolls = [3, 5]`
- **WHEN** the guest's mirror engine needs a dice result for the
  corresponding action
- **THEN** the guest's `replayDiceRoller` SHALL return those exact values
- **AND** the guest SHALL NOT invoke any non-deterministic randomness

#### Scenario: Two sessions converge under identical events

- **GIVEN** a seeded host session and a guest mirror session, both
  created from the same config
- **WHEN** the host plays out 5 full turns and every emitted event is
  replicated to the guest in order
- **THEN** at every event boundary the host and guest `currentState`
  SHALL be deep-equal

### Requirement: Host Election and Role Assignment

The system SHALL elect exactly one host per networked match and assign
the other participant the role `guest`.

#### Scenario: Room creator becomes host

- **GIVEN** a peer creates a sync room and launches a networked match
- **WHEN** the match session is created
- **THEN** that peer's role SHALL be `host`
- **AND** the peer id SHALL be recorded on the session under
  `hostPeerId`

#### Scenario: Second joiner becomes guest

- **GIVEN** a host has created a networked match in a sync room
- **WHEN** another peer joins the room and accepts the match
- **THEN** that peer's role SHALL be `guest`
- **AND** the peer id SHALL be recorded on the session under
  `guestPeerId`

#### Scenario: Third joiner is rejected

- **GIVEN** a networked 1v1 match already has a host and a guest
- **WHEN** a third peer joins the room and attempts to join the match
- **THEN** the match SHALL refuse the join
- **AND** the third peer's UI SHALL surface `"Match is full"`

### Requirement: Side Ownership

The system SHALL record which peer controls which game side, and SHALL
forbid local event production for sides not owned by the local peer.

#### Scenario: Peer cannot append for foreign side

- **GIVEN** a guest peer whose side is `GameSide.Opponent`
- **WHEN** the guest tries to append a MovementDeclared event for a unit
  whose `side` is `GameSide.Player`
- **THEN** the append SHALL be rejected
- **AND** the UI SHALL surface a `peer-rejected` toast

#### Scenario: Intent round-trip for owned side

- **GIVEN** a guest peer whose side is `GameSide.Opponent`
- **WHEN** the guest commits a movement for a unit they control
- **THEN** the guest SHALL broadcast an `IGameIntent` with type
  `declareMovement` to the host
- **AND** the host SHALL validate the intent and append a corresponding
  `MovementLocked` event
- **AND** the resulting event SHALL replicate back to the guest

### Requirement: Abort on Host Disconnect

The system SHALL end a networked match with `reason: 'aborted'` if the
host peer disconnects during an active session.

#### Scenario: Host disconnect aborts the guest's session

- **GIVEN** an active networked match
- **WHEN** the host peer's Yjs awareness is lost for more than
  5 seconds
- **THEN** the guest's session SHALL append a local `GameEnded` event
  with `reason: 'aborted'` and `winner: 'draw'`
- **AND** the guest's UI SHALL route to the victory screen with
  `"Match aborted — host disconnected"`

### Requirement: Intent Protocol for Guest Actions

The system SHALL define an `IGameIntent` contract that the guest uses to
request actions the host must validate and execute.

#### Scenario: Intent shape

- **GIVEN** a guest wants to commit an action
- **WHEN** the intent is constructed
- **THEN** it SHALL include `type`, `payload`, and `authorPeerId`
- **AND** `type` SHALL be one of `declareMovement`, `declareAttack`,
  `declarePhysical`, `confirmHeat`, `endPhase`, `concede`

#### Scenario: Host rejects intent for out-of-phase action

- **GIVEN** the session is in the Movement phase
- **WHEN** the host receives a `declareAttack` intent from the guest
- **THEN** the host SHALL NOT append an event
- **AND** the host SHALL broadcast a `peer-rejected` notification to the
  guest indicating `reason: 'wrong-phase'`

### Requirement: Lobby State Shared Over Yjs

The system SHALL store pre-match lobby state in a shared Y.Map on the
existing sync room, so both peers see the same loadouts and map config
as they assemble a match.

#### Scenario: Lobby state shape

- **GIVEN** a host has created a networked 1v1 lobby
- **WHEN** the lobby is inspected
- **THEN** the shared state SHALL include `mode: '1v1'`, `hostPeerId`,
  `guestPeerId`, `hostLoadout`, `guestLoadout`, `mapConfig`,
  `hostReady`, `guestReady`, and optional `matchId`

#### Scenario: Peer update visible on other peer

- **GIVEN** both peers are on the lobby page
- **WHEN** the host edits `mapConfig.radius` from 10 to 14
- **THEN** the guest's page SHALL display `radius: 14` without reload

#### Scenario: Peer cannot modify foreign loadout slot

- **GIVEN** the host tries to update `guestLoadout`
- **WHEN** the lobby channel receives that update
- **THEN** the update SHALL be rejected
- **AND** a `peer-rejected` notification SHALL be surfaced locally with
  `reason: 'unauthorized-slot'`

### Requirement: Loadout Picking

The system SHALL let each peer pick their side's mechs and pilots from
their own local vault before the match launches.

#### Scenario: Host picks 2 mechs and 2 pilots

- **GIVEN** the host is on the lobby page
- **WHEN** the host selects 2 mechs and assigns 1 pilot each
- **THEN** `hostLoadout.units` SHALL contain 2 entries
- **AND** `hostLoadout.pilots` SHALL contain 2 entries
- **AND** the guest's view SHALL display the same 2 entries (read-only)

#### Scenario: Mismatched side counts blocks readiness

- **GIVEN** the host has picked 3 mechs and the guest has picked 2 mechs
- **WHEN** either peer attempts to toggle ready
- **THEN** the ready toggle SHALL be disabled
- **AND** a hint SHALL display `"Both sides must pick the same number
of mechs"`

### Requirement: Readiness and Launch

The system SHALL require both peers to mark themselves ready before the
host may launch the match, and SHALL lock the loadouts at launch.

#### Scenario: Both peers ready enables launch button

- **GIVEN** `hostReady = true` and `guestReady = true` and loadouts are
  valid
- **WHEN** the host's UI renders
- **THEN** the "Launch Match" button SHALL be enabled
- **AND** the guest's UI SHALL show `"Waiting for host to launch..."`

#### Scenario: Host launches match

- **GIVEN** both peers are ready
- **WHEN** the host clicks "Launch Match"
- **THEN** a new game session SHALL be created with both loadouts
  deployed per side
- **AND** `matchId` SHALL be written into the lobby state
- **AND** both peers SHALL navigate to `/gameplay/games/[matchId]`

#### Scenario: Guest cannot launch

- **GIVEN** both peers are ready
- **WHEN** the guest's UI renders
- **THEN** no launch button SHALL be visible to the guest

### Requirement: Lobby Survives Peer Reconnect (Pre-Launch)

The system SHALL keep the lobby Y.Map alive across transient peer
disconnects before a match has launched.

#### Scenario: Guest reconnect restores lobby view

- **GIVEN** a guest on the lobby with `guestLoadout` populated
- **WHEN** the guest disconnects and reconnects within 60 seconds
- **THEN** the guest SHALL land back on the lobby page
- **AND** the guest's previously-picked loadout SHALL still be present
- **AND** the guest's `guestReady` flag SHALL be `false` (auto-reset)

#### Scenario: Host disconnect closes lobby

- **GIVEN** an active lobby with a host and a guest
- **WHEN** the host disconnects for more than 60 seconds
- **THEN** the lobby SHALL be marked `closed`
- **AND** the guest SHALL be navigated to the landing page with a toast
  `"Host left the lobby"`

### Requirement: Authoritative Server Is the Supported Transport

The system SHALL treat the authoritative server WebSocket as the supported transport for networked matches. The y-webrtc / peer-to-peer path SHALL be a non-authoritative fallback that receives no further hardening. The `mirrorSession` / `gameSessionChannel` event-application pattern SHALL be retained only as the client-side event-application layer, pointed at the server WebSocket rather than at y-webrtc.

#### Scenario: Networked match runs over the server transport

- **GIVEN** two players in a networked match
- **WHEN** the match is played
- **THEN** intents and events SHALL flow over the authoritative server WebSocket
- **AND** the match SHALL NOT depend on a y-webrtc peer connection for correctness

#### Scenario: Mirror pattern points at the server

- **GIVEN** a client participating in a networked match
- **WHEN** the client builds its mirror session
- **THEN** the mirror SHALL be fed by the server `Event` stream
- **AND** the `mirrorSession` / `gameSessionChannel` reducer SHALL be the client-side event-application layer for that stream

#### Scenario: P2P is a non-authoritative fallback

- **GIVEN** the y-webrtc peer-to-peer path
- **WHEN** the transport contract is inspected
- **THEN** the y-webrtc path SHALL be documented as a non-authoritative fallback
- **AND** authoritative roll capture, fog redaction, and intent integrity SHALL be provided only by the server path

