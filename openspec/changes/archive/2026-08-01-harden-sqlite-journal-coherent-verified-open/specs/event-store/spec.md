## ADDED Requirements

### Requirement: Verified SQLite Opening Uses One Coherent Snapshot

Verified SQLite journal opening SHALL execute every storage-integrity read against one explicit read snapshot owned by the factory. The borrowed handle SHALL be idle when opening starts, the transaction callback MUST remain synchronous, and the factory SHALL end its transaction before returning the adapter or a typed recovery failure. Verification SHALL observe either the complete committed state before a concurrent command batch or the complete committed state after it; it SHALL NOT combine rows from both states. The adapter SHALL remain unwired from production authority until its later adoption changes complete.

#### Scenario: Another connection commits after snapshot capture

- **WHEN** verified opening pins a read snapshot and a second WAL connection commits a valid command batch before verification finishes
- **THEN** every high-water, event, link, causation, head, and receipt check SHALL use the pinned pre-commit snapshot
- **AND** opening SHALL NOT reject the healthy database because of a hybrid view
- **AND** a later fresh opening SHALL verify the complete post-commit state

#### Scenario: Corruption exists inside the captured snapshot

- **WHEN** the captured snapshot contains an invalid digest, predecessor, receipt membership, stream head, observation position, normalized link set, causation set, or high-water value
- **THEN** verified opening SHALL fail closed with the typed recovery error
- **AND** no adapter or partial projection SHALL be returned

#### Scenario: Factory-owned transaction finishes

- **WHEN** verified opening succeeds or fails after starting its read transaction
- **THEN** the factory SHALL leave no active transaction or reader lock on the borrowed handle
- **AND** the connection owner SHALL retain responsibility for checkpointing and closing the handle

#### Scenario: Borrowed handle already has an active transaction

- **WHEN** trusted code requests verified opening on a handle with an active caller-owned transaction
- **THEN** the factory SHALL reject before performing integrity reads
- **AND** it SHALL NOT commit or roll back the caller-owned transaction
