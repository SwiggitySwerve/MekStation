## ADDED Requirements

### Requirement: Time Cascade QC Coverage Matrix

The campaign intervention boundary SHALL expose a QC coverage matrix for the supported time-cascade GM correction domain and family.

#### Scenario: Supported time domain remains represented

- **WHEN** the time-cascade QC validator runs
- **THEN** it SHALL verify registered support for `time`
- **AND** missing support for the represented domain SHALL fail validation with a targeted reason

#### Scenario: Supported time correction family remains represented

- **WHEN** the time-cascade QC validator runs
- **THEN** it SHALL verify `time-advance` correction-family coverage
- **AND** missing support for the represented family SHALL fail validation with a targeted reason

#### Scenario: Safe mutable roots remain represented

- **WHEN** the time-cascade QC validator runs
- **THEN** it SHALL verify anchors for date, travel, repair, contract, market, finance, and campaign-owned unit-state roots
- **AND** it SHALL verify external-store effects remain explicit projected effects or manual-takeover conflicts
