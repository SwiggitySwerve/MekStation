# battle-armor-unit-system (delta)

## MODIFIED Requirements

### Requirement: Scope — BV Calculation Included

BA construction SHALL include full BV 2.0 calculation (previously scoped as simplified only).

#### Scenario: Full BA BV supported

- **GIVEN** any legally constructed BA squad
- **WHEN** `calculateBattleValue` runs
- **THEN** the full BV 2.0 BA formula SHALL be applied (per-trooper defensive + offensive, squad scaled, pilot adjusted)
- **AND** the legacy simplified formula SHALL no longer be used

## ADDED Requirements

### Requirement: BA BV Breakdown on Unit State

Every BA squad SHALL carry an `IBABreakdown` populated by the calculator.

#### Scenario: Breakdown shape

- **GIVEN** a BA squad after construction completes
- **WHEN** BV is computed
- **THEN** `unit.bvBreakdown` SHALL contain `perTrooper.defensive`, `perTrooper.offensive`, `squadTotal`, `pilotMultiplier`, `final`

#### Scenario: Breakdown recomputed on edit

- **GIVEN** an existing squad with BV 500
- **WHEN** the user adds an SRM-2 to each trooper
- **THEN** `unit.bvBreakdown.perTrooper.offensive` SHALL increase
- **AND** `unit.bvBreakdown.final` SHALL update live

### Requirement: BA BV Parity Harness

The validation tooling SHALL produce a BA BV parity report.

#### Scenario: Validator output

- **WHEN** the BA BV validator runs
- **THEN** it SHALL emit `validation-output/battle-armor-bv-validation-report.json`
- **AND** the report SHALL list each squad with `computedBV`, `mulBV`, `delta`, `deltaPct`
