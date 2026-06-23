## ADDED Requirements

### Requirement: Time Cascade Day Processor QC Coverage

The day progression system SHALL expose command-backed QC proof for the day processors and campaign roots used by GM time-cascade projection. The proof SHALL cover repair progress, contracts, daily costs, unit market, personnel market, and contract market processors, plus the campaign roots whose changes are exposed through time-cascade changed-state references.

#### Scenario: Validator proves time-cascade day processors

- **WHEN** the time-cascade QC validator runs
- **THEN** it SHALL verify anchors for repair progress, contract, daily costs, unit market, personnel market, and contract market processors
- **AND** it SHALL verify focused day-processor tests for contract, daily cost, repair progress, and market behavior

#### Scenario: Validator proves campaign roots

- **WHEN** the time-cascade QC validator runs
- **THEN** it SHALL verify the time-cascade proof covers campaign date, current system, repair queue, parts inventory, unit combat state, finances, missions, loans, unit market, personnel market, and contract market roots
