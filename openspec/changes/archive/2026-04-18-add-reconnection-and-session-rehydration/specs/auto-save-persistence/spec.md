# auto-save-persistence Specification Delta

## ADDED Requirements

### Requirement: Server-Side Persistence Contract

The auto-save persistence system SHALL define server-side persistence
behaviour in parallel to the client-side IndexedDB contract, so active
matches survive server restarts without data loss.

#### Scenario: Write-through on every append

- **GIVEN** a `ServerMatchHost` receiving an appendable event
- **WHEN** the host resolves the event
- **THEN** the event SHALL be persisted via `IMatchStore.appendEvent`
  BEFORE being broadcast to connected clients
- **AND** a failed persist SHALL prevent the broadcast and emit
  `Error {code: 'STORE_FAILURE'}`

#### Scenario: Load on server startup

- **GIVEN** the server has a set of matches with `status: 'active'` in
  the store at process startup
- **WHEN** the server initializes
- **THEN** it SHALL call `getEvents(matchId)` for each active match
- **AND** it SHALL instantiate `ServerMatchHost` instances pre-loaded
  with the retrieved event logs

#### Scenario: Match store API parity with client IndexedDB

- **GIVEN** the 4a client-side IndexedDB contract and this server-side
  `IMatchStore` contract
- **WHEN** both are inspected
- **THEN** both SHALL support ordered event retrieval by `(matchId,
fromSeq)`
- **AND** both SHALL enforce that a single match's events have no
  sequence gaps and no duplicate sequences

### Requirement: Cross-Device Reconnect Depends On Server Store

The system SHALL rely on the server-side `IMatchStore` (not the
client's IndexedDB) as the source of truth during reconnect for
networked matches, so a player reconnecting from a different device
receives the same authoritative log.

#### Scenario: Cross-device reconnect delivers same state

- **GIVEN** a player plays for 10 turns on Device A, then opens the
  match on Device B with a fresh IndexedDB
- **WHEN** Device B authenticates and sends `SessionJoin {lastSeq: 0}`
- **THEN** the server SHALL stream the full event log from the
  `IMatchStore`
- **AND** Device B's `currentState` SHALL match Device A's state at
  the last event
