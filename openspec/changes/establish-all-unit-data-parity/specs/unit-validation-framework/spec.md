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

#### Scenario: VAL-VEH-003 Turret Capacity Limits

- **WHEN** validating a Vehicle with turret
- **THEN** turret equipment weight SHALL not exceed turret capacity
- **AND** turret overflow SHALL produce ERROR
- **AND** error message SHALL be "Turret capacity exceeded by {diff} tons"

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
