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
