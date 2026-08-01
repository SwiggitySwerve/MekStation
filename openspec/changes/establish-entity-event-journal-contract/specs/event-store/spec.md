## ADDED Requirements

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

## MODIFIED Requirements

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

### Requirement: Chain Verification
The system SHALL calculate a server-computed cryptographic digest for every authority event and chain it to the prior event digest in the same stream branch. Canonicalizer v1 SHALL apply RFC 8785 JSON canonicalization to UTF-8 digest-material bytes containing every immutable envelope field except `eventDigest`, after sorting set-like entity references by type/ID/role and causation event IDs lexicographically while preserving payload-array order. Adapters SHALL persist and return those set-like fields in the same normalized order. The canonicalizer SHALL include its version and predecessor digest, use SHA-256 lowercase hexadecimal, perform no Unicode normalization, and reject non-finite or unsupported values. Verification SHALL report the first broken event and SHALL fail closed for authoritative replay. Digests SHALL NOT authenticate or authorize access.

#### Scenario: Verify root chain
- **GIVEN** a root branch with committed events
- **WHEN** chain verification runs
- **THEN** the first event SHALL have a null predecessor and every later predecessor SHALL match

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
