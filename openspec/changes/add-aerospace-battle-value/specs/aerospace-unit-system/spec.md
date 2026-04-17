# aerospace-unit-system (delta)

## ADDED Requirements

### Requirement: Aerospace BV Breakdown on Unit State

Every `IAerospaceUnit` SHALL carry an `IAerospaceBVBreakdown`.

#### Scenario: Breakdown shape

- **GIVEN** an aerospace unit after construction completes
- **WHEN** BV is computed
- **THEN** `unit.bvBreakdown` SHALL contain at minimum `defensive`, `offensive`, `pilotMultiplier`, `arcContributions`, `final`

#### Scenario: Arc contributions exposed

- **GIVEN** an ASF with 200 BV in Nose, 100 BV in each Wing, 50 in Aft
- **WHEN** arc contributions are computed
- **THEN** the breakdown SHALL include per-arc percentage and weighted BV
- **AND** the status bar SHALL display the primary-arc label

### Requirement: Aerospace BV Parity Harness

The validation tooling SHALL produce an aerospace BV parity report.

#### Scenario: Validator output

- **WHEN** the aerospace BV validator runs
- **THEN** it SHALL emit `validation-output/aerospace-bv-validation-report.json`
- **AND** the report SHALL list each fighter with `computedBV`, `mulBV`, `delta`, `deltaPct`
