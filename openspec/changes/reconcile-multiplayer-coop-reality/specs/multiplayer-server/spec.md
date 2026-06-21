# multiplayer-server Delta — reconcile-multiplayer-coop-reality

## MODIFIED Requirements

### Requirement: WebSocket Transport

The system SHALL provide a bidirectional WebSocket channel for clients
to exchange messages with the authoritative server during a networked
match on server entrypoints that carry the multiplayer upgrade handler.
The dev custom server (`npm run dev` → root `server.js`) SHALL dispatch
authenticated socket connections through `MatchHostRegistry` and
`ServerMatchHost`, while packaged-build reachability remains separately
gated until the packaged server also carries an upgrade handler. The
match-creation surface SHALL remain capacity-guarded so the exposed
transport cannot be abused.

#### Scenario: Client connects and joins

- **GIVEN** the live transport is wired and a client wants to join match `sess_abc`
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

- **GIVEN** the live transport is wired and a client sends `SessionJoin` with an unknown `matchId`
- **WHEN** the server handles the message
- **THEN** the server SHALL reply `Error {code: 'UNKNOWN_MATCH'}`
- **AND** the server SHALL close the socket

#### Scenario: Heartbeat keeps connection alive

- **GIVEN** the live transport is wired and a connected client
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

## ADDED Requirements

### Requirement: Packaged-Build Multiplayer Requires an Upgrade Handler

The system SHALL treat a WebSocket upgrade handler on the server that the
packaged build actually runs as a prerequisite for multiplayer being
reachable in a packaged (Docker/Electron) deployment. The spec SHALL NOT
assert that multiplayer is reachable in a packaged build while the only
server carrying an upgrade handler is the custom `server.js` booted by
`npm run dev`, because the packaged build runs Next's `output: 'standalone'`
server, which has no upgrade handler and shadows the custom server.

#### Scenario: Dev-only transport is named, not assumed

- **GIVEN** `npm run dev` boots `node server.js` (which carries the WebSocket
  upgrade handler) while `npm run start` and the packaged build run the
  `output: 'standalone'` server
- **WHEN** the multiplayer reachability of a packaged build is evaluated
- **THEN** the packaged build SHALL be treated as having no multiplayer
  transport until a server with an upgrade handler is part of the packaged
  build
- **AND** the spec SHALL NOT claim packaged-build multiplayer works on the
  strength of the dev-only `server.js`.

#### Scenario: Packaged-build smoke check gates the claim

- **GIVEN** a packaged build whose server is expected to accept WebSocket
  upgrades
- **WHEN** a smoke check performs a WebSocket upgrade against the
  packaged-build server
- **THEN** the upgrade SHALL succeed before multiplayer is claimed reachable
  in a packaged build
- **AND** a failed upgrade SHALL mean the packaged build is treated as
  multiplayer-unavailable.
