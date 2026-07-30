## ADDED Requirements

### Requirement: Coordinated Outcome Correction Is a Recoverable Saga
After a campaign accepts an outcome receipt, correction SHALL use a higher outcome version and two durable local transactions rather than claim cross-store atomicity. The source activation transaction SHALL commit the new effective branch, correction and supersession facts, invalidation metadata, `pending` saga state, and a replacement outbox containing the immutable canonical command bytes, digest, command schema version, and canonicalizer version required by the effect-receipt contract. Only then may the replacement outbox dispatch. The target transaction SHALL idempotently commit the target-scoped replacement receipt and deterministic consequence batch. The operation SHALL expose durable `pending`, `retrying`, `blocked`, and `applied` states and SHALL gate cross-stream progression while the two authorities differ.

#### Scenario: Source activation commits before target is available
- **WHEN** the combat authority activates a higher-version correction while campaign ingestion is unavailable
- **THEN** the new source branch, correction, replacement outbox, and pending saga SHALL remain committed
- **AND** campaign reconciliation SHALL show pending or blocked without claiming completion

#### Scenario: Accepted prior receipt is replaced without deadlock
- **WHEN** source activation follows a known accepted prior receipt
- **THEN** the replacement outbox SHALL become dispatchable from the newly effective generation
- **AND** target receipt and consequence application SHALL advance the durable saga to `applied` exactly once

#### Scenario: Target acknowledgement is lost
- **WHEN** the campaign commits the replacement receipt and consequence batch but the acknowledgement is lost
- **THEN** redelivery SHALL return the same target-scoped receipt
- **AND** replacement consequences SHALL not apply again

#### Scenario: Process restarts during correction
- **WHEN** either authority restarts after source activation but before the correction reaches `applied`
- **THEN** durable saga state SHALL resume from the persisted command bytes or expose a typed blocked condition
- **AND** scenario progression SHALL remain blocked until the active receipt and projections converge

#### Scenario: Stored correction version is unsupported
- **WHEN** recovery cannot interpret the persisted command schema or canonicalizer version
- **THEN** the saga SHALL enter `blocked` with no target mutation
- **AND** it SHALL not regenerate command material from a mutable projection
