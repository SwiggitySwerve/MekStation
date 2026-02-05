# mech-configuration-system Specification

## Purpose

TBD - created by archiving change add-exotic-mech-support. Update Purpose after archive.

## Requirements

### Requirement: Configuration Registry

The system SHALL provide a centralized registry of mech configuration definitions.

#### Scenario: Registry initialization

- **WHEN** the application starts
- **THEN** ConfigurationRegistry SHALL be initialized with all supported configurations
- **AND** each configuration SHALL have a complete MechConfigurationDefinition

#### Scenario: Configuration lookup

- **WHEN** requesting a configuration definition
- **THEN** registry SHALL return the definition for the specified MechConfiguration
- **AND** SHALL return undefined for unknown configurations

### Requirement: Mech Configuration Definition

Each mech configuration SHALL have a complete definition specifying its characteristics.

#### Scenario: Definition structure

- **WHEN** defining a mech configuration
- **THEN** definition SHALL include id (MechConfiguration enum value)
- **AND** definition SHALL include displayName
- **AND** definition SHALL include locations array
- **AND** definition SHALL include actuators array
- **AND** definition SHALL include mountingRules array
- **AND** definition SHALL include prohibitedEquipment array
- **AND** definition SHALL include diagramComponent reference

#### Scenario: Biped configuration

- **WHEN** accessing BIPED configuration
- **THEN** locations SHALL include HEAD, CENTER_TORSO, LEFT_TORSO, RIGHT_TORSO, LEFT_ARM, RIGHT_ARM, LEFT_LEG, RIGHT_LEG
- **AND** arms SHALL have Shoulder, Upper Arm, Lower Arm (optional), Hand (optional) actuators
- **AND** legs SHALL have Hip, Upper Leg, Lower Leg, Foot actuators

#### Scenario: Quad configuration

- **WHEN** accessing QUAD configuration
- **THEN** locations SHALL include HEAD, CENTER_TORSO, LEFT_TORSO, RIGHT_TORSO, FRONT_LEFT_LEG, FRONT_RIGHT_LEG, REAR_LEFT_LEG, REAR_RIGHT_LEG
- **AND** all four leg locations SHALL have Hip, Upper Leg, Lower Leg, Foot actuators
- **AND** no hand or lower arm actuators SHALL be present
- **AND** prohibitedEquipment SHALL include hand weapons (hatchet, sword, claw)

#### Scenario: Tripod configuration

- **WHEN** accessing TRIPOD configuration
- **THEN** locations SHALL include all biped locations plus CENTER_LEG
- **AND** CENTER_LEG SHALL have Hip, Upper Leg, Lower Leg, Foot actuators
- **AND** arms SHALL have standard arm actuators

#### Scenario: LAM configuration

- **WHEN** accessing LAM configuration
- **THEN** locations SHALL include all biped locations
- **AND** configuration SHALL include LAM mode definitions
- **AND** Landing Gear SHALL be required in LEFT_TORSO, RIGHT_TORSO, CENTER_TORSO
- **AND** Avionics SHALL be required in LEFT_TORSO, RIGHT_TORSO, HEAD

### Requirement: Location Definition

Each location within a configuration SHALL have a complete definition.

#### Scenario: Location properties

- **WHEN** defining a location
- **THEN** definition SHALL include id (MechLocation enum value)
- **AND** definition SHALL include displayName
- **AND** definition SHALL include criticalSlots count
- **AND** definition SHALL include hasRearArmor flag
- **AND** definition SHALL include maxArmor calculation function
- **AND** definition SHALL include transfersTo location (for damage transfer)

#### Scenario: Head location

- **WHEN** accessing HEAD location definition
- **THEN** criticalSlots SHALL be 6
- **AND** hasRearArmor SHALL be false
- **AND** maxArmor SHALL always be 9

#### Scenario: Torso locations

- **WHEN** accessing CENTER_TORSO, LEFT_TORSO, or RIGHT_TORSO location definition
- **THEN** criticalSlots SHALL be 12
- **AND** hasRearArmor SHALL be true

#### Scenario: Limb locations

- **WHEN** accessing arm or leg location definitions
- **THEN** arms SHALL have 12 criticalSlots
- **AND** legs SHALL have 6 criticalSlots for biped/tripod
- **AND** legs SHALL have 12 criticalSlots for quad
- **AND** hasRearArmor SHALL be false

### Requirement: Actuator Definition

Each location SHALL define required and optional actuators.

#### Scenario: Actuator properties

- **WHEN** defining actuators for a location
- **THEN** each actuator SHALL have name, slotIndex, required flag, removable flag

#### Scenario: Arm actuators (biped/tripod/LAM)

- **WHEN** accessing arm actuator definitions
- **THEN** Shoulder SHALL be at slotIndex 0, required, not removable
- **AND** Upper Arm Actuator SHALL be at slotIndex 1, required, not removable
- **AND** Lower Arm Actuator SHALL be at slotIndex 2, not required, removable
- **AND** Hand Actuator SHALL be at slotIndex 3, not required, removable

#### Scenario: Leg actuators

- **WHEN** accessing leg actuator definitions
- **THEN** Hip SHALL be at slotIndex 0, required, not removable
- **AND** Upper Leg Actuator SHALL be at slotIndex 1, required, not removable
- **AND** Lower Leg Actuator SHALL be at slotIndex 2, required, not removable
- **AND** Foot Actuator SHALL be at slotIndex 3, required, not removable

### Requirement: LAM Mode Definitions

LAM configurations SHALL define behavior for each operating mode.

#### Scenario: LAM mode properties

- **WHEN** defining a LAM mode
- **THEN** definition SHALL include mode id (MECH, AIRMECH, FIGHTER)
- **AND** definition SHALL include movementType (ground, vtol, aerospace)
- **AND** definition SHALL include weaponRestrictions array
- **AND** definition SHALL include armorMapping for fighter mode

#### Scenario: Mech mode

- **WHEN** LAM is in MECH mode
- **THEN** movementType SHALL be ground
- **AND** all weapons SHALL be available
- **AND** standard mech armor locations SHALL be used

#### Scenario: AirMech mode

- **WHEN** LAM is in AIRMECH mode
- **THEN** movementType SHALL be vtol
- **AND** melee weapons SHALL be restricted

#### Scenario: Fighter mode

- **WHEN** LAM is in FIGHTER mode
- **THEN** movementType SHALL be aerospace
- **AND** armorMapping SHALL map mech locations to fighter locations (NOSE, LEFT_WING, RIGHT_WING, AFT, FUSELAGE)
- **AND** leg-mounted weapons SHALL be restricted

### Requirement: Configuration Helper Functions

The system SHALL provide helper functions for configuration-aware operations.

#### Scenario: Get locations for configuration

- **WHEN** calling getLocationsForConfig(config)
- **THEN** SHALL return array of MechLocation values valid for that configuration
- **AND** SHALL return 8 locations for BIPED and QUAD
- **AND** SHALL return 9 locations for TRIPOD

#### Scenario: Get location display name

- **WHEN** calling getLocationDisplayName(location, config)
- **THEN** SHALL return configuration-appropriate display name
- **AND** FRONT_LEFT_LEG in QUAD SHALL return "Front Left Leg"
- **AND** LEFT_ARM in BIPED SHALL return "Left Arm"

#### Scenario: Check location validity

- **WHEN** calling isValidLocationForConfig(location, config)
- **THEN** SHALL return true if location is part of configuration
- **AND** SHALL return false for invalid combinations (e.g., CENTER_LEG for BIPED)
