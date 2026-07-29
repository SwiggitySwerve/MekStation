## ADDED Requirements

### Requirement: Atomic Command Event Batches
The event store SHALL commit a command receipt, every event derived by that command, the resulting effective-head metadata, and recipient-neutral publication records in one transaction with a contiguous server-only authority sequence.

#### Scenario: Batch commit succeeds completely
- **WHEN** a command derives multiple combat or campaign events
- **THEN** the receipt, events, head update, and publication records SHALL become durable together with no interleaving from another command

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
The event store SHALL represent correction and rewind as append-only branches with parent, base authority sequence, effective head, status, actor, reason, and supersession records. It SHALL NOT delete or rewrite prior authoritative events.

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
Trusted checkpoints SHALL be immutable projection caches keyed by branch, authority head, reducer version, and digest. Compaction SHALL NOT remove command receipts, authoritative events, branch lineage, supersession, outcome receipts, or audit facts.

#### Scenario: Compatible checkpoint accelerates rebuild
- **WHEN** a checkpoint's branch, head, reducer version, and digest match the requested replay base
- **THEN** the system MAY resume projection from the checkpoint and SHALL produce the same state and audience digests as full replay

#### Scenario: Incompatible checkpoint is not trusted
- **WHEN** a checkpoint has an incompatible reducer version or digest
- **THEN** recovery SHALL rebuild from an earlier trusted base or enter a truthful blocked state

### Requirement: Corrupt Authority Data Is Quarantined Per Session
Recovery SHALL validate authority-sequence continuity, branch lineage, receipt uniqueness, and required digests before admitting commands or publication.

#### Scenario: One corrupt session is isolated
- **WHEN** validation fails for one match or campaign session
- **THEN** only that session SHALL enter a quarantined blocked state while healthy sessions remain available

#### Scenario: Quarantine publishes no partial recovery
- **WHEN** recovery detects corruption after reading part of a journal
- **THEN** the system SHALL publish no partially rebuilt baseline or tail for that session
