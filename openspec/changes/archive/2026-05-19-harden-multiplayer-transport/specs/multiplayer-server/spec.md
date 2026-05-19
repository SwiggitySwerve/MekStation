## ADDED Requirements

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
