# multiplayer-server Specification

## Purpose

Defines Multiplayer Server requirements for WebSocket Transport, Message Envelopes, Match Store Contract, and Server-Authoritative Session Host, preserving the source-of-truth scope introduced by archived change add-multiplayer-server-infrastructure.

## Requirements
### Requirement: WebSocket Transport

The system SHALL provide a bidirectional WebSocket channel for clients
to exchange messages with the authoritative server during a networked
match.
The dev custom server (`npm run dev` -> root `server.js`) and the
hydrated packaged-start server (`npm run build` -> `.next/standalone`
hydration -> `npm run start`) SHALL dispatch authenticated socket
connections through `MatchHostRegistry` and `ServerMatchHost`. The
match-creation surface SHALL remain capacity-guarded so the exposed
transport cannot be abused.

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

#### Scenario: Terminal binding failures close the handshake cleanly

- **GIVEN** an authenticated client completes the WebSocket handshake
- **WHEN** the server cannot bind the socket to a live host because the
  match is unknown or the runtime binding fails
- **THEN** the server SHALL send a typed `Error`/`Close` envelope
  identifying the terminal failure
- **AND** the server SHALL close the socket cleanly rather than leaving a
  half-open connection
- **AND** the server SHALL NOT silently accept intents it cannot dispatch.

#### Scenario: Match creation is capacity-guarded

- **GIVEN** the match-creation REST surface `POST /api/multiplayer/matches`
- **WHEN** a single host creates matches faster than the configured budget
  or beyond a per-host cap
- **THEN** over-budget creates SHALL be rejected with a typed error
- **AND** expired lobby matches SHALL be reaped by a TTL so match storage
  cannot grow unbounded.

### Requirement: Packaged-Build Multiplayer Reachability Is Smoke-Gated

The system SHALL treat a WebSocket upgrade handler on the server that the
packaged build actually runs as a prerequisite for multiplayer being
reachable in a packaged (Docker/Electron) deployment. The packaged
standalone output SHALL be hydrated with the root multiplayer-aware
`server.js` and the generated Next config required by that standalone
build. The spec SHALL NOT assert that packaged multiplayer is reachable
unless the packaged-start smoke check proves socket upgrade and replay.

#### Scenario: Packaged server owns the socket path

- **GIVEN** the Next standalone build has been generated
- **WHEN** the build is prepared for packaged runtime
- **THEN** `.next/standalone/server.js` SHALL be hydrated with the root
  multiplayer-aware custom server
- **AND** the generated Next config SHALL be preserved for that server
- **AND** no Next API route SHALL shadow `/api/multiplayer/socket`, because
  ordinary HTTP fallback and WebSocket upgrade handling both belong to the
  custom server.

#### Scenario: Packaged-build smoke check gates the claim

- **GIVEN** a packaged build whose server is expected to accept WebSocket
  upgrades
- **WHEN** a smoke check performs a WebSocket upgrade against the
  packaged-build server
- **THEN** the upgrade SHALL succeed before multiplayer is claimed reachable
  in a packaged build
- **AND** a failed upgrade SHALL mean the packaged build is treated as
  multiplayer-unavailable.

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

### Requirement: Per-Client Broadcast With Visibility Filter

The server SHALL broadcast events to connected clients on a per-client
basis when a match has fog-of-war enabled, applying the visibility
filter to each event for each destination player.

#### Scenario: Filter runs per connected client

- **GIVEN** a fog-on match with 4 connected clients belonging to
  different sides
- **WHEN** the server broadcasts an event
- **THEN** the server SHALL run `filterEventForPlayer` once per
  connected client
- **AND** SHALL send the (possibly redacted) result only if the
  filter returned a non-null value

#### Scenario: Filter is bypassed when fog disabled

- **GIVEN** a match with `config.fogOfWar: false`
- **WHEN** the server broadcasts an event
- **THEN** the server SHALL send the identical event to every
  connected client
- **AND** SHALL NOT invoke the visibility filter

#### Scenario: Spec visibility of deterministic events

- **GIVEN** a `PhaseChanged` event in a fog-on match
- **WHEN** the server broadcasts it
- **THEN** every connected client SHALL receive the event in full
- **AND** the filter SHALL not redact any fields

### Requirement: Visibility Tied to Authoritative State

The server SHALL evaluate visibility using its authoritative
`IGameState`, NOT any client-provided state, so fog decisions cannot
be gamed by a malicious client reporting false LOS.

#### Scenario: Authoritative state consulted

- **GIVEN** a fog-on match
- **WHEN** the visibility filter runs
- **THEN** the `state` argument passed to `canPlayerSeeUnit` SHALL be
  the server's `currentState`
- **AND** no client-reported value SHALL factor into visibility

### Requirement: Broadcast Performance Under Fog

The server SHALL meet a broadcast budget of at most 5ms per event on
an 8-player match when fog is enabled, achieved through per-turn LOS
caching and invalidation on movement.

#### Scenario: LOS cache invalidation on movement

- **GIVEN** a unit's position changes via `MovementLocked`
- **WHEN** the visibility filter runs for the next event
- **THEN** any cached LOS result involving the moved unit SHALL be
  invalidated and re-computed

#### Scenario: Repeated LOS queries hit cache

- **GIVEN** two events in the same phase and no unit has moved
- **WHEN** the filter evaluates visibility for the same
  `(playerId, unitId)` pair on both events
- **THEN** the second evaluation SHALL reuse the cached result

### Requirement: Durable Match Store

The system SHALL provide a durable `IMatchStore` implementation that persists match metadata and the full event log across a server process restart. It SHALL implement the existing `IMatchStore` interface without modification, so the server core and call sites depend only on `IMatchStore`. `InMemoryMatchStore` SHALL be retained as the explicitly dev-labeled fallback.

#### Scenario: Durable store survives a process restart

- **GIVEN** a durable match store with an `active` match holding 30 persisted events
- **WHEN** the server process restarts and the store is re-opened
- **THEN** `getMatchMeta` SHALL return the match's metadata
- **AND** `getEvents` SHALL return all 30 events in ascending `sequence` order with no gaps

#### Scenario: Durable append is transactional

- **GIVEN** the durable store handling two `appendEvent` calls for the same match with the same `sequence`
- **WHEN** both are processed
- **THEN** exactly one SHALL succeed
- **AND** the other SHALL reject with `MatchStoreSequenceCollisionError`
- **AND** the succeeding event SHALL be durably committed before the promise resolves

#### Scenario: Default store selection is environment-aware

- **GIVEN** the server selecting its match store via `getDefaultMatchStore()`
- **WHEN** the process runs in production
- **THEN** the durable store SHALL be returned
- **AND** in development or test the in-memory store SHALL be returned

### Requirement: Active Match Recovery on Startup

The server SHALL, on startup, enumerate every match with `status: 'active'` in the durable store and re-instantiate a `ServerMatchHost` for each, rebuilding its `InteractiveSession` by replaying the stored event log.

#### Scenario: Active matches rebuilt after restart

- **GIVEN** a durable store containing two `active` matches
- **WHEN** the server starts up
- **THEN** a `ServerMatchHost` SHALL be instantiated for each of the two matches
- **AND** each host's session SHALL reflect the full replayed event log

#### Scenario: Client reconnects after recovery

- **GIVEN** a recovered `active` match and a client reconnecting with its `lastSeq`
- **WHEN** the client sends `SessionJoin`
- **THEN** the server SHALL stream the events newer than `lastSeq` via `ReplayStart`, `ReplayChunk`, and `ReplayEnd`

### Requirement: Host Migration on Host Disconnect

When the connection of the player holding `hostPlayerId` is lost, the server SHALL promote a surviving connected human seat to `hostPlayerId` so privileged operations remain available, rather than aborting the match. The promotion SHALL be recorded in `IMatchMeta` and broadcast to all connected clients.

#### Scenario: Surviving seat promoted to host

- **GIVEN** an active match whose host's socket has dropped while another human seat remains connected
- **WHEN** the server detects the host-connection loss
- **THEN** the longest-connected surviving human seat SHALL be promoted to `hostPlayerId`
- **AND** the new `hostPlayerId` SHALL be persisted via `updateMatchMeta`
- **AND** all connected clients SHALL be notified of the migration

#### Scenario: Privileged operations work for the migrated host

- **GIVEN** a match whose host privilege has migrated to a surviving player
- **WHEN** that player performs a privileged operation
- **THEN** the server SHALL authorize it against the migrated `hostPlayerId`

#### Scenario: Migration repeats if the promoted holder also disconnects

- **GIVEN** a match whose migrated host then also disconnects while another human seat survives
- **WHEN** the server detects the second host-connection loss
- **THEN** the promotion SHALL repeat to the next surviving human seat

### Requirement: Graceful Degradation on Host-Connection Loss

The server SHALL route a host-connection loss through the existing pending/grace mechanism so the match pauses rather than aborting. The match SHALL resume on host reconnect within the grace window and SHALL complete cleanly through the normal outcome path on grace expiry, never via the legacy abort path.

#### Scenario: Host blip pauses then resumes

- **GIVEN** an active server-authoritative match
- **WHEN** the host's connection is lost and then re-established within the grace window
- **THEN** the match SHALL broadcast `MatchPaused` on the loss
- **AND** the match SHALL broadcast `MatchResumed` on the host's reconnect

#### Scenario: Grace expiry completes the match cleanly

- **GIVEN** a paused match whose host has not reconnected
- **WHEN** the grace timer expires
- **THEN** the match SHALL complete through the normal outcome path
- **AND** the match SHALL NOT end with the legacy `reason: 'aborted'` abort

### Requirement: Intent Rate-Limiting

The authoritative server SHALL apply a per-connection token-bucket rate limit to inbound intents. An intent that exceeds the configured budget SHALL be rejected with a non-fatal `Error {code: 'RATE_LIMITED'}`, the connection SHALL remain open, and no event SHALL be appended. Heartbeat and replay traffic SHALL be exempt.

#### Scenario: Intent flood is throttled

- **GIVEN** a connection sending intents faster than the configured budget
- **WHEN** the budget is exceeded
- **THEN** the server SHALL reply `Error {code: 'RATE_LIMITED'}`
- **AND** no event SHALL be appended for the rejected intent
- **AND** the WebSocket connection SHALL remain open

#### Scenario: Legitimate play is not throttled

- **GIVEN** a connection sending intents at a worst-case human play rate
- **WHEN** the server processes them
- **THEN** no intent SHALL be rejected with `RATE_LIMITED`

### Requirement: Replay-Attack Protection

Every `Intent` envelope SHALL carry a unique id, and the server SHALL maintain a per-match bounded set of accepted intent ids. An inbound intent whose id has already been accepted SHALL be rejected with `Error {code: 'DUPLICATE_INTENT'}` and SHALL append no event. The accepted-id set SHALL be reconstructed on match recovery so a restart does not reopen the replay window.

#### Scenario: Re-sent intent is rejected

- **GIVEN** an intent envelope the server has already accepted for a match
- **WHEN** the same envelope is received again
- **THEN** the server SHALL reply `Error {code: 'DUPLICATE_INTENT'}`
- **AND** no event SHALL be appended

#### Scenario: Replay window is closed after recovery

- **GIVEN** a match recovered from the durable store on server restart
- **WHEN** an intent previously accepted before the restart is re-sent
- **THEN** the server SHALL reject it as a duplicate

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

### Requirement: Recovered Session Has Populated Adapted Units

`InteractiveSession.fromSession()` SHALL re-derive `adaptedUnits` from canonical campaign state on session recovery, so a session resumed after server restart has the same per-unit adapted state as a freshly-bootstrapped session. Previously the recovery path left `adaptedUnits` empty, breaking full move/attack play after recovery (playtest gap #2).

**Priority**: High

#### Scenario: Recovered session adapted-units match bootstrap parity

**GIVEN** a session bootstrap-initialized with 4 units (each with deterministic adapted state)
**AND** the same session persisted, then reconstructed via `fromSession`
**WHEN** `recovered.adaptedUnits` is inspected
**THEN** the array SHALL contain 4 entries (one per unit)
**AND** each entry SHALL deeply match the bootstrap-time entry for that unit

#### Scenario: Move + attack succeeds on a recovered session

**GIVEN** a session persisted mid-combat (turn 3, some moves committed)
**AND** the session reconstructed via `fromSession`
**WHEN** the recovered session executes a move action followed by an attack action
**THEN** neither action SHALL throw
**AND** the moves/attacks SHALL behave identically to a non-recovered session at the same turn (deterministic given the same seed)

#### Scenario: Bootstrap path is unaffected

**GIVEN** a session that is bootstrap-initialized (not recovered)
**WHEN** the session runs through combat normally
**THEN** the new `adaptedUnits` derivation path inside `fromSession` SHALL NOT affect the bootstrap behavior (the same derivation function is called from both code paths, but the bootstrap path's call is unchanged)
