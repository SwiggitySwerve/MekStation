# multiplayer-server Specification

## Purpose
TBD - created by archiving change add-multiplayer-server-infrastructure. Update Purpose after archive.
## Requirements
### Requirement: WebSocket Transport

The system SHALL provide a bidirectional WebSocket channel for clients
to exchange messages with the authoritative server during a networked
match.

#### Scenario: Client connects and joins

- **GIVEN** a client wants to join match `sess_abc`
- **WHEN** the client opens a WebSocket to the multiplayer endpoint and
  sends `{kind: 'SessionJoin', matchId: 'sess_abc', playerId,
lastSeq: 0}`
- **THEN** the server SHALL validate the player's membership in the
  match
- **AND** the server SHALL stream the event log from `lastSeq+1` via
  `ReplayStart`, one or more `ReplayChunk`, and `ReplayEnd`
- **AND** after `ReplayEnd` the client SHALL receive live `Event`
  messages as they are appended

#### Scenario: Server rejects unknown match

- **GIVEN** a client sends `SessionJoin` with an unknown `matchId`
- **WHEN** the server handles the message
- **THEN** the server SHALL reply `Error {code: 'UNKNOWN_MATCH'}`
- **AND** the server SHALL close the socket

#### Scenario: Heartbeat keeps connection alive

- **GIVEN** a connected client
- **WHEN** 20 seconds pass with no other traffic
- **THEN** the server SHALL send a `Heartbeat`
- **AND** the client SHALL reply with a `Heartbeat`
- **AND** if either side misses three heartbeats in a row, the
  connection SHALL be torn down

### Requirement: Message Envelopes

The system SHALL define a typed, validated set of message envelopes for
all client-server communication.

#### Scenario: Envelope kinds

- **GIVEN** the protocol is inspected
- **WHEN** listing envelope kinds
- **THEN** the enumeration SHALL include `SessionJoin`, `Intent`,
  `Event`, `ReplayStart`, `ReplayChunk`, `ReplayEnd`, `Heartbeat`,
  `Error`, `Close`

#### Scenario: Malformed envelope rejected

- **GIVEN** a client sends a message missing required fields
- **WHEN** the server validates the envelope
- **THEN** the server SHALL respond `Error {code: 'BAD_ENVELOPE'}`
- **AND** the connection SHALL remain open

### Requirement: Match Store Contract

The system SHALL define an `IMatchStore` interface that decouples
session persistence from the in-memory server, allowing plug-in storage
backends (SQLite, Postgres, Redis, cloud stores) without touching the
server core.

#### Scenario: Store interface methods

- **GIVEN** an `IMatchStore` implementation
- **WHEN** the type is inspected
- **THEN** it SHALL expose `createMatch`, `appendEvent`, `getEvents`,
  `getMatchMeta`, `updateMatchMeta`, `closeMatch`
- **AND** every method SHALL return a `Promise`

#### Scenario: Store append is transactional

- **GIVEN** two concurrent `appendEvent` calls for the same match with
  the same `sequence`
- **WHEN** the store handles both
- **THEN** exactly one SHALL succeed
- **AND** the other SHALL reject with a `sequence-collision` error
- **AND** the succeeding event SHALL be durably stored before the
  promise resolves

#### Scenario: Store preserves order on read

- **GIVEN** a match with 50 events stored
- **WHEN** `getEvents(matchId)` is called
- **THEN** the returned array SHALL be ordered by ascending `sequence`
- **AND** there SHALL be no gaps in sequence numbers

### Requirement: Server-Authoritative Session Host

The system SHALL run the canonical `GameSession` on the server for any
networked match; clients send intents, receive events, and never mutate
session state directly.

#### Scenario: Intent translates to event

- **GIVEN** a client sends `Intent {type: 'declareMovement', payload}`
- **WHEN** the server's `ServerMatchHost` processes it
- **THEN** the host SHALL run validation + engine resolution
- **AND** on success, the host SHALL append the resulting event(s) to
  the match store
- **AND** the host SHALL broadcast `Event` messages to all connected
  clients for that match

#### Scenario: Invalid intent does not mutate state

- **GIVEN** a client sends an intent for a unit not owned by their
  player
- **WHEN** the server processes it
- **THEN** the server SHALL respond `Error {code: 'INVALID_INTENT',
reason: 'unauthorized-unit'}`
- **AND** no events SHALL be appended

#### Scenario: Server restart resumes match

- **GIVEN** a match `sess_abc` with 30 events persisted in the store
- **WHEN** the server restarts and a client reconnects with `lastSeq:
0`
- **THEN** the server SHALL instantiate a fresh `ServerMatchHost` for
  `sess_abc`, load the 30 events from the store, and replay them into
  the client

### Requirement: Dev-Mode In-Memory Store

The system SHALL ship an in-memory `IMatchStore` implementation for
development and testing, clearly labeled as non-production.

#### Scenario: Dev store works for session

- **GIVEN** the server is configured with `InMemoryMatchStore`
- **WHEN** a client creates a match and appends events
- **THEN** the events SHALL be retrievable via `getEvents`
- **AND** the match SHALL behave identically to a persistent store for
  the duration of the process

#### Scenario: Dev store warns loudly

- **GIVEN** the server starts with `InMemoryMatchStore`
- **WHEN** the startup log is inspected
- **THEN** a warning SHALL be present stating the store is dev-only
- **AND** the warning SHALL include `"configure a persistent store for
production"`

### Requirement: Error Surface

The system SHALL surface server-side errors to clients in a structured,
typed shape so clients can react appropriately without string parsing.

#### Scenario: Error envelope shape

- **GIVEN** the server encounters an error condition
- **WHEN** it emits an `Error` envelope
- **THEN** the envelope SHALL contain `kind: 'Error'`, `code: string`,
  `reason: string`, optional `intentId` for correlation

#### Scenario: Intent-level errors keep connection open

- **GIVEN** a client submits an invalid intent
- **WHEN** the server replies with an `Error` envelope
- **THEN** the WebSocket connection SHALL remain open
- **AND** the client SHALL be able to send a corrected intent

#### Scenario: Fatal errors close connection

- **GIVEN** the match store fails during an append
- **WHEN** the server emits `Error {code: 'STORE_FAILURE'}`
- **THEN** the server SHALL subsequently send `Close` and disconnect
  all clients on that match
- **AND** the match SHALL be marked `'completed'` with cause
  `'server-error'`

### Requirement: Authenticated Multiplayer Endpoints

The multiplayer server SHALL require a valid player token on every REST
and WebSocket endpoint except the health check.

#### Scenario: REST without token

- **GIVEN** a client POSTs `/api/multiplayer/matches` without an
  `Authorization` header
- **WHEN** the server handles the request
- **THEN** the response SHALL be `401 Unauthorized`

#### Scenario: REST with invalid token

- **GIVEN** a client POSTs with `Authorization: Bearer invalid`
- **WHEN** the server verifies the token
- **THEN** verification SHALL fail
- **AND** the response SHALL be `401 Unauthorized`

#### Scenario: WebSocket without token

- **GIVEN** a WebSocket upgrade request missing a token in both
  header and query string
- **WHEN** the server handles the upgrade
- **THEN** the server SHALL respond `401 Unauthorized`
- **AND** SHALL NOT upgrade the connection

### Requirement: Host Authority Gated by Identity

Only the match's `hostPlayerId` SHALL be able to close or modify match
configuration via privileged operations.

#### Scenario: Non-host close rejected

- **GIVEN** a player whose `playerId != hostPlayerId`
- **WHEN** they DELETE `/api/multiplayer/matches/:id`
- **THEN** the server SHALL respond `403 Forbidden`
- **AND** the match SHALL remain active

#### Scenario: Host close succeeds

- **GIVEN** a player whose `playerId == hostPlayerId`
- **WHEN** they DELETE `/api/multiplayer/matches/:id`
- **THEN** the server SHALL mark the match completed
- **AND** all connected clients SHALL receive a `Close` envelope

### Requirement: Seat Binding Uses Authenticated Player

The server SHALL bind seat occupancy to the `playerId` verified at
WebSocket upgrade time and SHALL reject any `OccupySeat` intent that
references a different `playerId`.

#### Scenario: Seat binds to socket identity

- **GIVEN** an authenticated WebSocket for `pid_abc`
- **WHEN** the client sends `OccupySeat {slotId: 'alpha-1'}`
- **THEN** the server SHALL assign `occupant = {playerId: 'pid_abc'}`
- **AND** SHALL NOT let the client claim a different player id

#### Scenario: Attempting to occupy on behalf of another player

- **GIVEN** an authenticated WebSocket for `pid_abc`
- **WHEN** the client sends `OccupySeat {slotId: 'alpha-1', claimed
Player: 'pid_xyz'}`
- **THEN** the server SHALL ignore `claimedPlayer` and bind the seat
  to `pid_abc`
- **AND** the server MAY respond with a warning envelope

### Requirement: Match Participation Recorded Server-Side

The server SHALL record each participant's match participation in the
`IPlayerStore` when a match transitions from `'lobby'` to `'active'`.

#### Scenario: Each human participant gets recorded

- **GIVEN** a match launching with 4 human players
- **WHEN** the server processes `LaunchMatch`
- **THEN** `recordMatchParticipation(playerId, matchId)` SHALL be
  called exactly once for each human participant
- **AND** AI-occupied seats SHALL NOT produce participation records

### Requirement: Authoritative Randomness

The server SHALL be the sole source of randomness in networked matches.
Client intents SHALL NOT carry dice values, and the server SHALL never
trust a value claimed by a client.

#### Scenario: Server generates initiative roll

- **GIVEN** a networked match in the Initiative phase
- **WHEN** the server resolves initiative
- **THEN** the server SHALL use its own `DiceRoller`
- **AND** the resulting dice values SHALL be embedded in the emitted
  `InitiativeRolled` event's `payload.rolls`

#### Scenario: Intent with rolls rejected

- **GIVEN** a client sends an intent whose payload includes `rolls`
- **WHEN** the server validates the intent
- **THEN** the server SHALL respond `Error {code: 'INVALID_INTENT',
reason: 'client-rolls-forbidden'}`
- **AND** no events SHALL be appended

#### Scenario: Crypto-backed roller

- **GIVEN** the server's default `DiceRoller`
- **WHEN** the source is inspected
- **THEN** it SHALL use `crypto.randomBytes` (or an equivalent
  cryptographically strong RNG)
- **AND** it SHALL NOT use `Math.random`

### Requirement: Seeded Debug Mode

The system SHALL allow deterministic play for bug reproduction via an
explicit seed flag, off by default, never permitted in production.

#### Scenario: Seeded mode activates roller

- **GIVEN** the server starts with `MP_DEV_SEED=12345`
- **WHEN** a match is created
- **THEN** the match's `config.seed` SHALL equal `12345`
- **AND** a deterministic roller SHALL be used in place of the crypto
  roller
- **AND** two matches created with the same seed and the same intent
  sequence SHALL produce identical event streams

#### Scenario: Production rejects seed

- **GIVEN** `NODE_ENV=production` and `MP_DEV_SEED` is set
- **WHEN** the server starts
- **THEN** startup SHALL fail with a clear error
- **AND** the process SHALL exit with a non-zero code

### Requirement: Client Cannot Override Rolls

The system SHALL reject any client attempt to submit a `DiceRoller`
override via configuration, intent, or websocket message.

#### Scenario: DiceRoller in config rejected

- **GIVEN** a client creates a match via REST with a body containing
  `config.diceRoller`
- **WHEN** the server validates the request
- **THEN** the field SHALL be stripped or rejected
- **AND** the server's own roller SHALL be used

### Requirement: Team Layouts

The multiplayer server SHALL support configurable match team layouts
for 2–8 players, covering symmetric team play (`1v1`, `2v2`, `3v3`,
`4v4`) and free-for-all (`ffa-2` through `ffa-8`).

#### Scenario: 2v2 produces two sides of two seats

- **GIVEN** a host creates a match with `layout: '2v2'`
- **WHEN** the server initializes the match
- **THEN** the seat roster SHALL contain 4 seats
- **AND** 2 seats SHALL be on side `'Alpha'`, 2 on side `'Bravo'`

#### Scenario: ffa-5 produces five solo sides

- **GIVEN** a host creates a match with `layout: 'ffa-5'`
- **WHEN** the server initializes the match
- **THEN** the seat roster SHALL contain 5 seats
- **AND** each seat SHALL be on its own side (`'Alpha'` through
  `'Echo'`)

#### Scenario: 4v4 supports 8 total seats

- **GIVEN** a host creates a match with `layout: '4v4'`
- **WHEN** the server initializes the match
- **THEN** the seat roster SHALL contain 8 seats
- **AND** seats SHALL be evenly split between two sides

### Requirement: Seat Slot Model

The multiplayer server SHALL model each player slot as an explicit seat
with a stable id, side assignment, occupant, kind (human or AI), and
readiness flag.

#### Scenario: Seat record shape

- **GIVEN** a match with seats
- **WHEN** the seat roster is inspected
- **THEN** each seat SHALL have `slotId, side, seatNumber, occupant,
kind, ready, aiProfile?`
- **AND** `slotId` SHALL be of the form `{side-lowercase}-{seatNumber}`
  (e.g. `alpha-1`, `bravo-2`)

#### Scenario: Seat occupancy binding

- **GIVEN** an unoccupied human seat `alpha-1`
- **WHEN** player `pid_abc` sends `Intent {kind: 'OccupySeat',
slotId: 'alpha-1'}`
- **THEN** the server SHALL assign `occupant = {playerId: 'pid_abc'}`
- **AND** other clients SHALL receive a lobby update reflecting the
  new occupant

#### Scenario: Cannot occupy AI seat

- **GIVEN** a seat with `kind: 'ai'`
- **WHEN** a player sends `OccupySeat` for that slot
- **THEN** the server SHALL respond `Error {code: 'SEAT_IS_AI'}`
- **AND** occupancy SHALL NOT change

### Requirement: Room Code Invites for 2-8 Matches

The multiplayer server SHALL issue a 6-character alphanumeric room code
on match creation, usable as a shareable invite token that resolves to
the internal match id.

#### Scenario: Room code issued on create

- **GIVEN** a host POSTs `/api/multiplayer/matches` with a valid body
- **WHEN** the server creates the match
- **THEN** the response SHALL include `roomCode: string` of 6 chars
- **AND** the code SHALL use the same alphabet as the
  `p2p-sync-system` (excluding I/O/0/1)

#### Scenario: Resolve room code to match id

- **GIVEN** a match with `roomCode: 'RX7KLM'` in `status: 'lobby'`
- **WHEN** a joiner GETs `/api/multiplayer/invites/RX7KLM`
- **THEN** the response SHALL be `{matchId, status: 'lobby'}`
- **AND** the joiner SHALL use `matchId` to connect to the WebSocket

#### Scenario: Code expires at launch

- **GIVEN** a match whose `status` has transitioned to `'active'`
- **WHEN** a newcomer GETs `/api/multiplayer/invites/{roomCode}`
- **THEN** the response SHALL be `410 Gone`
- **AND** the body SHALL indicate the match is no longer accepting
  joiners

### Requirement: AI-Filled Seats

The system SHALL allow a host to mark any unoccupied human seat as AI,
and the server SHALL spawn a `BotPlayer` instance in-process to occupy
that seat at match launch.

#### Scenario: Host toggles empty seat to AI

- **GIVEN** an empty seat `bravo-2` with `kind: 'human'`
- **WHEN** the host sends `Intent {kind: 'SetAiSlot', slotId: 'bravo-2',
aiProfile: 'basic'}`
- **THEN** the seat SHALL become `kind: 'ai', aiProfile: 'basic',
ready: true`

#### Scenario: AI seat auto-ready

- **GIVEN** any seat with `kind: 'ai'`
- **WHEN** readiness is evaluated
- **THEN** the seat SHALL be considered ready without an explicit
  toggle

#### Scenario: Bot drives events at launch

- **GIVEN** a match with one or more AI seats
- **WHEN** the match launches
- **THEN** the server SHALL instantiate a `BotPlayer` per AI seat
- **AND** bot-generated intents SHALL NOT traverse the WebSocket layer
  (in-process only)

### Requirement: Readiness Gate

The system SHALL require every seat to be ready AND every human seat to
be occupied before the host may launch the match.

#### Scenario: Cannot launch with empty seat

- **GIVEN** a `'3v3'` match with 5 of 6 seats occupied and ready
- **WHEN** the host sends `Intent {kind: 'LaunchMatch'}`
- **THEN** the server SHALL respond `Error {code: 'NOT_READY',
reason: 'empty-seat'}`

#### Scenario: Cannot launch with unready human

- **GIVEN** a match where all seats are occupied but one human has
  `ready: false`
- **WHEN** the host sends `LaunchMatch`
- **THEN** the server SHALL respond `Error {code: 'NOT_READY',
reason: 'unready-player'}`

#### Scenario: Launch succeeds when fully ready

- **GIVEN** a match where all seats are occupied, all humans are
  ready, and all AI slots are configured
- **WHEN** the host sends `LaunchMatch`
- **THEN** the server SHALL emit `GameCreated` with the computed side
  assignments
- **AND** `IMatchMeta.status` SHALL become `'active'`

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

