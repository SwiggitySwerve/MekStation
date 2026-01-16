# unit-validation-framework Specification

## Purpose
TBD - created by archiving change add-comprehensive-unit-validation-framework. Update Purpose after archive.
## Requirements
### Requirement: Validation Hierarchy

The system SHALL implement a four-level validation hierarchy for unit validation.

#### Scenario: Universal rules apply to all units
- **WHEN** validating any unit regardless of type
- **THEN** universal validation rules (VAL-UNIV-*) SHALL execute
- **AND** results SHALL be included in validation output

#### Scenario: Category rules apply to unit category
- **WHEN** validating a unit of type BattleMech, OmniMech, IndustrialMech, or ProtoMech
- **THEN** Mech category rules (VAL-MECH-*) SHALL execute
- **AND** results SHALL be included in validation output

#### Scenario: Unit-type rules apply to specific type
- **WHEN** validating a BattleMech specifically
- **THEN** BattleMech-specific rules (VAL-BM-*) SHALL execute
- **AND** results SHALL be included in validation output

#### Scenario: Rule execution order
- **WHEN** running full validation
- **THEN** rules SHALL execute in order: universal, category, unit-type
- **AND** within each level, rules SHALL execute by priority (ascending)

---

### Requirement: Unit Type Registry

The system SHALL maintain a registry mapping unit types to their validation rule sets.

#### Scenario: Registry provides rules for unit type
- **WHEN** requesting validation rules for UnitType.BATTLEMECH
- **THEN** registry SHALL return universal rules
- **AND** registry SHALL return Mech category rules
- **AND** registry SHALL return BattleMech-specific rules

#### Scenario: Registry handles unknown unit types
- **WHEN** requesting rules for an unknown unit type
- **THEN** registry SHALL return only universal rules
- **AND** registry SHALL log a warning

#### Scenario: Registry caches resolved rule sets
- **WHEN** requesting rules for the same unit type multiple times
- **THEN** registry SHOULD return cached result
- **AND** cache SHALL invalidate when rules are registered/unregistered

---

### Requirement: Rule Inheritance

The system SHALL support rule inheritance with override and extend capabilities.

#### Scenario: Rule override replaces parent rule
- **GIVEN** a universal rule VAL-UNIV-008 (Weight Non-Negative)
- **AND** a unit-type rule VAL-BM-008 that overrides VAL-UNIV-008
- **WHEN** validating a BattleMech
- **THEN** only VAL-BM-008 SHALL execute
- **AND** VAL-UNIV-008 SHALL be skipped

#### Scenario: Rule extension adds to parent rule
- **GIVEN** a category rule VAL-MECH-006 (Exact Weight Match)
- **AND** a unit-type rule VAL-BM-006 that extends VAL-MECH-006
- **WHEN** validating a BattleMech
- **THEN** VAL-MECH-006 SHALL execute first
- **AND** VAL-BM-006 SHALL execute after
- **AND** both results SHALL be combined

#### Scenario: Inheritance chain resolution
- **GIVEN** rules at universal, category, and unit-type levels
- **WHEN** resolving inheritance
- **THEN** unit-type rules take precedence over category rules
- **AND** category rules take precedence over universal rules

---

### Requirement: Universal Validation Rules

The system SHALL provide validation rules that apply to ALL unit types.

#### Scenario: VAL-UNIV-001 Entity ID Required
- **WHEN** validating any unit
- **THEN** unit SHALL have non-empty id
- **AND** empty or whitespace-only id SHALL produce ERROR
- **AND** error message SHALL be "Entity must have non-empty id"

#### Scenario: VAL-UNIV-002 Entity Name Required
- **WHEN** validating any unit
- **THEN** unit SHALL have non-empty name
- **AND** empty or whitespace-only name SHALL produce ERROR
- **AND** error message SHALL be "Entity must have non-empty name"

#### Scenario: VAL-UNIV-003 Valid Unit Type
- **WHEN** validating any unit
- **THEN** unit type SHALL be valid UnitType enum value
- **AND** invalid unit type SHALL produce ERROR
- **AND** error message SHALL be "Unit type must be valid UnitType enum value"

#### Scenario: VAL-UNIV-004 Tech Base Required
- **WHEN** validating any unit
- **THEN** unit SHALL have tech base (INNER_SPHERE, CLAN, or MIXED)
- **AND** missing tech base SHALL produce ERROR
- **AND** error message SHALL be "Unit must have a valid tech base"

#### Scenario: VAL-UNIV-005 Rules Level Required
- **WHEN** validating any unit
- **THEN** unit SHALL have valid rules level
- **AND** invalid rules level SHALL produce ERROR
- **AND** error message SHALL be "Unit must have a valid rules level"

#### Scenario: VAL-UNIV-006 Introduction Year Valid
- **WHEN** validating any unit
- **THEN** introduction year SHALL be within BattleTech timeline (2005-3250)
- **AND** year outside range SHALL produce ERROR
- **AND** error message SHALL be "Introduction year must be between 2005 and 3250"

#### Scenario: VAL-UNIV-007 Temporal Consistency
- **WHEN** validating any unit with extinction year
- **THEN** extinction year SHALL be after introduction year
- **AND** temporal inconsistency SHALL produce ERROR
- **AND** error message SHALL be "Extinction year must be after introduction year"

#### Scenario: VAL-UNIV-008 Weight Non-Negative
- **WHEN** validating any unit
- **THEN** weight SHALL be finite and non-negative
- **AND** negative or non-finite weight SHALL produce ERROR
- **AND** error message SHALL be "Unit weight must be a non-negative finite number"

#### Scenario: VAL-UNIV-009 Cost Non-Negative
- **WHEN** validating any unit
- **THEN** cost SHALL be finite and non-negative
- **AND** negative or non-finite cost SHALL produce ERROR
- **AND** error message SHALL be "Unit cost must be a non-negative finite number"

#### Scenario: VAL-UNIV-010 Battle Value Non-Negative
- **WHEN** validating any unit
- **THEN** battle value SHALL be finite and non-negative
- **AND** negative or non-finite BV SHALL produce ERROR
- **AND** error message SHALL be "Battle value must be a non-negative finite number"

#### Scenario: VAL-UNIV-011 Era Availability
- **GIVEN** a campaign year is specified in validation context
- **WHEN** validating any unit
- **THEN** unit introduction year SHALL be <= campaign year
- **AND** unit extinction year (if present) SHALL be > campaign year
- **AND** unavailable unit SHALL produce ERROR
- **AND** error message SHALL be "{Unit} not available in year {campaignYear}"

#### Scenario: VAL-UNIV-012 Rules Level Compliance
- **GIVEN** a rules level filter is specified in validation context
- **WHEN** validating any unit
- **THEN** unit rules level SHALL not exceed filter
- **AND** non-compliant unit SHALL produce ERROR
- **AND** error message SHALL be "Unit rules level {level} exceeds allowed level {filter}"

---

### Requirement: Mech Category Validation Rules

The system SHALL provide validation rules for Mech category units (BattleMech, OmniMech, IndustrialMech, ProtoMech).

#### Scenario: VAL-MECH-001 Engine Required
- **WHEN** validating any Mech category unit
- **THEN** unit SHALL have an engine configured
- **AND** missing engine SHALL produce CRITICAL_ERROR
- **AND** error message SHALL be "Engine required"

#### Scenario: VAL-MECH-002 Gyro Required
- **WHEN** validating BattleMech, OmniMech, or IndustrialMech
- **THEN** unit SHALL have a gyro configured
- **AND** missing gyro SHALL produce CRITICAL_ERROR
- **AND** error message SHALL be "Gyro required"
- **AND** rule SHALL NOT apply to ProtoMech

#### Scenario: VAL-MECH-003 Cockpit Required
- **WHEN** validating any Mech category unit
- **THEN** unit SHALL have a cockpit configured
- **AND** missing cockpit SHALL produce CRITICAL_ERROR
- **AND** error message SHALL be "Cockpit required"

#### Scenario: VAL-MECH-004 Internal Structure Required
- **WHEN** validating any Mech category unit
- **THEN** unit SHALL have internal structure type selected
- **AND** missing structure SHALL produce CRITICAL_ERROR
- **AND** error message SHALL be "Internal structure required"

#### Scenario: VAL-MECH-005 Minimum Heat Sinks
- **WHEN** validating BattleMech or OmniMech
- **THEN** unit SHALL have at least 10 heat sinks
- **AND** insufficient heat sinks SHALL produce CRITICAL_ERROR
- **AND** error message SHALL be "Unit must have at least 10 heat sinks (current: {count})"
- **AND** rule SHALL NOT apply to IndustrialMech or ProtoMech

#### Scenario: VAL-MECH-006 Exact Weight Match
- **WHEN** validating any Mech category unit
- **THEN** total component weight SHALL equal declared tonnage
- **AND** weight mismatch SHALL produce CRITICAL_ERROR
- **AND** overweight message SHALL be "Design is overweight by {diff} tons"
- **AND** underweight message SHALL be "Design is underweight by {diff} tons"

#### Scenario: VAL-MECH-007 Critical Slot Limits
- **WHEN** validating any Mech category unit
- **THEN** per-location slot usage SHALL not exceed limits
- **AND** total slot usage SHALL not exceed maximum
- **AND** slot overflow SHALL produce ERROR
- **AND** error message SHALL be "Insufficient slots in {location}"

---

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
- **THEN** tonnage SHALL be within valid range for vehicle type
- **AND** Vehicle: 1-100 tons
- **AND** VTOL: 1-30 tons
- **AND** SupportVehicle: 1-300 tons
- **AND** invalid tonnage SHALL produce CRITICAL_ERROR

---

### Requirement: Aerospace Category Validation Rules

The system SHALL provide validation rules for Aerospace category units.

#### Scenario: VAL-AERO-001 Engine Required
- **WHEN** validating any Aerospace category unit
- **THEN** unit SHALL have an engine configured
- **AND** missing engine SHALL produce CRITICAL_ERROR
- **AND** error message SHALL be "Engine required"

#### Scenario: VAL-AERO-002 Thrust Rating Valid
- **WHEN** validating Aerospace or ConventionalFighter
- **THEN** thrust rating SHALL be positive integer
- **AND** invalid thrust SHALL produce CRITICAL_ERROR
- **AND** error message SHALL be "Thrust rating must be positive integer"

#### Scenario: VAL-AERO-003 Structural Integrity Required
- **WHEN** validating any Aerospace category unit
- **THEN** structural integrity value SHALL be positive
- **AND** zero or negative SI SHALL produce ERROR
- **AND** error message SHALL be "Structural integrity must be positive"

#### Scenario: VAL-AERO-004 Fuel Capacity Valid
- **WHEN** validating any Aerospace category unit
- **THEN** fuel capacity SHALL be non-negative
- **AND** negative fuel SHALL produce ERROR
- **AND** error message SHALL be "Fuel capacity must be non-negative"

---

### Requirement: Personnel Category Validation Rules

The system SHALL provide validation rules for Personnel category units (Infantry, BattleArmor).

#### Scenario: VAL-PERS-001 Squad Size Valid
- **WHEN** validating any Personnel category unit
- **THEN** squad/platoon size SHALL be positive integer
- **AND** invalid size SHALL produce ERROR
- **AND** error message SHALL be "Squad/platoon size must be positive integer"

#### Scenario: VAL-PERS-002 Battle Armor Weight Range
- **WHEN** validating BattleArmor unit
- **THEN** per-trooper weight SHALL be 0.4-2.0 tons
- **AND** invalid weight SHALL produce CRITICAL_ERROR
- **AND** error message SHALL be "Battle armor weight must be 0.4-2.0 tons per trooper"

#### Scenario: VAL-PERS-003 Infantry Primary Weapon Required
- **WHEN** validating Infantry unit
- **THEN** unit SHOULD have primary weapon type defined
- **AND** missing weapon SHALL produce WARNING
- **AND** error message SHALL be "Infantry unit has no primary weapon defined"

---

### Requirement: Validation Context

The system SHALL accept validation context to customize rule execution.

#### Scenario: Campaign year filtering
- **GIVEN** validation context specifies campaignYear: 3025
- **WHEN** running validation
- **THEN** era availability rules SHALL use 3025 as reference
- **AND** units introduced after 3025 SHALL fail validation

#### Scenario: Rules level filtering
- **GIVEN** validation context specifies rulesLevelFilter: STANDARD
- **WHEN** running validation
- **THEN** units with ADVANCED or EXPERIMENTAL rules level SHALL fail validation

#### Scenario: Skip rules option
- **GIVEN** validation context specifies skipRules: ["VAL-UNIV-011"]
- **WHEN** running validation
- **THEN** VAL-UNIV-011 SHALL not execute
- **AND** other rules SHALL execute normally

#### Scenario: Max errors option
- **GIVEN** validation context specifies maxErrors: 5
- **WHEN** validation produces more than 5 errors
- **THEN** validation SHALL stop after 5 errors
- **AND** result SHALL indicate truncation

---

### Requirement: Validation Result Format

The system SHALL return structured validation results.

#### Scenario: Result structure
- **WHEN** validation completes
- **THEN** result SHALL include isValid boolean
- **AND** result SHALL include array of errors
- **AND** result SHALL include array of warnings
- **AND** result SHALL include execution metadata

#### Scenario: Error structure
- **WHEN** a validation error occurs
- **THEN** error SHALL include ruleId
- **AND** error SHALL include severity (CRITICAL_ERROR, ERROR, WARNING, INFO)
- **AND** error SHALL include message
- **AND** error SHALL include optional field reference
- **AND** error SHALL include optional details object

#### Scenario: Aggregated results
- **WHEN** multiple rules produce errors
- **THEN** errors SHALL be aggregated by severity
- **AND** critical errors SHALL prevent unit save
- **AND** warnings SHALL allow unit save with notice

---

### Requirement: Unit Category Mapping

The system SHALL map unit types to categories.

#### Scenario: Mech category mapping
- **WHEN** determining category for BattleMech, OmniMech, IndustrialMech, or ProtoMech
- **THEN** system SHALL return MECH category

#### Scenario: Vehicle category mapping
- **WHEN** determining category for Vehicle, VTOL, or SupportVehicle
- **THEN** system SHALL return VEHICLE category

#### Scenario: Aerospace category mapping
- **WHEN** determining category for Aerospace, ConventionalFighter, SmallCraft, DropShip, JumpShip, WarShip, or SpaceStation
- **THEN** system SHALL return AEROSPACE category

#### Scenario: Personnel category mapping
- **WHEN** determining category for Infantry or BattleArmor
- **THEN** system SHALL return PERSONNEL category

---

### Requirement: UI Integration

The system SHALL provide React hooks for integrating validation into the customizer UI.

#### Scenario: useUnitValidation hook provides validation state
- **WHEN** the useUnitValidation hook is called within a UnitStoreProvider
- **THEN** hook SHALL return validation status ('valid', 'warning', 'error', 'info')
- **AND** hook SHALL return errorCount (number of errors)
- **AND** hook SHALL return warningCount (number of warnings)
- **AND** hook SHALL return isValid boolean
- **AND** hook SHALL return hasCriticalErrors boolean

#### Scenario: Hook reads from Zustand store
- **WHEN** useUnitValidation hook executes
- **THEN** hook SHALL read unit state from useUnitStore
- **AND** hook SHALL convert store state to IValidatableUnit format
- **AND** hook SHALL derive era from year using getEraForYear

#### Scenario: Hook memoizes validation results
- **WHEN** unit state has not changed
- **THEN** hook SHALL return cached validation result
- **AND** validation SHALL not re-run unnecessarily

#### Scenario: Hook auto-initializes validation rules
- **WHEN** useUnitValidation is first called
- **THEN** hook SHALL call initializeUnitValidationRules() if not already initialized
- **AND** all universal and category rules SHALL be registered

#### Scenario: UnitInfoBanner displays validation status
- **WHEN** UnitEditorWithRouting renders
- **THEN** UnitInfoBanner SHALL receive validation.status
- **AND** UnitInfoBanner SHALL receive validation.errorCount
- **AND** UnitInfoBanner SHALL receive validation.warningCount
- **AND** ValidationBadge SHALL display appropriate status icon and color

#### Scenario: Validation updates in real-time
- **WHEN** user modifies unit in customizer
- **THEN** validation SHALL re-run automatically
- **AND** UnitInfoBanner SHALL update to reflect new validation state
- **AND** status SHALL change from 'valid' to 'error' when errors exist

