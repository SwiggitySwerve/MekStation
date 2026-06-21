# multiplayer-server Delta — reconcile-multiplayer-coop-reality

## MODIFIED Requirements

### Requirement: WebSocket Transport

The system SHALL provide a bidirectional WebSocket channel for clients
to exchange messages with the authoritative server during a networked
match on server entrypoints that carry the multiplayer upgrade handler.
The dev custom server (`npm run dev` → root `server.js`) and the
hydrated packaged-start server (`npm run build` → `.next/standalone`
hydration → `npm run start`) SHALL dispatch authenticated socket
connections through `MatchHostRegistry` and `ServerMatchHost`. The
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
