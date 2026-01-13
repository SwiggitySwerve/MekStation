## ADDED Requirements

### Requirement: MTF Location Headers
The system SHALL parse and export configuration-specific location headers in MTF format.

#### Scenario: Biped location parsing
- **WHEN** parsing MTF with Config:Biped or no Config line
- **THEN** parser SHALL recognize "Left Arm:", "Right Arm:", "Left Leg:", "Right Leg:" headers
- **AND** parser SHALL map to LEFT_ARM, RIGHT_ARM, LEFT_LEG, RIGHT_LEG locations

#### Scenario: Quad location parsing
- **WHEN** parsing MTF with Config:Quad
- **THEN** parser SHALL recognize "Front Left Leg:", "Front Right Leg:", "Rear Left Leg:", "Rear Right Leg:" headers
- **AND** parser SHALL map to FRONT_LEFT_LEG, FRONT_RIGHT_LEG, REAR_LEFT_LEG, REAR_RIGHT_LEG locations

#### Scenario: Tripod location parsing
- **WHEN** parsing MTF with Config:Tripod
- **THEN** parser SHALL recognize all biped location headers plus "Center Leg:"
- **AND** parser SHALL map "Center Leg:" to CENTER_LEG location

#### Scenario: LAM location parsing
- **WHEN** parsing MTF with Config:LAM
- **THEN** parser SHALL recognize biped location headers
- **AND** parser SHALL recognize "Landing Gear" equipment in CT, LT, RT
- **AND** parser SHALL recognize "Avionics" equipment in Head, LT, RT

#### Scenario: Biped MTF export
- **WHEN** exporting BIPED mech to MTF
- **THEN** location headers SHALL be "Left Arm:", "Right Arm:", "Left Leg:", "Right Leg:"

#### Scenario: Quad MTF export
- **WHEN** exporting QUAD mech to MTF
- **THEN** location headers SHALL be "Front Left Leg:", "Front Right Leg:", "Rear Left Leg:", "Rear Right Leg:"

#### Scenario: Tripod MTF export
- **WHEN** exporting TRIPOD mech to MTF
- **THEN** location headers SHALL include "Center Leg:" in addition to biped headers

### Requirement: MTF Armor Labels
The system SHALL parse and export configuration-specific armor labels in MTF format.

#### Scenario: Biped armor parsing
- **WHEN** parsing armor section for BIPED
- **THEN** parser SHALL recognize "LA armor:", "RA armor:", "LL armor:", "RL armor:"
- **AND** parser SHALL map to respective MechLocation values

#### Scenario: Quad armor parsing
- **WHEN** parsing armor section for QUAD
- **THEN** parser SHALL recognize "FLL armor:", "FRL armor:", "RLL armor:", "RRL armor:"
- **AND** parser SHALL map to FRONT_LEFT_LEG, FRONT_RIGHT_LEG, REAR_LEFT_LEG, REAR_RIGHT_LEG

#### Scenario: Tripod armor parsing
- **WHEN** parsing armor section for TRIPOD
- **THEN** parser SHALL recognize biped armor labels plus "CL armor:"
- **AND** parser SHALL map "CL armor:" to CENTER_LEG

#### Scenario: Quad armor export
- **WHEN** exporting QUAD mech armor to MTF
- **THEN** armor labels SHALL be "FLL armor:", "FRL armor:", "RLL armor:", "RRL armor:"

#### Scenario: Tripod armor export
- **WHEN** exporting TRIPOD mech armor to MTF
- **THEN** armor labels SHALL include "CL armor:" for CENTER_LEG

### Requirement: Configuration Detection
The system SHALL detect mech configuration from MTF content before parsing locations.

#### Scenario: Config line detection
- **WHEN** parsing MTF file
- **THEN** parser SHALL read "Config:" line first
- **AND** parser SHALL select appropriate location mappings based on config value

#### Scenario: Config values
- **WHEN** detecting configuration
- **THEN** "Config:Biped" SHALL map to BIPED configuration
- **AND** "Config:Quad" SHALL map to QUAD configuration
- **AND** "Config:Tripod" SHALL map to TRIPOD configuration
- **AND** "Config:LAM" SHALL map to LAM configuration
- **AND** "Config:QuadVee" SHALL map to QUADVEE configuration

#### Scenario: Default configuration
- **WHEN** MTF has no Config line
- **THEN** parser SHALL default to BIPED configuration

#### Scenario: OmniMech config variants
- **WHEN** Config line includes "Omnimech" (e.g., "Config:Tripod Omnimech")
- **THEN** parser SHALL extract base configuration (TRIPOD)
- **AND** parser SHALL set omnimech flag

### Requirement: LAM Special Equipment Serialization
The system SHALL correctly serialize and deserialize LAM-specific fixed equipment.

#### Scenario: Landing Gear serialization
- **WHEN** exporting LAM to MTF
- **THEN** "Landing Gear" SHALL appear in CT, LT, RT critical slot sections
- **AND** equipment SHALL be in fixed positions

#### Scenario: Avionics serialization
- **WHEN** exporting LAM to MTF
- **THEN** "Avionics" SHALL appear in Head, LT, RT critical slot sections
- **AND** equipment SHALL be in fixed positions

#### Scenario: Landing Gear parsing
- **WHEN** parsing LAM MTF
- **THEN** "Landing Gear" in critical slots SHALL be recognized as fixed LAM equipment
- **AND** equipment SHALL not be movable or removable

#### Scenario: Avionics parsing
- **WHEN** parsing LAM MTF
- **THEN** "Avionics" in critical slots SHALL be recognized as fixed LAM equipment
- **AND** equipment SHALL not be movable or removable

### Requirement: Configuration-Aware Actuator Serialization
The system SHALL serialize actuators based on configuration.

#### Scenario: Quad actuator serialization
- **WHEN** exporting QUAD mech to MTF
- **THEN** all leg locations SHALL include Hip, Upper Leg Actuator, Lower Leg Actuator, Foot Actuator
- **AND** no arm actuators SHALL be present

#### Scenario: Tripod actuator serialization
- **WHEN** exporting TRIPOD mech to MTF
- **THEN** CENTER_LEG SHALL include Hip, Upper Leg Actuator, Lower Leg Actuator, Foot Actuator
- **AND** arms SHALL include standard arm actuators

#### Scenario: Quad actuator parsing
- **WHEN** parsing QUAD MTF
- **THEN** parser SHALL expect leg actuators in all 4 leg locations
- **AND** parser SHALL NOT expect arm actuators

### Requirement: Backward Compatibility
The system SHALL maintain compatibility with existing serialized data.

#### Scenario: Legacy biped import
- **WHEN** importing MTF without Config line
- **THEN** parser SHALL treat as BIPED configuration
- **AND** all biped locations SHALL be correctly mapped

#### Scenario: Unknown configuration handling
- **WHEN** parsing MTF with unrecognized Config value
- **THEN** parser SHALL log warning
- **AND** parser SHALL attempt BIPED fallback parsing
- **AND** parsing SHALL NOT fail completely
