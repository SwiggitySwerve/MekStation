## MODIFIED Requirements

### Requirement: Location Slot Counts
Each location SHALL have a fixed number of critical slots based on mech configuration.

#### Scenario: Biped slot definitions
- **WHEN** defining location capacity for BIPED configuration
- **THEN** Head = 6 slots
- **AND** Center Torso = 12 slots
- **AND** Side Torsos = 12 slots each
- **AND** Arms = 12 slots each
- **AND** Legs = 6 slots each
- **AND** Total = 78 slots

#### Scenario: Quad slot definitions
- **WHEN** defining location capacity for QUAD configuration
- **THEN** Head = 6 slots
- **AND** Center Torso = 12 slots
- **AND** Side Torsos = 12 slots each
- **AND** Front Legs = 12 slots each
- **AND** Rear Legs = 12 slots each
- **AND** Total = 78 slots

#### Scenario: Tripod slot definitions
- **WHEN** defining location capacity for TRIPOD configuration
- **THEN** Head = 6 slots
- **AND** Center Torso = 12 slots
- **AND** Side Torsos = 12 slots each
- **AND** Arms = 12 slots each
- **AND** Legs = 6 slots each (Left, Right, Center)
- **AND** Total = 84 slots

#### Scenario: LAM slot definitions
- **WHEN** defining location capacity for LAM configuration
- **THEN** slot counts SHALL match BIPED configuration
- **AND** Landing Gear SHALL occupy 1 slot in CT, LT, RT
- **AND** Avionics SHALL occupy 1 slot in Head, LT, RT

### Requirement: Actuator Requirements
Limbs SHALL have required actuator slots based on mech configuration.

#### Scenario: Biped arm actuators
- **WHEN** arm has full actuators in BIPED configuration
- **THEN** shoulder = 1 slot (required)
- **AND** upper arm = 1 slot (required)
- **AND** lower arm = 1 slot (optional, removable)
- **AND** hand = 1 slot (optional, removable)

#### Scenario: Biped leg actuators
- **WHEN** leg is defined in BIPED configuration
- **THEN** hip = 1 slot (required)
- **AND** upper leg = 1 slot (required)
- **AND** lower leg = 1 slot (required)
- **AND** foot = 1 slot (required)

#### Scenario: Quad leg actuators
- **WHEN** any leg is defined in QUAD configuration
- **THEN** all four legs SHALL use leg actuators (hip, upper leg, lower leg, foot)
- **AND** no arm actuators SHALL be present
- **AND** all actuators SHALL be required (not removable)

#### Scenario: Tripod leg actuators
- **WHEN** legs are defined in TRIPOD configuration
- **THEN** Left Leg, Right Leg, and Center Leg SHALL all use leg actuators
- **AND** arms SHALL use standard arm actuators

### Requirement: Fixed Slot Protection
System component slots SHALL NOT be assignable based on configuration.

#### Scenario: Head fixed slots
- **GIVEN** user attempts to assign equipment to Head
- **WHEN** targeting slots 0, 1, 2, 4, or 5
- **THEN** assignment SHALL be rejected
- **AND** only slot 3 SHALL be assignable

#### Scenario: Arm fixed slots (biped/tripod/LAM)
- **GIVEN** user attempts to assign equipment to Left Arm or Right Arm
- **WHEN** configuration is BIPED, TRIPOD, or LAM
- **AND** targeting slots 0-3 (actuators)
- **THEN** assignment SHALL be rejected
- **AND** only slots 4-11 SHALL be assignable

#### Scenario: Quad leg fixed slots
- **GIVEN** user attempts to assign equipment to any leg in QUAD configuration
- **WHEN** targeting slots 0-3 (leg actuators)
- **THEN** assignment SHALL be rejected
- **AND** only slots 4-11 SHALL be assignable

#### Scenario: Biped/Tripod leg fixed slots
- **GIVEN** user attempts to assign equipment to Left Leg, Right Leg, or Center Leg
- **WHEN** configuration is BIPED or TRIPOD
- **AND** targeting slots 0-3 (actuators)
- **THEN** assignment SHALL be rejected
- **AND** only slots 4-5 SHALL be assignable

#### Scenario: LAM fixed equipment slots
- **GIVEN** user attempts to assign equipment in LAM configuration
- **WHEN** targeting slots occupied by Landing Gear or Avionics
- **THEN** assignment SHALL be rejected
- **AND** Landing Gear and Avionics SHALL be fixed and not removable

## ADDED Requirements

### Requirement: Configuration-Aware Slot Validation
Slot assignment SHALL validate against configuration-specific rules.

#### Scenario: Validate location for configuration
- **GIVEN** user attempts to assign equipment to a location
- **WHEN** location is not valid for current configuration
- **THEN** assignment SHALL be rejected with configuration mismatch error

#### Scenario: Cross-configuration location rejection
- **GIVEN** unit is QUAD configuration
- **WHEN** attempting to assign to LEFT_ARM or RIGHT_ARM
- **THEN** assignment SHALL be rejected
- **AND** error message SHALL indicate location not valid for quad mechs

### Requirement: MechLocation Enum Expansion
The MechLocation enumeration SHALL include all locations for all configurations.

#### Scenario: Quad-specific locations
- **WHEN** accessing MechLocation enum
- **THEN** FRONT_LEFT_LEG SHALL be available
- **AND** FRONT_RIGHT_LEG SHALL be available
- **AND** REAR_LEFT_LEG SHALL be available
- **AND** REAR_RIGHT_LEG SHALL be available

#### Scenario: Tripod-specific locations
- **WHEN** accessing MechLocation enum
- **THEN** CENTER_LEG SHALL be available

#### Scenario: LAM fighter-mode locations
- **WHEN** accessing MechLocation enum
- **THEN** NOSE, LEFT_WING, RIGHT_WING, AFT, FUSELAGE SHALL be available for fighter mode armor mapping
