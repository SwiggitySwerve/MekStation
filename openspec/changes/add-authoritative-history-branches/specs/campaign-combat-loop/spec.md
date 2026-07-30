## ADDED Requirements

### Requirement: Coordinated Outcome Correction Is a Recoverable Saga
After a campaign accepts an outcome receipt, correction SHALL use a higher outcome version and two durable local transactions rather than claim cross-store atomicity. The source transaction SHALL commit correction and supersession facts, invalidation metadata, and a replacement outbox containing the immutable canonical command bytes, digest, command schema version, and canonicalizer version required by the effect-receipt contract. The target transaction SHALL idempotently commit the target-scoped replacement receipt and deterministic consequence batch. The operation SHALL expose durable `pending`, `retrying`, `blocked`, and `applied` states.

#### Scenario: Source correction commits before target is available
- **WHEN** the combat authority commits a higher-version correction while campaign ingestion is unavailable
- **THEN** the source correction and replacement outbox SHALL remain committed
- **AND** campaign reconciliation SHALL show pending or blocked without claiming completion

#### Scenario: Target acknowledgement is lost
- **WHEN** the campaign commits the replacement receipt and consequence batch but the acknowledgement is lost
- **THEN** redelivery SHALL return the same target-scoped receipt
- **AND** replacement consequences SHALL not apply again

#### Scenario: Process restarts during correction
- **WHEN** either authority restarts before the correction reaches `applied`
- **THEN** durable saga state SHALL resume from the persisted command bytes or expose a typed blocked condition
- **AND** scenario progression SHALL remain blocked until the active receipt and projections converge

#### Scenario: Stored correction version is unsupported
- **WHEN** recovery cannot interpret the persisted command schema or canonicalizer version
- **THEN** the saga SHALL enter `blocked` with no target mutation
- **AND** it SHALL not regenerate command material from a mutable projection
