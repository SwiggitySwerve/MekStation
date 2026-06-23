## ADDED Requirements

### Requirement: Campaign Correction QC Coverage Matrix

The campaign intervention boundary SHALL expose a QC coverage matrix for supported post-combat/base-economy GM correction domains and families.

#### Scenario: Supported domains remain represented

- **WHEN** the campaign ledger QC validator runs
- **THEN** it SHALL verify registered support for `post-combat`, `economy`, `repair`, and `salvage`
- **AND** missing support for any represented domain SHALL fail validation with a targeted reason

#### Scenario: Supported correction families remain represented

- **WHEN** the campaign ledger QC validator runs
- **THEN** it SHALL verify salvage allocation, repair ticket, funds transaction, inventory lot, and base unit state correction families
- **AND** missing support for any represented family SHALL fail validation with a targeted reason
