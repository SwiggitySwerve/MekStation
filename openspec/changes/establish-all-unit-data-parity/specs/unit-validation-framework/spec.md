## MODIFIED Requirements

### Requirement: Vehicle Category Validation Rules

The system SHALL provide validation rules for Vehicle category units (Vehicle, VTOL, SupportVehicle).

#### Scenario: VAL-VEH-001 Engine Required

- **WHEN** validating any Vehicle category unit
- **THEN** unit SHALL have an engine configured
- **AND** missing engine SHALL produce CRITICAL_ERROR
- **AND** error message SHALL be "Engine required"

#### Scenario: VAL-VEH-002 Motive System Required

- **WHEN** validating any Vehicle category unit
- **THEN** unit SHALL have a motive system type (Wheeled, Tracked, Hover, WiGE, Naval, VTOL)
- **AND** missing motive system SHALL produce CRITICAL_ERROR
- **AND** error message SHALL be "Motive system type required"

#### Scenario: Retired VAL-VEH-003 turret capacity rule

- **WHEN** validating any vehicle category unit, including one with legacy turret `capacity` and `usedWeight` values
- **THEN** `VAL-VEH-003` SHALL NOT be registered or exported and no generic turret-capacity error SHALL be reported
- **AND** total vehicle weight validation SHALL continue to reject allocated weight above the vehicle tonnage

#### Scenario: VAL-VEH-004 VTOL Rotor Required

- **WHEN** validating a VTOL unit
- **THEN** unit SHALL have a rotor system
- **AND** missing rotor SHALL produce CRITICAL_ERROR
- **AND** error message SHALL be "VTOL requires rotor system"

#### Scenario: VAL-VEH-005 Vehicle Tonnage Range

- **WHEN** validating any Vehicle category unit
- **THEN** tonnage SHALL be within valid range for the vehicle type and motion type
- **AND** the maximum SHALL come from `getVehicleMaxTonnage`, the owner the vehicle handlers use
  (`TestTank.java:132-141`, `TestSupportVehicle.java:87-107`)
- **AND** Vehicle: 1 ton (`getVehicleMinTonnage`) to the superheavy maximum where MegaMek loads the motion type as
  superheavy, otherwise the ordinary maximum (Tracked 1-200, Hover 1-100, Rail 1-100 tons)
- **AND** VTOL: 1-60 tons
- **AND** SupportVehicle: 0.001 ton (`getVehicleMinTonnage`; `TestSupportVehicle` has no 1-ton
  floor) to the SVType maximum (Wheeled 0.001-160, Rail 0.001-600 tons)
- **AND** invalid tonnage SHALL produce CRITICAL_ERROR

## ADDED Requirements

### Requirement: Introductory BattleMech ammunition legality

BattleMech validation SHALL reject mounted ammunition whose rules level exceeds
an Introductory BattleMech or OmniMech's rules level. Each illegal bin SHALL
produce an error naming the ammunition through the public unit validator.
Loading SHALL retain the invalid design and its source facts.
This rule SHALL NOT introduce ammunition restrictions for higher-level units,
treat non-ammunition as ammunition, or infer legality for missing definitions.

#### Scenario: Javelin box-set ammunition is illegal

- **GIVEN** the pinned Javelin JVN-10U with Introductory rules and two SRT 6 ammo bins
- **WHEN** the public unit validator validates the design
- **THEN** `VAL-BM-012` SHALL report an error for each SRT 6 ammo bin
- **AND** construction validity SHALL be false while the design remains loadable

#### Scenario: Introductory ammunition meets the boundary

- **GIVEN** an Introductory BattleMech or OmniMech with Introductory ammunition
- **WHEN** the public unit validator validates the design
- **THEN** `VAL-BM-012` SHALL NOT report an ammunition tech-level error

#### Scenario: Other validation concerns retain their owners

- **GIVEN** a higher-level unit, non-ammunition equipment, an empty loadout, or missing equipment definitions
- **WHEN** the public unit validator validates the design
- **THEN** `VAL-BM-012` SHALL NOT add an ammunition tech-level error for those cases
- **AND** other validation rules SHALL retain their existing behavior

Authority: MegaMek `48fcb2f64` `TestEntity.java:1271-1286`, invoked by
`TestMek.java:766`; mm-data `50f7efe` Javelin JVN-10U.

### Requirement: Shared BattleMech structure mass

BattleMech construction and weight-validation consumers SHALL obtain structure mass from the construction owner, retaining the existing component multipliers and half-ton ceiling. This consolidation SHALL preserve admission rules, fallback results, critical slots and numerical output.

#### Scenario: Existing structure types retain their mass

- **WHEN** the editor, validation helpers or construction calculator evaluates an existing structure type at ordinary or superheavy tonnage
- **THEN** each SHALL use the shared structure-mass calculation
- **AND** every resulting component and total weight SHALL equal its value before consolidation

#### Scenario: Unknown structure admission remains with the caller

- **WHEN** an unknown structure type reaches the construction installation step
- **THEN** the step SHALL retain its error and zero weight
- **AND** the other existing mass consumers SHALL retain their Standard-weight fallback
