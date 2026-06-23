## ADDED Requirements

### Requirement: Combat Catalog QC Gate

The system SHALL expose an on-demand QC gate for BattleMech combat catalog/rules parity that validates the current QC registry surfaces, command wiring, source anchors, active-change freshness, unresolved gap baseline, and explicit non-BattleMech out-of-scope split.

#### Scenario: QC gate proves current combat catalog evidence routing
- **WHEN** `npm.cmd run qc:combat:catalog-rules:validate` runs
- **THEN** it validates the required combat catalog, behavior-class, runner/interactive, physical-boundary, non-BattleMech scope, and known-gap honesty QC surfaces
- **AND** it confirms required claim IDs, command tokens, source anchors, and expected out-of-scope totals are present

#### Scenario: Stale catalog evidence fails fast
- **WHEN** a combat QC surface references an archived or missing OpenSpec change as active work
- **OR** the expected non-BattleMech out-of-scope count drifts from the current 147-row contract
- **OR** a required catalog/rules source anchor is missing
- **THEN** the QC gate fails with a concrete diagnostic before broader `verify:rules` claims can pass

#### Scenario: Rules verification includes catalog QC
- **WHEN** `npm.cmd run verify:rules` runs
- **THEN** it runs the combat catalog QC gate
- **AND** it separately asserts zero unresolved BattleMech gaps, the 147-row non-BattleMech out-of-scope split, the combat validation suite, spec purpose lint, and strict OpenSpec validation
