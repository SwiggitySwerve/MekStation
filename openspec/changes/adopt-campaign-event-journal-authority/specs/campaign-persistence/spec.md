## ADDED Requirements

### Requirement: Campaign Snapshots Are Materialized Journal Projections
After campaign cutover, persisted campaign snapshots SHALL be rebuildable materializations of committed journal history rather than an independent write authority. Snapshot writes SHALL record the source branch, revision, projector version, and digest.

#### Scenario: Snapshot is stale
- **WHEN** a persisted snapshot trails the journal head
- **THEN** recovery SHALL apply the contiguous committed tail or rebuild from an earlier base
- **AND** it SHALL not overwrite newer journal history with the stale snapshot

#### Scenario: Rollback reader is required
- **WHEN** application rollback occurs after journal rows exist
- **THEN** the rollback SHALL use a schema-compatible reader and stop unsafe new admission
- **AND** it SHALL not delete or rewrite journal history
