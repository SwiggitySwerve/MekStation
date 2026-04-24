# protomech-unit-system (delta)

## MODIFIED Requirements

### Requirement: Scope — Full BV Calculation Included

ProtoMech construction SHALL include full BV 2.0 calculation (previously scoped as simplified only).

#### Scenario: Full proto BV supported

- **GIVEN** any legally constructed ProtoMech
- **WHEN** `calculateBattleValue` runs
- **THEN** the full BV 2.0 proto formula SHALL be applied (defensive + offensive, chassis multiplier, pilot adjustment)
- **AND** the legacy simplified formula SHALL no longer be used

## ADDED Requirements

### Requirement: ProtoMech BV Breakdown on Unit State

Every ProtoMech SHALL carry an `IProtoMechBVBreakdown` populated by the calculator.

#### Scenario: Breakdown shape

- **GIVEN** a ProtoMech after construction completes
- **WHEN** BV is computed
- **THEN** `unit.bvBreakdown` SHALL contain `defensive`, `offensive`, `chassisMultiplier`, `pilotMultiplier`, `final`

### Requirement: Proto Point BV Aggregation

The system SHALL support aggregating up to 5 proto BVs into a point BV for force-level reporting.

#### Scenario: Point aggregation

- **GIVEN** a point of 5 protos with BVs 250, 300, 275, 290, 310
- **WHEN** point BV is computed
- **THEN** point BV SHALL equal the sum = 1425
- **AND** the aggregate SHALL be displayed in force-level tools (not used during combat dispatch)
