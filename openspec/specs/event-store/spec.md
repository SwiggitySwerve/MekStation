# event-store Specification

## Purpose

Defines the shared authoritative event-journal envelope, atomic append, integrity, entity-history, query, adapter-conformance, chunk, and state-derivation requirements. It preserves the source-of-truth scope introduced by archived change add-unified-event-store while making stream-local authority and store-local observation order explicit.

## Requirements

### Requirement: Authority Events Have One Owning Stream and Explicit Entity Links

Every authoritative event SHALL be stored once in one owning stream with stable event, stream, branch, command, correlation, causation, schema-version, stream-revision, commit-position, command-index, actor-kind/ID, accepting-authority-type/ID, timestamp, canonicalizer-version, predecessor-digest, and event-digest identities. Actor identity SHALL describe the initiating `human|system|migration` principal. Accepting-authority identity SHALL describe the server-owned command-authority instance that admitted and committed the batch; it SHALL NOT be interpreted as a role, membership, owning entity, or reusable authorization token. The journal SHALL index every affected durable entity instance by type, ID, and role without treating display names, route parameters, canonical templates, or content hashes as entity identity. Raw journal and entity-history reads SHALL remain server-internal and SHALL NOT be serialized to a transport, timeline, replay view, snapshot, or export.

#### Scenario: Customized unit history crosses domains

- **WHEN** a customized unit instance is adopted into a campaign, assigned to a mission, and used in combat
- **THEN** each authoritative event SHALL remain stored in its owning stream
- **AND** entity links SHALL let an authorized query return each linked event once for the same durable unit-instance ID

#### Scenario: Unrelated streams write independently

- **WHEN** two unrelated campaign or match streams append concurrently
- **THEN** each stream SHALL compare only its own expected revision
- **AND** a short store-owned coordination point MAY assign unique monotonically increasing store-local observation positions with gaps
- **AND** the observation cursor SHALL NOT become a caller-supplied global expected head, domain chronology, or causal order

#### Scenario: Client supplies stored provenance

- **WHEN** a transport or client command supplies actor, accepting-authority, final revision, commit-position, recorded timestamp, receipt, or digest fields
- **THEN** the server SHALL ignore or reject those stored-field claims
- **AND** only a resolved server-internal principal and accepting authority SHALL populate committed provenance

#### Scenario: Raw entity history is requested

- **WHEN** an application surface needs history for a unit, pilot, mission, match, session, or campaign
- **THEN** the raw journal query SHALL remain inside the trusted server boundary
- **AND** the surface SHALL receive only an authorized viewer projection

### Requirement: Command Event Batches Append Atomically at an Expected Revision

The journal SHALL accept an ordered event batch with an expected `(stream type, stream ID, branch ID, revision)` head and stable command identity. Wave 1 SHALL admit only the deterministic root branch. In one transaction it SHALL verify the head and predecessor digest, persist exactly one physical command-batch record that is also the idempotent receipt, assign contiguous stream revisions and command indexes, assign unique monotonically increasing observation positions whose numeric values MAY contain gaps, calculate the canonical event-digest chain, insert entity links, and advance the head.

#### Scenario: Multi-event command commits

- **WHEN** a command derives more than one event and the expected revision matches
- **THEN** every event and link SHALL commit without interleaving from another command in that stream
- **AND** a retry with the same command identity and payload digest SHALL return the original receipt without another append

#### Scenario: Revision or identity collision

- **WHEN** the expected revision is stale or an existing command identity is reused with different content
- **THEN** the journal SHALL reject the batch
- **AND** no event, link, receipt, or head update from that attempt SHALL persist

#### Scenario: Root stream appends its first event

- **WHEN** an empty root branch accepts its first batch
- **THEN** its expected revision SHALL be 0 and its first stored revision SHALL be 1
- **AND** the first event predecessor digest SHALL be null

#### Scenario: Stored predecessor digest disagrees

- **WHEN** append or recovery detects that the current head digest does not match the next event predecessor
- **THEN** append SHALL reject the operation or verified adapter opening SHALL fail closed
- **AND** it SHALL publish no partial state; later domain adoption MAY map the failure to quarantine

### Requirement: Journal Adapters Pass One Conformance Contract

Every journal adapter SHALL pass the same executable contract for stream ordering, observation-cursor safety, integrity chaining, atomicity, idempotency, entity queries, restart recovery, and failure rollback. The initial durable adapter SHALL use the repository SQLite stack without adding another service.

#### Scenario: SQLite restarts after committed batch

- **WHEN** the SQLite adapter commits a batch and the process restarts
- **THEN** the stream, receipt, entity links, and head SHALL recover identically
- **AND** a fresh append SHALL continue at the next contiguous revision

#### Scenario: Observation position allocation is interrupted

- **WHEN** an observation position is allocated but its transaction rolls back
- **THEN** a later committed event MAY leave a numeric gap
- **AND** high-water reads SHALL still return every committed event exactly once

#### Scenario: SQLite adapter borrows an initialized connection

- **WHEN** trusted code constructs the SQLite journal over an initialized repository database handle
- **THEN** the adapter SHALL NOT initialize, migrate, checkpoint, or close the borrowed handle
- **AND** durable restart SHALL be controlled by the connection owner reopening the same file

#### Scenario: Durable journal recovery detects corruption

- **WHEN** receipt membership, command identity, event chains, heads, normalized links, observation positions, or high-water state disagree
- **THEN** verified SQLite adapter opening SHALL fail closed before returning an adapter
- **AND** no partial projection or production authority cutover SHALL occur

### Requirement: Base Event Structure

The system SHALL store every authoritative domain fact in a versioned envelope with one owning `(stream type, stream ID, branch ID)`, a contiguous stream revision, a store-assigned observation position, command/correlation/causation identity, actor and authority identity, timestamps, canonical integrity fields, typed payload, and stable affected-entity links.

#### Scenario: Create authoritative event

- **GIVEN** a combat or campaign command derives an authoritative fact
- **WHEN** the journal commits its command batch
- **THEN** the store SHALL assign its final stream revision and observation position
- **AND** the event SHALL identify its owning stream and affected durable entities

#### Scenario: Create causally linked event

- **GIVEN** a committed fact causes a later fact in another owning stream
- **WHEN** the later event is committed
- **THEN** it SHALL retain correlation and causation event identities without duplicating the source event

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

The system SHALL reject modification or deletion of committed authority events. Stream revisions SHALL be gap-free only within one `(stream type, stream ID, branch ID)`. Observation positions SHALL be unique and monotonically increasing but MAY contain numeric gaps.

#### Scenario: Append-only storage

- **GIVEN** an authority event is committed
- **WHEN** any caller attempts to update or delete its payload, identity, links, or digest
- **THEN** the operation SHALL be rejected
- **AND** the original event SHALL remain unchanged

#### Scenario: Raw SQLite handle attempts direct mutation

- **GIVEN** a committed command batch, event, entity reference, or causation link
- **WHEN** trusted repository code uses the raw SQLite handle to update or delete that immutable fact
- **THEN** adapter-local storage enforcement SHALL abort the statement
- **AND** mutable head and high-water projections SHALL still verify against the unchanged facts

#### Scenario: Stream sequence integrity

- **GIVEN** events committed to one root branch
- **WHEN** that branch is read
- **THEN** its stream revisions SHALL be ordered, contiguous, and unique
- **AND** observation-position gaps SHALL NOT be treated as missing stream events

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

The system SHALL support server-internal queries by owning stream, accepting-authority identity, affected entity identity and role, bounded store-local observation range, and causal identity. Raw query results SHALL NOT be exposed directly to player-facing surfaces.

#### Scenario: Filter by durable entity

- **GIVEN** one event linked to a pilot as actor and a unit as subject
- **WHEN** trusted code queries either durable entity ID
- **THEN** the same stored event SHALL be returned once with its link role

#### Scenario: User-facing history is requested

- **GIVEN** an authenticated viewer requests history
- **WHEN** the application resolves matching raw events
- **THEN** authorization and viewer projection SHALL occur before serialization

#### Scenario: Catch-up reads through a captured boundary

- **GIVEN** trusted code captures a store-local high-water position
- **WHEN** it pages committed events after an exclusive prior cursor through that boundary
- **THEN** pages SHALL be ordered by commit position and SHALL include every committed event in the bounded range exactly once
- **AND** an exhausted page SHALL advance to the captured boundary despite numeric gaps
- **AND** no later transaction SHALL publish an event at or below that returned boundary

#### Scenario: Catch-up query has invalid bounds

- **WHEN** a catch-up query contains a negative or unsafe cursor, `afterCommitPosition` greater than `throughCommitPosition`, or a non-integer limit outside 1 through 500
- **THEN** the journal SHALL reject the query without reading events or advancing a consumer cursor

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

The system SHALL calculate a server-computed cryptographic digest for every authority event and chain it to the prior event digest in the same stream branch. Canonicalizer v1 SHALL apply RFC 8785 JSON canonicalization to UTF-8 digest-material bytes containing every immutable envelope field except `eventDigest`, after sorting set-like entity references by type/ID/role and causation event IDs lexicographically while preserving payload-array order. Adapters SHALL persist and return those set-like fields in the same normalized order. The canonicalizer SHALL include its version and predecessor digest, use SHA-256 lowercase hexadecimal, perform no Unicode normalization, and reject non-finite or unsupported values. Verification SHALL report the first broken event and SHALL fail closed for authoritative replay. Digests SHALL NOT authenticate or authorize access.

#### Scenario: Verify root chain

- **GIVEN** a root branch with committed events
- **WHEN** chain verification runs
- **THEN** the first event SHALL have a null predecessor and every later predecessor SHALL match

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

- **GIVEN** a stored event payload, identity, or entity link differs from its canonical digest
- **WHEN** recovery verifies the branch
- **THEN** verified adapter opening SHALL fail closed before returning durable state
- **AND** no partial projection SHALL publish; later domain adoption MAY map the failure to quarantine

#### Scenario: Two adapters hash the canonical fixture

- **GIVEN** the same fixed v1 event fixture with deliberately shuffled object keys and entity-reference input order
- **WHEN** the in-memory and SQLite adapters compute its digest material and SHA-256
- **THEN** both SHALL produce the published fixture bytes and lowercase digest
- **AND** a payload array order change SHALL produce a different digest

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
