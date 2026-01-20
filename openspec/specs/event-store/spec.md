# event-store Specification

## Purpose
TBD - created by archiving change add-unified-event-store. Update Purpose after archive.
## Requirements
### Requirement: Base Event Structure

The system SHALL define a base event structure that all domain events extend.

#### Scenario: Create game event

- **GIVEN** a game action occurs (movement, attack, damage)
- **WHEN** the event is created
- **THEN** the event has a unique UUID
- **AND** the event has a monotonically increasing sequence number
- **AND** the event has an ISO 8601 timestamp
- **AND** the event has category "game"
- **AND** the event has context including gameId

#### Scenario: Create campaign event

- **GIVEN** a campaign action occurs (mission complete, roster change, resource spent)
- **WHEN** the event is created
- **THEN** the event has context including campaignId and missionId
- **AND** the event may reference triggering events via causedBy

#### Scenario: Create pilot event

- **GIVEN** a pilot action occurs (XP gained, skill improved, wound received, award granted)
- **WHEN** the event is created
- **THEN** the event has category "pilot"
- **AND** the event has context including pilotId
- **AND** the event references the triggering event (e.g., mission_completed)

### Requirement: Event Immutability

The system SHALL ensure events are immutable once created.

#### Scenario: Append-only storage

- **GIVEN** an event is stored in the event log
- **WHEN** any attempt is made to modify or delete it
- **THEN** the operation is rejected
- **AND** the original event remains unchanged

#### Scenario: Sequence integrity

- **GIVEN** events are appended to the store
- **WHEN** querying the event log
- **THEN** events are returned in sequence order
- **AND** no sequence numbers are skipped
- **AND** no sequence numbers are duplicated

### Requirement: Chunked Storage

The system SHALL store events in chunks aligned to mission boundaries.

#### Scenario: Mission chunk creation

- **GIVEN** a mission completes in a campaign
- **WHEN** the mission is finalized
- **THEN** all events from that mission are bundled into one chunk
- **AND** the chunk has a unique chunkId
- **AND** the chunk has a sequenceRange [first, last]
- **AND** the chunk has a summary with event counts and involved entities

#### Scenario: Checkpoint creation

- **GIVEN** a chunk is finalized
- **WHEN** the checkpoint is created
- **THEN** the checkpoint contains the full derived state at that point
- **AND** the checkpoint references the chunk's sequence number
- **AND** loading the checkpoint provides instant state without replay

#### Scenario: Chain linking

- **GIVEN** multiple chunks exist for a campaign
- **WHEN** a new chunk is created
- **THEN** the chunk's previousHash equals the prior chunk's hash
- **AND** this forms a verifiable chain

### Requirement: State Derivation

The system SHALL derive state by replaying events through reducers.

#### Scenario: Derive current state

- **GIVEN** a sequence of events
- **WHEN** deriveState is called
- **THEN** each event is applied in sequence order
- **AND** the final state reflects all events

#### Scenario: Derive from checkpoint

- **GIVEN** a checkpoint and events since that checkpoint
- **WHEN** deriving state
- **THEN** the checkpoint state is loaded directly
- **AND** only events after the checkpoint are replayed
- **AND** the result equals full replay from start

#### Scenario: Time travel

- **GIVEN** a user wants state at sequence N
- **WHEN** requesting that state
- **THEN** the nearest checkpoint before N is loaded
- **AND** events from checkpoint to N are replayed
- **AND** the historical state is returned

### Requirement: Event Queries

The system SHALL support flexible event queries.

#### Scenario: Filter by category

- **GIVEN** events of categories Game, Campaign, Pilot exist
- **WHEN** querying with category = "pilot"
- **THEN** only Pilot events are returned

#### Scenario: Filter by context

- **GIVEN** events with various context scopes
- **WHEN** querying with pilotId = "pilot-123"
- **THEN** only events where context.pilotId = "pilot-123" are returned
- **AND** this includes events where pilot was actor OR target

#### Scenario: Filter by time range

- **GIVEN** events spanning multiple days
- **WHEN** querying with fromTimestamp and toTimestamp
- **THEN** only events within that range are returned

#### Scenario: Filter by sequence range

- **GIVEN** events with sequences 1-1000
- **WHEN** querying with fromSequence=100, toSequence=200
- **THEN** only events with sequence 100-200 are returned

### Requirement: Chain Verification

The system SHALL support cryptographic verification of event chains.

#### Scenario: Compute event hash

- **GIVEN** an event
- **WHEN** hashing the event
- **THEN** a SHA-256 hash is computed from deterministic JSON
- **AND** the same event always produces the same hash

#### Scenario: Compute chunk hash

- **GIVEN** a chunk with events
- **WHEN** hashing the chunk
- **THEN** the hash includes the events hash, metadata, and previousHash
- **AND** any modification changes the hash

#### Scenario: Verify chain integrity

- **GIVEN** a sequence of chunks
- **WHEN** verification is requested
- **THEN** each chunk's previousHash is compared to prior chunk's hash
- **AND** if all match, verification passes
- **AND** if any mismatch, the broken link is reported

#### Scenario: Detect tampering

- **GIVEN** a chunk has been modified after creation
- **WHEN** verification is run
- **THEN** the hash mismatch is detected
- **AND** the specific tampered chunk is identified

### Requirement: Causality Tracking

The system SHALL track cause-effect relationships between events.

#### Scenario: Link triggered events

- **GIVEN** a mission_completed event
- **WHEN** pilot XP is awarded
- **THEN** the xp_gained event has causedBy referencing mission_completed
- **AND** the relationship is "triggered"

#### Scenario: Trace causality chain

- **GIVEN** a pilot has wounds
- **WHEN** querying "why does this pilot have wounds"
- **THEN** the causality chain is traversed
- **AND** the originating damage_applied events are found
- **AND** the full chain is: wound_received ← damage_applied ← attack_resolved

