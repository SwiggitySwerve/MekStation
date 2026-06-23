## ADDED Requirements

### Requirement: Long Campaign QC Protection Gate
The journey QC system SHALL protect the long-campaign stability lane with a dedicated metadata validator and global verification wiring. The validator MUST confirm that `verify:qc` runs `verify:qc:campaign-long`, that `verify:qc:campaign-long` runs both the metadata validator and the 10-contract, 2-run stability command, that the QC registry exposes a first-class `long-campaign-stability` surface with claim `campaign.long-stability`, that `campaign-long` catalog bounds are 6-10 contracts, that the gameplay UI flow points at the stability command, that validation graph nodes expose the stability and verification commands, and that stale OpenSpec active refs fail validation.

#### Scenario: Global QC includes long-campaign stability
- **WHEN** the operator runs `npm.cmd run verify:qc`
- **THEN** the global QC command runs `npm.cmd run verify:qc:campaign-long`
- **AND** `verify:qc:campaign-long` validates long-campaign metadata before running `qc:campaign-long:stability -- --seed=42 --contracts=10 --runs=2`

#### Scenario: Metadata validator catches orphaned coverage
- **WHEN** `npm.cmd run qc:campaign-long:validate` runs
- **THEN** it fails if the long-campaign registry surface, package script wiring, journey catalog bounds, UI flow command, validation graph nodes, source anchors, or active OpenSpec refs drift away from the long-campaign stability contract

#### Scenario: Catalog contract matches stability command
- **WHEN** the journey catalog is validated for `campaign-long`
- **THEN** the `contracts` parameter declares an integer minimum of 6 and maximum of 10
- **AND** the stability command still rejects values outside that range before claiming stability
