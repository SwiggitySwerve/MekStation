# multiplayer-server Specification Delta

## ADDED Requirements

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
