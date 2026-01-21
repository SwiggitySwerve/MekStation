# Specification: Unified Event Store

## ADDED Requirements

### Requirement: Base Event Structure

The system SHALL define a base event structure that all events extend.

#### Scenario: Create game event

- **GIVEN** a game action occurs (movement, attack, damage)
- **WHEN** the event is created
- **THEN** the event has a unique ID (UUID v4)
- **AND** the event has a monotonically increasing sequence number
- **AND** the event has an ISO 8601 timestamp
- **AND** the event has a category of "game"
- **AND** the event has context including gameId

#### Scenario: Create campaign event

- **GIVEN** a campaign action occurs (mission complete, roster change)
- **WHEN** the event is created
- **THEN** the event has context including campaignId and missionId
- **AND** the event may reference a triggering event via causedBy

#### Scenario: Create pilot event

- **GIVEN** a pilot state change occurs (XP gained, wound taken, skill learned)
- **WHEN** the event is created
- **THEN** the event has context including pilotId
- **AND** the event category is "pilot"

### Requirement: Event Categories

The system SHALL categorize events by domain.

#### Scenario: Event category enumeration

- **GIVEN** the event category type
- **WHEN** listing available categories
- **THEN** the categories include: game, campaign, pilot, repair, award, meta

#### Scenario: Category filtering

- **GIVEN** events of multiple categories in the store
- **WHEN** querying with a category filter
- **THEN** only events matching the category are returned

### Requirement: Event Immutability

The system SHALL ensure events are immutable once created.

#### Scenario: Append-only storage

- **GIVEN** an event is appended to the store
- **WHEN** attempting to modify the event
- **THEN** the operation is rejected
- **AND** the original event remains unchanged

#### Scenario: Sequence integrity

- **GIVEN** events are appended to the store
- **WHEN** querying the event log
- **THEN** events are returned in sequence order
- **AND** no sequence numbers are skipped or duplicated

### Requirement: Chunked Storage

The system SHALL store events in chunks aligned to logical boundaries.

#### Scenario: Mission chunk creation

- **GIVEN** a mission completes with events
- **WHEN** creating a chunk for the mission
- **THEN** all events from that mission are stored in one chunk
- **AND** the chunk has a unique chunkId
- **AND** the chunk includes sequence range and time range
- **AND** a summary is generated (event counts, pilots involved)

#### Scenario: Chunk hashing

- **GIVEN** a chunk is created
- **WHEN** finalizing the chunk
- **THEN** a SHA-256 hash is computed from the events
- **AND** the hash is stored with the chunk

#### Scenario: Chain linking

- **GIVEN** multiple chunks in sequence
- **WHEN** creating a new chunk
- **THEN** the new chunk references the previous chunk's hash
- **AND** this forms a verifiable chain

### Requirement: Checkpoints

The system SHALL create checkpoints for fast state reconstruction.

#### Scenario: Create checkpoint

- **GIVEN** a mission completes
- **WHEN** a checkpoint is created
- **THEN** the checkpoint captures the current derived state
- **AND** the checkpoint includes the sequence number
- **AND** the checkpoint is hashed for integrity

#### Scenario: Fast state reconstruction

- **GIVEN** a user wants to view state after mission N
- **WHEN** the state is requested
- **THEN** the checkpoint for mission N is loaded directly
- **AND** no event replay is needed for checkpoint states

### Requirement: Event Queries

The system SHALL support flexible event queries.

#### Scenario: Filter by category

- **GIVEN** events of multiple categories exist
- **WHEN** querying with category filter
- **THEN** only events of that category are returned

#### Scenario: Filter by context

- **GIVEN** events with various context scopes
- **WHEN** querying with pilotId filter
- **THEN** only events involving that pilot are returned

#### Scenario: Filter by sequence range

- **GIVEN** events spanning a range of sequences
- **WHEN** querying with fromSequence and toSequence
- **THEN** only events within that range are returned

#### Scenario: Filter by time range

- **GIVEN** events spanning multiple sessions
- **WHEN** querying with timestamp range
- **THEN** only events within that time range are returned

#### Scenario: Filter by event type

- **GIVEN** events of various types
- **WHEN** querying with type filter
- **THEN** only events of that specific type are returned

### Requirement: Chain Verification

The system SHALL support cryptographic verification of event chains.

#### Scenario: Verify intact chain

- **GIVEN** a campaign with multiple mission chunks
- **WHEN** verification is requested
- **THEN** each chunk's previousHash matches the prior chunk's hash
- **AND** verification passes with valid=true

#### Scenario: Detect tampering

- **GIVEN** a chunk has been modified or is missing
- **WHEN** verification is requested
- **THEN** the hash mismatch is detected
- **AND** the specific broken link (chunkId) is reported
- **AND** verification fails with valid=false

### Requirement: Event Hashing

The system SHALL compute deterministic hashes for events.

#### Scenario: Consistent event hash

- **GIVEN** an event with specific content
- **WHEN** hashing the same event twice
- **THEN** the same SHA-256 hash is produced both times

#### Scenario: Different events different hashes

- **GIVEN** two events with different content
- **WHEN** hashing both events
- **THEN** different hashes are produced

### Requirement: Causality Tracking

The system SHALL track cause-effect relationships between events.

#### Scenario: Event triggered by another

- **GIVEN** a pilot gains XP after destroying an enemy
- **WHEN** creating the XP event
- **THEN** the causedBy field references the destroy event
- **AND** the relationship type is "triggered"

#### Scenario: Event derived from another

- **GIVEN** campaign state changes based on mission outcome
- **WHEN** creating the campaign update event
- **THEN** the causedBy field references the mission complete event
- **AND** the relationship type is "derived"
