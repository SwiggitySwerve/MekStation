# auto-save-persistence Specification Delta

## ADDED Requirements

### Requirement: Game Event Log Storage

The auto-save persistence system SHALL provide an IndexedDB-backed
storage path for game event logs, keyed by match id and event sequence.

#### Scenario: Event log storage schema

- **GIVEN** the app initializes its IndexedDB
- **WHEN** the schema is inspected
- **THEN** an object store `matchEvents` SHALL exist
- **AND** records SHALL have shape `{matchId, sequence, event, savedAt}`
- **AND** the primary key SHALL be the tuple `[matchId, sequence]`

#### Scenario: Match metadata store

- **GIVEN** the same IndexedDB
- **WHEN** the schema is inspected
- **THEN** an object store `matches` SHALL exist
- **AND** records SHALL have shape `{matchId, hostPeerId, guestPeerId,
status, lastActivity}`

### Requirement: Multi-Session Local Storage

The system SHALL allow multiple concurrent match logs to coexist in
local storage so a completed match remains inspectable while a new one
begins.

#### Scenario: Two match logs coexist

- **GIVEN** match `sess_abc` is completed and its log is on disk
- **WHEN** a new match `sess_xyz` starts and appends events
- **THEN** both match logs SHALL be queryable by match id
- **AND** writes to `sess_xyz` SHALL NOT overwrite `sess_abc` records

#### Scenario: Query events for a specific match

- **GIVEN** multiple match logs in IndexedDB
- **WHEN** `getEventsForMatch('sess_abc')` is called
- **THEN** the result SHALL include only events whose `matchId` equals
  `'sess_abc'`
- **AND** results SHALL be returned in ascending sequence order

### Requirement: Batched Writes

The system SHALL batch event-log writes to minimize IndexedDB
transaction overhead during high-frequency event bursts (e.g., the
attack-resolution phase that emits many events in sequence).

#### Scenario: Burst writes share a transaction

- **GIVEN** 20 events are appended within a single animation frame
- **WHEN** the persistence layer flushes
- **THEN** the 20 writes SHALL share a single IndexedDB transaction
- **AND** the flush SHALL complete within 50ms on a baseline device
