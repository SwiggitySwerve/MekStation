# infantry-unit-system (delta)

## ADDED Requirements

### Requirement: Infantry BV Breakdown on Unit State

Every infantry platoon SHALL carry an `IInfantryBVBreakdown` populated by the calculator.

#### Scenario: Breakdown shape

- **GIVEN** an infantry platoon after construction completes
- **WHEN** BV is computed
- **THEN** `unit.bvBreakdown` SHALL contain `perTrooper`, `motiveMultiplier`, `antiMechMultiplier`, `fieldGunBV`, `platoonBV`, `pilotMultiplier`, `final`

#### Scenario: Breakdown live update

- **GIVEN** an existing platoon with BV 420
- **WHEN** the user toggles Anti-Mech training on
- **THEN** `unit.bvBreakdown.antiMechMultiplier` SHALL become 1.1
- **AND** `unit.bvBreakdown.final` SHALL update live

### Requirement: Infantry BV Parity Harness

The validation tooling SHALL produce an infantry BV parity report.

#### Scenario: Validator output

- **WHEN** the infantry BV validator runs
- **THEN** it SHALL emit `validation-output/infantry-bv-validation-report.json`
- **AND** the report SHALL list each platoon with `computedBV`, `mulBV`, `delta`, `deltaPct`
