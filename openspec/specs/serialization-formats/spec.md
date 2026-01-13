# serialization-formats Specification

## Purpose

Defines JSON serialization formats for saving, loading, and exchanging BattleMech unit data. Includes the ISerializedUnit schema used for data interchange and the ISerializedUnitEnvelope wrapper for file storage.
## Requirements
### Requirement: Serialized Unit Schema

The system SHALL define a complete JSON schema for unit serialization.

**Rationale**: Standard schema ensures data interchange compatibility and validation.

**Priority**: Critical

#### Scenario: Required identity fields
- **GIVEN** an ISerializedUnit object
- **THEN** it MUST contain:
  - `id` - Unique string identifier (kebab-case, e.g., "atlas-as7-d")
  - `chassis` - Base chassis name (e.g., "Atlas")
  - `model` - Variant designation (e.g., "AS7-D")

#### Scenario: Required classification fields
- **GIVEN** an ISerializedUnit object
- **THEN** it MUST contain:
  - `unitType` - Type string (e.g., "BattleMech")
  - `configuration` - Mech configuration (e.g., "Biped", "Quad")
  - `techBase` - Tech base string (e.g., "INNER_SPHERE", "CLAN", "MIXED")
  - `rulesLevel` - Rules level string (e.g., "STANDARD", "ADVANCED", "EXPERIMENTAL")
  - `era` - Era string (e.g., "SUCCESSION_WARS", "CLAN_INVASION")
  - `year` - Introduction year as integer
  - `tonnage` - Unit weight in tons as integer

#### Scenario: Optional variant field
- **GIVEN** an ISerializedUnit object
- **THEN** it MAY contain:
  - `variant` - Optional variant name for custom builds

#### Scenario: OmniMech-specific fields
- **GIVEN** an ISerializedUnit object for an OmniMech
- **THEN** it MAY contain:
  - `isOmni` - Boolean true if unit is an OmniMech
  - `baseChassisHeatSinks` - Number of heat sinks fixed to base chassis (-1 for auto)
  - `clanName` - Optional Clan reporting name (e.g., "Mad Cat" for Timber Wolf)

---

### Requirement: Serialized Engine Format

The system SHALL define engine serialization format.

**Rationale**: Engine is a core structural component requiring standardized representation.

**Priority**: Critical

#### Scenario: Engine structure
- **GIVEN** an ISerializedEngine object
- **THEN** it MUST contain:
  - `type` - Engine type string (e.g., "STANDARD", "XL", "LIGHT", "COMPACT", "ICE")
  - `rating` - Engine rating as integer (e.g., 300)

#### Scenario: Engine type values
- **GIVEN** an engine type field
- **THEN** valid values SHALL include:
  - "STANDARD" or "FUSION" - Standard fusion engine
  - "XL" or "XL_IS" - Extra-light Inner Sphere
  - "XL_CLAN" or "CLAN_XL" - Extra-light Clan
  - "LIGHT" - Light fusion engine
  - "COMPACT" - Compact fusion engine
  - "XXL" - XXL fusion engine
  - "ICE" - Internal combustion engine
  - "FUEL_CELL" - Fuel cell engine
  - "FISSION" - Fission engine

---

### Requirement: Serialized Gyro Format

The system SHALL define gyro serialization format.

**Rationale**: Gyro type affects weight and critical slots.

**Priority**: Critical

#### Scenario: Gyro structure
- **GIVEN** an ISerializedGyro object
- **THEN** it MUST contain:
  - `type` - Gyro type string (e.g., "STANDARD", "XL", "COMPACT", "HEAVY_DUTY")

---

### Requirement: Serialized Structure Format

The system SHALL define internal structure serialization format.

**Rationale**: Structure type affects weight and critical slot usage.

**Priority**: Critical

#### Scenario: Structure structure
- **GIVEN** an ISerializedStructure object
- **THEN** it MUST contain:
  - `type` - Structure type string (e.g., "STANDARD", "ENDO_STEEL", "INDUSTRIAL")

---

### Requirement: Serialized Armor Format

The system SHALL define armor serialization format with per-location allocation.

**Rationale**: Armor allocation is location-specific with front/rear for torsos.

**Priority**: Critical

#### Scenario: Armor structure
- **GIVEN** an ISerializedArmor object
- **THEN** it MUST contain:
  - `type` - Armor type string (e.g., "STANDARD", "FERRO_FIBROUS", "LIGHT_FERRO")
  - `allocation` - Object mapping locations to armor values

#### Scenario: Armor allocation for non-torso locations
- **GIVEN** armor allocation for HEAD, LEFT_ARM, RIGHT_ARM, LEFT_LEG, RIGHT_LEG
- **THEN** value SHALL be an integer representing total armor points

#### Scenario: Armor allocation for torso locations
- **GIVEN** armor allocation for LEFT_TORSO, RIGHT_TORSO, CENTER_TORSO
- **THEN** value SHALL be an object with:
  - `front` - Front armor points as integer
  - `rear` - Rear armor points as integer

---

### Requirement: Serialized Heat Sinks Format

The system SHALL define heat sink serialization format.

**Rationale**: Heat sink type and count affect weight and heat management.

**Priority**: Critical

#### Scenario: Heat sinks structure
- **GIVEN** an ISerializedHeatSinks object
- **THEN** it MUST contain:
  - `type` - Heat sink type string (e.g., "SINGLE", "DOUBLE", "DOUBLE_IS", "DOUBLE_CLAN")
  - `count` - Total heat sink count as integer

---

### Requirement: Serialized Movement Format

The system SHALL define movement serialization format.

**Rationale**: Movement capabilities are fundamental mech properties.

**Priority**: Critical

#### Scenario: Movement structure
- **GIVEN** an ISerializedMovement object
- **THEN** it MUST contain:
  - `walk` - Walking MP as integer
  - `jump` - Jump MP as integer (0 if no jump jets)

#### Scenario: Optional movement fields
- **GIVEN** an ISerializedMovement object
- **THEN** it MAY contain:
  - `jumpJetType` - Type of jump jets (e.g., "STANDARD", "IMPROVED")
  - `enhancements` - Array of movement enhancements (e.g., ["MASC", "TSM"])

---

### Requirement: Serialized Equipment Format

The system SHALL define equipment serialization format with location references.

**Rationale**: Equipment must be associated with specific mount locations.

**Priority**: Critical

#### Scenario: Equipment structure
- **GIVEN** an ISerializedEquipment object
- **THEN** it MUST contain:
  - `id` - Equipment identifier string (e.g., "medium-laser", "lrm-20")
  - `location` - Mount location string (e.g., "LEFT_ARM", "RIGHT_TORSO")

#### Scenario: Optional equipment fields
- **GIVEN** an ISerializedEquipment object
- **THEN** it MAY contain:
  - `slots` - Array of specific slot indices if non-contiguous
  - `isRearMounted` - Boolean true if weapon faces rear
  - `linkedAmmo` - ID of linked ammunition bin
  - `isOmniPodMounted` - Boolean true if pod-mounted on OmniMech (false = fixed to chassis)

---

### Requirement: Serialized Critical Slots Format

The system SHALL define critical slot assignment format per location.

**Rationale**: Critical slots show exact placement of equipment and systems.

**Priority**: Critical

#### Scenario: Critical slots structure
- **GIVEN** an ISerializedCriticalSlots object
- **THEN** it SHALL be a Record mapping location strings to slot arrays

#### Scenario: Slot array contents
- **GIVEN** a critical slot array for a location
- **THEN** each element SHALL be:
  - A string identifying the equipment or system in that slot
  - Or null for an empty slot

#### Scenario: Slot counts per location
- **GIVEN** critical slots for a BattleMech
- **THEN** slot arrays SHALL have correct counts:
  - HEAD: 6 slots
  - LEFT_ARM, RIGHT_ARM: 12 slots each
  - LEFT_TORSO, RIGHT_TORSO, CENTER_TORSO: 12 slots each
  - LEFT_LEG, RIGHT_LEG: 6 slots each

---

### Requirement: Serialized Fluff Format

The system SHALL define optional fluff/flavor text format.

**Rationale**: Fluff text provides lore and background information.

**Priority**: Medium

#### Scenario: Fluff structure
- **GIVEN** an ISerializedFluff object
- **THEN** it MAY contain:
  - `overview` - General unit overview text
  - `capabilities` - Combat capabilities description
  - `history` - Historical background
  - `deployment` - Deployment information
  - `variants` - Variant descriptions
  - `notableUnits` - Notable pilots/units
  - `manufacturer` - Manufacturer name
  - `primaryFactory` - Primary factory location
  - `systemManufacturer` - Record mapping system types to manufacturer names

---

### Requirement: Unit Envelope Format

The system SHALL define a wrapper envelope for saved unit files.

**Rationale**: Envelope provides metadata for version tracking and application identification.

**Priority**: High

#### Scenario: Envelope structure
- **GIVEN** an ISerializedUnitEnvelope object
- **THEN** it MUST contain:
  - `formatVersion` - Schema version string (e.g., "1.0.0")
  - `savedAt` - ISO timestamp of save time
  - `application` - Application name that saved the file
  - `applicationVersion` - Application version string
  - `unit` - The ISerializedUnit data

---

### Requirement: Save Format Validation

The system SHALL validate data when saving.

**Rationale**: Ensures saved files are valid and can be loaded later.

**Priority**: High

#### Scenario: Save validation
- **WHEN** saving unit to file
- **THEN** format SHALL be valid JSON
- **AND** format SHALL include format version identifier
- **AND** format SHALL include complete unit data

---

### Requirement: Load Validation

The system SHALL validate data integrity when loading.

**Rationale**: Protects against corrupted or invalid files.

**Priority**: High

#### Scenario: Load validation
- **WHEN** loading unit from file
- **THEN** system SHALL validate JSON structure
- **AND** system SHALL validate required fields exist
- **AND** system SHALL validate enum values are valid
- **AND** system SHALL handle version migrations if needed

#### Scenario: Version migration
- **GIVEN** a file with older formatVersion
- **WHEN** loading the file
- **THEN** system SHALL detect version mismatch
- **AND** system SHALL apply necessary migrations
- **AND** system SHALL log migration actions

---

### Requirement: MTF Format Import

The system SHALL support importing MegaMekLab .mtf files.

**Rationale**: Enables compatibility with MegaMek ecosystem.

**Priority**: High

#### Scenario: MTF import
- **WHEN** importing .mtf file
- **THEN** system SHALL parse MegaMekLab text format
- **AND** system SHALL map MTF fields to ISerializedUnit
- **AND** system SHALL resolve equipment names to canonical IDs
- **AND** system SHALL validate converted data

#### Scenario: MTF equipment mapping
- **GIVEN** MTF file with equipment names
- **WHEN** converting to ISerializedUnit
- **THEN** use EquipmentNameMapper to resolve canonical IDs
- **AND** log warnings for unresolved equipment

---

### Requirement: Location String Values

The system SHALL use consistent location string values.

**Rationale**: Standard location names ensure data compatibility.

**Priority**: High

#### Scenario: Valid location values
- **GIVEN** a location field
- **THEN** valid values SHALL be:
  - "HEAD"
  - "CENTER_TORSO"
  - "LEFT_TORSO"
  - "RIGHT_TORSO"
  - "LEFT_ARM"
  - "RIGHT_ARM"
  - "LEFT_LEG"
  - "RIGHT_LEG"

#### Scenario: Quad mech locations
- **GIVEN** a quad mech configuration
- **THEN** additional valid values SHALL be:
  - "FRONT_LEFT_LEG"
  - "FRONT_RIGHT_LEG"
  - "REAR_LEFT_LEG"
  - "REAR_RIGHT_LEG"

---

### Requirement: MTF Parser OmniMech Fields

The MTF parser SHALL support OmniMech-specific fields.

#### Scenario: Parse Base Chassis Heat Sinks field

- **Given** an MTF file containing `Base Chassis Heat Sinks:15`
- **When** the file is parsed
- **Then** the result includes `baseChassisHeatSinks: 15`

#### Scenario: Parse clanname field

- **Given** an MTF file containing `clanname:Timber Wolf`
- **When** the file is parsed
- **Then** the result includes `clanName: "Timber Wolf"`

#### Scenario: Parse omnipod equipment marker

- **Given** an MTF equipment line `CLERLargeLaser (omnipod)`
- **When** the line is parsed
- **Then** the equipment name is `CLERLargeLaser`
- **And** `isOmniPodMounted` is `true`

#### Scenario: Parse equipment without omnipod marker

- **Given** an MTF equipment line `CLDoubleHeatSink`
- **And** the unit is an OmniMech
- **When** the line is parsed
- **Then** the equipment name is `CLDoubleHeatSink`
- **And** `isOmniPodMounted` is `false`

---

### Requirement: MTF Exporter OmniMech Fields

The MTF exporter SHALL output OmniMech-specific fields when applicable.

#### Scenario: Export Base Chassis Heat Sinks

- **Given** an OmniMech unit with `baseChassisHeatSinks: 12`
- **When** the unit is exported to MTF
- **Then** the output contains the line `Base Chassis Heat Sinks:12`
- **And** the line appears after `Heat Sinks:` line

#### Scenario: Export clanname

- **Given** an OmniMech unit with `clanName: "Dire Wolf"`
- **When** the unit is exported to MTF
- **Then** the output contains the line `clanname:Dire Wolf`
- **And** the line appears after the `chassis:` line

#### Scenario: Export pod equipment with marker

- **Given** an OmniMech unit with equipment `{ name: "ER Large Laser", isOmniPodMounted: true }`
- **When** the unit is exported to MTF
- **Then** the equipment line is `CLERLargeLaser (omnipod)`

#### Scenario: Export fixed equipment without marker

- **Given** an OmniMech unit with equipment `{ name: "Double Heat Sink", isOmniPodMounted: false }`
- **When** the unit is exported to MTF
- **Then** the equipment line is `CLDoubleHeatSink` (no omnipod suffix)

#### Scenario: Do not export OmniMech fields for standard mechs

- **Given** a standard BattleMech (not OmniMech)
- **When** the unit is exported to MTF
- **Then** the output does NOT contain `Base Chassis Heat Sinks:` line
- **And** the output does NOT contain `clanname:` line
- **And** equipment lines do NOT have `(omnipod)` suffix

### Requirement: MTF Format Export

The system SHALL support exporting ISerializedUnit to MegaMekLab .mtf format.

**Rationale**: Enables round-trip validation and compatibility with MegaMek ecosystem for data verification.

**Priority**: High

#### Scenario: MTF export
- **WHEN** exporting to .mtf format
- **THEN** system SHALL generate MegaMekLab-compatible text format
- **AND** system SHALL map canonical equipment IDs to MTF names
- **AND** system SHALL format critical slots per MegaMek conventions
- **AND** system SHALL include all structural component fields

#### Scenario: MTF equipment naming
- **GIVEN** ISerializedUnit with equipment ID "medium-laser"
- **WHEN** exporting to MTF format
- **THEN** equipment SHALL appear as "Medium Laser" in output
- **AND** ammunition SHALL use "IS Ammo" or "Clan Ammo" prefixes as appropriate

#### Scenario: MTF location formatting
- **GIVEN** ISerializedUnit with critical slot assignments
- **WHEN** exporting to MTF format
- **THEN** each location section SHALL list slots in order
- **AND** empty slots SHALL be represented as "-Empty-"
- **AND** location headers SHALL match MegaMek format (e.g., "Left Arm:")

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

