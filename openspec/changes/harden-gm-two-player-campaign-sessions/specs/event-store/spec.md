## ADDED Requirements

### Requirement: Authority Events Have One Owning Stream and Explicit Entity References
Every authoritative event SHALL be stored once in one owning stream with stable event, stream, branch, command, correlation, causation, schema-version, stream-revision, commit-position, command-index, and integrity identities. The event SHALL carry indexed references to every durable entity instance it owns, affects, derives from, targets, or acts through. Canonical templates, display names, and route parameters SHALL NOT substitute for durable entity-instance identity.

#### Scenario: Multi-entity combat fact is stored once
- **WHEN** one combat command affects an attacker unit, target unit, both pilots, a match, and its campaign session
- **THEN** the resulting event SHALL have one physical authoritative record in the owning match stream
- **AND** indexed entity references SHALL link that record to each affected durable entity instance with an explicit role

#### Scenario: Customized unit retains instance lineage
- **WHEN** a canonical unit is customized, adopted into a campaign force, materialized into a mission, used in combat, and repaired in a later session
- **THEN** every authorized event SHALL reference the same durable unit-instance identity
- **AND** the canonical source unit SHALL remain a separate source reference rather than replacing the instance identity

#### Scenario: Unrelated sessions do not share one write head
- **WHEN** commands commit concurrently in two unrelated campaign sessions or standalone matches
- **THEN** each owning stream SHALL advance independently
- **AND** neither command SHALL compare against or serialize behind a global cross-session expected head

#### Scenario: Stream and database ordering remain distinct
- **WHEN** one query spans events from more than one owning stream
- **THEN** each event's stream revision SHALL identify its position and predecessor inside its owning stream and branch
- **AND** its server-only commit position SHALL provide deterministic cross-stream query order without becoming a shared concurrency head
- **AND** command index SHALL preserve order among events committed by the same command

### Requirement: Entity History Resolves at an Explicit Authority Point
The event store SHALL resolve an authorized entity's history and derived state at an explicit branch plus stream revision, commit position, or event identity. Resolution SHALL use the nearest compatible immutable checkpoint plus authoritative tail and SHALL return proof metadata identifying the applied event range, reducer version, and integrity digests.

#### Scenario: Previous-session state is reconstructed
- **WHEN** an authorized viewer requests a unit instance at the branch and stream revision recorded before a prior session ended
- **THEN** the resolver SHALL return the state derived only from authorized events effective at that head
- **AND** the response SHALL identify the branch, event range, checkpoint if used, reducer version, and resulting digest

#### Scenario: Full entity history spans owning streams
- **WHEN** an authorized viewer requests the full history of a unit instance across customization, campaign, mission, combat, and repair streams
- **THEN** the query SHALL return each referenced event once in deterministic authority and causality order
- **AND** each entry SHALL retain its owning stream, branch, command batch, and session or campaign scope

#### Scenario: Wall-clock collision does not change authority
- **WHEN** two events share the same timestamp
- **THEN** point-in-time resolution SHALL use branch, stream revision, and commit position rather than timestamp ordering alone

### Requirement: Branching Is Explicit and Domain-Resolved
Ordinary commands and their effects SHALL append to the current effective branch without creating forks. Only an authorized correction, rewind, or explicit simulation SHALL create a new branch from a recorded base. Branch activation SHALL use domain-specific validation and deterministic rebuild; the event store SHALL NOT perform a generic three-way merge.

#### Scenario: Normal player choice remains linear
- **WHEN** a player selects one legal movement or attack from several possible actions
- **THEN** the accepted command batch SHALL append to the effective branch
- **AND** the unchosen alternatives SHALL NOT become stored branches

#### Scenario: Explicit rewind creates a fork
- **WHEN** the GM commits an authorized rewind from a trusted prior head
- **THEN** the store SHALL create a replacement branch that references that base and preserves the prior branch unchanged

#### Scenario: Conflicting branch cannot auto-merge
- **WHEN** a replacement branch conflicts with later campaign or combat consequences
- **THEN** activation SHALL require the domain-specific rebuild and supersession contract
- **AND** no CRDT or generic Git-style merge SHALL silently combine the histories

### Requirement: Atomic Command Event Batches
The event store SHALL commit a command receipt, every event derived by that command, the resulting effective-head metadata, and recipient-neutral publication records in one transaction. Every event SHALL receive a contiguous revision in its owning stream and branch, a unique monotonically increasing server-only commit position, and a zero-based command index within the batch.

#### Scenario: Batch commit succeeds completely
- **WHEN** a command derives multiple combat or campaign events
- **THEN** the receipt, events, head update, and publication records SHALL become durable together with no interleaving from another command in the same owning stream
- **AND** the batch SHALL preserve command-index order without requiring an expected global database head

#### Scenario: Batch commit fails completely
- **WHEN** any write in the command batch fails or collides
- **THEN** the entire transaction SHALL roll back and no client-visible success SHALL be published

### Requirement: Command Receipts Persist for the Authority Lifetime
The event store SHALL retain stable command and idempotency receipts for the authoritative match or campaign lifetime so retries after reconnect or restart cannot repeat effects.

#### Scenario: Retry after restart finds receipt
- **WHEN** a client retries a command after the authority process restarts
- **THEN** the store SHALL return the prior receipt without appending another event batch

#### Scenario: Idempotency collision is detected
- **WHEN** an existing idempotency identity is reused with a different actor, branch, command kind, or payload digest
- **THEN** the store SHALL return an integrity conflict and SHALL not mutate the journal

### Requirement: Branches Preserve Immutable Supersession Lineage
The event store SHALL represent correction and rewind as append-only branches with parent, base stream revision, effective stream head, status, actor, reason, and supersession records. It SHALL NOT delete or rewrite prior authoritative events.

#### Scenario: Replacement branch preserves prior history
- **WHEN** the GM commits an authorized rewind
- **THEN** the store SHALL create a building branch from the selected base and SHALL retain the prior branch as immutable superseded history

#### Scenario: Branch activation is atomic
- **WHEN** deterministic rebuild and projection checks succeed
- **THEN** one transaction SHALL mark the replacement branch effective and the prior branch superseded

#### Scenario: Failed rebuild does not change effective head
- **WHEN** rebuild or verification fails
- **THEN** the candidate branch SHALL remain blocked and the prior effective branch SHALL remain authoritative

### Requirement: Checkpoints and Compaction Are Cache-Only
Trusted checkpoints SHALL be immutable projection caches keyed by stream, branch, stream revision, reducer version, and digest. Compaction SHALL NOT remove command receipts, authoritative events, branch lineage, supersession, outcome receipts, or audit facts.

#### Scenario: Compatible checkpoint accelerates rebuild
- **WHEN** a checkpoint's stream, branch, stream revision, reducer version, and digest match the requested replay base
- **THEN** the system MAY resume projection from the checkpoint and SHALL produce the same state and audience digests as full replay

#### Scenario: Incompatible checkpoint is not trusted
- **WHEN** a checkpoint has an incompatible reducer version or digest
- **THEN** recovery SHALL rebuild from an earlier trusted base or enter a truthful blocked state

### Requirement: Corrupt Authority Data Is Quarantined Per Session
Recovery SHALL validate stream-revision continuity, commit-position uniqueness, stream-scoped predecessor lineage, branch lineage, receipt uniqueness, and required digests before admitting commands or publication.

#### Scenario: One corrupt session is isolated
- **WHEN** validation fails for one match or campaign session
- **THEN** only that session SHALL enter a quarantined blocked state while healthy sessions remain available

#### Scenario: Quarantine publishes no partial recovery
- **WHEN** recovery detects corruption after reading part of a journal
- **THEN** the system SHALL publish no partially rebuilt baseline or tail for that session
