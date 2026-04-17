# vehicle-unit-system (delta)

## ADDED Requirements

### Requirement: Vehicle BV Breakdown on Unit State

Every `IVehicleUnit` SHALL carry an `IVehicleBVBreakdown` populated by the calculator.

#### Scenario: Breakdown shape

- **GIVEN** a vehicle after construction completes
- **WHEN** BV is computed
- **THEN** `unit.bvBreakdown` SHALL contain at minimum: `defensive`, `offensive`, `pilotMultiplier`, `turretModifier`, `final`

#### Scenario: Breakdown recomputed on construction edit

- **GIVEN** an existing vehicle with BV 1100
- **WHEN** the user adds 6 tons of weapons via the equipment tab
- **THEN** `unit.bvBreakdown.offensive` SHALL increase
- **AND** `unit.bvBreakdown.final` SHALL update live

### Requirement: BV Parity Harness for Vehicles

The validation tooling SHALL produce a vehicle BV parity report.

#### Scenario: Vehicle validation report

- **WHEN** the vehicle BV validator runs
- **THEN** it SHALL emit `validation-output/vehicle-bv-validation-report.json`
- **AND** the report SHALL include per-unit: `unitName`, `computedBV`, `mulBV`, `delta`, `deltaPct`
