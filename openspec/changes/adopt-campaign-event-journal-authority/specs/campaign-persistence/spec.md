## ADDED Requirements

### Requirement: Campaign Snapshots Are Materialized Journal Projections
After campaign cutover, persisted campaign snapshots SHALL be rebuildable materializations of committed journal history rather than an independent write authority. Snapshot writes SHALL record the source branch, revision, projector version, deterministic schema/upcaster-pipeline fingerprint, and digest. A durable migration state and cutover marker SHALL identify the source snapshot revision/digest, imported baseline, compatible schema-pipeline fingerprint, and whether any journal-authority command has committed.

#### Scenario: Snapshot is stale
- **WHEN** a persisted snapshot trails the journal head
- **THEN** recovery SHALL apply the contiguous committed tail or rebuild from an earlier base
- **AND** it SHALL not overwrite newer journal history with the stale snapshot

#### Scenario: Replay pipeline changed without a projector-version change
- **WHEN** a snapshot's schema-pipeline fingerprint differs from the registered deterministic upcaster/target-schema pipeline
- **THEN** recovery SHALL discard the snapshot and rebuild from compatible journal history before fan-out
- **AND** a matching projector version or stored digest SHALL NOT make the stale materialization admissible

#### Scenario: Rollback reader is required
- **WHEN** application rollback occurs after journal rows exist
- **THEN** the rollback SHALL use a schema-compatible reader and stop unsafe new admission
- **AND** it SHALL not delete or rewrite journal history

#### Scenario: Snapshot rollback is requested before first journal command
- **WHEN** the journal head still equals its imported baseline
- **THEN** an audited rollback MAY restore the compatible legacy reader
- **AND** the migration marker and journal rows SHALL remain intact

#### Scenario: Snapshot rollback is requested after journal authority wrote
- **WHEN** any journal-authority command committed after the imported baseline
- **THEN** snapshot-authority fallback SHALL be prohibited
- **AND** the campaign SHALL use a compatible journal reader or enter a truthful blocked state
