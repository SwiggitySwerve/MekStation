## ADDED Requirements

### Requirement: Authority Events Have One Owning Stream and Explicit Entity Links
Every authoritative event SHALL be stored once in one owning stream with stable event, stream, branch, command, correlation, causation, schema-version, stream-revision, commit-position, command-index, actor, authority, and timestamp identities. The journal SHALL index every affected durable entity instance by type, ID, and role without treating display names, route parameters, canonical templates, or content hashes as entity identity.

#### Scenario: Customized unit history crosses domains
- **WHEN** a customized unit instance is adopted into a campaign, assigned to a mission, and used in combat
- **THEN** each authoritative event SHALL remain stored in its owning stream
- **AND** entity links SHALL let an authorized query return each linked event once for the same durable unit-instance ID

#### Scenario: Unrelated streams write independently
- **WHEN** two unrelated campaign or match streams append concurrently
- **THEN** each stream SHALL compare only its own expected revision
- **AND** the shared commit position SHALL order observation without becoming a global write head

### Requirement: Command Event Batches Append Atomically at an Expected Revision
The journal SHALL accept an ordered event batch with an expected stream revision and stable command identity. In one transaction it SHALL verify the head, persist an idempotent command receipt, assign contiguous stream revisions and command indexes, assign unique commit positions, insert entity links, and advance the head.

#### Scenario: Multi-event command commits
- **WHEN** a command derives more than one event and the expected revision matches
- **THEN** every event and link SHALL commit without interleaving from another command in that stream
- **AND** a retry with the same command identity and payload digest SHALL return the original receipt without another append

#### Scenario: Revision or identity collision
- **WHEN** the expected revision is stale or an existing command identity is reused with different content
- **THEN** the journal SHALL reject the batch
- **AND** no event, link, receipt, or head update from that attempt SHALL persist

### Requirement: Journal Adapters Pass One Conformance Contract
Every journal adapter SHALL pass the same executable contract for ordering, atomicity, idempotency, entity queries, restart recovery, and failure rollback. The initial durable adapter SHALL use the repository SQLite stack without adding another service.

#### Scenario: SQLite restarts after committed batch
- **WHEN** the SQLite adapter commits a batch and the process restarts
- **THEN** the stream, receipt, entity links, and head SHALL recover identically
- **AND** a fresh append SHALL continue at the next contiguous revision

#### Scenario: Legacy snapshot has no recorded history
- **WHEN** snapshot-only state is introduced to a journal-backed aggregate
- **THEN** migration SHALL record an explicit imported baseline with source metadata
- **AND** it SHALL NOT fabricate historical domain events
