# unit-services Specification

## Purpose

Provides services for loading, browsing, searching, and managing BattleMech units. Supports both canonical (official) units loaded from static JSON files and custom user-created units stored in IndexedDB. Includes unit factory service for converting serialized data to runtime objects.
## Requirements
### Requirement: Canonical Unit Index Loading

The system SHALL load a lightweight unit index on application startup for search and browsing.

**Rationale**: Loading full unit data for all units is too slow; index enables fast filtering.

**Priority**: Critical

#### Scenario: Load index on startup
- **GIVEN** the application is starting
- **WHEN** CanonicalUnitService.getIndex() is called
- **THEN** return array of UnitIndexEntry objects
- **AND** each entry contains id, name, chassis, variant, tonnage, techBase, era, weightClass, unitType, filePath

#### Scenario: Index is cached
- **GIVEN** the index has been loaded once
- **WHEN** getIndex() is called again
- **THEN** return cached data without network request

---

### Requirement: Canonical Unit Lazy Loading

The system SHALL lazy-load full unit data on demand by ID.

**Rationale**: Avoids loading megabytes of unit data until actually needed.

**Priority**: Critical

#### Scenario: Load single unit
- **GIVEN** a valid unit ID exists in the index
- **WHEN** CanonicalUnitService.getById(id) is called
- **THEN** fetch the unit JSON from the file path
- **AND** convert ISerializedUnit to IBattleMech via UnitFactoryService
- **AND** return the complete IBattleMech object

#### Scenario: Unit not found
- **GIVEN** an invalid or unknown unit ID
- **WHEN** getById(unknownId) is called
- **THEN** return null

#### Scenario: Load multiple units
- **GIVEN** multiple valid unit IDs
- **WHEN** getByIds([id1, id2, id3]) is called
- **THEN** return array of IBattleMech objects in parallel
- **AND** skip any IDs that don't exist

---

### Requirement: Canonical Unit Querying

The system SHALL filter the unit index by criteria.

**Rationale**: Users need to browse units by tech base, era, weight class, etc.

**Priority**: High

#### Scenario: Filter by tech base
- **GIVEN** the unit index is loaded
- **WHEN** query({ techBase: TechBase.CLAN }) is called
- **THEN** return only units with Clan tech base

#### Scenario: Filter by multiple criteria
- **GIVEN** the unit index is loaded
- **WHEN** query({ techBase: TechBase.INNER_SPHERE, weightClass: WeightClass.HEAVY }) is called
- **THEN** return only Inner Sphere heavy mechs

#### Scenario: Empty result
- **GIVEN** no units match the criteria
- **WHEN** query(impossible criteria) is called
- **THEN** return empty array

---

### Requirement: Custom Unit CRUD Operations

The system SHALL provide create, read, update, and delete operations for custom units.

**Rationale**: Users need to save their custom mech builds persistently.

**Priority**: Critical

#### Scenario: Create custom unit
- **GIVEN** a valid IBattleMech object
- **WHEN** CustomUnitService.create(unit) is called
- **THEN** serialize to ISerializedUnit format
- **AND** store the unit in IndexedDB
- **AND** return the generated unique ID

#### Scenario: Read custom unit
- **GIVEN** a custom unit exists with ID "custom-123"
- **WHEN** getById("custom-123") is called
- **THEN** load ISerializedUnit from storage
- **AND** convert to IBattleMech via UnitFactoryService
- **AND** return the complete IBattleMech

#### Scenario: Update custom unit
- **GIVEN** a custom unit exists with ID "custom-123"
- **WHEN** update("custom-123", modifiedUnit) is called
- **THEN** replace the stored unit with the new data

#### Scenario: Delete custom unit
- **GIVEN** a custom unit exists with ID "custom-123"
- **WHEN** delete("custom-123") is called
- **THEN** remove the unit from storage
- **AND** subsequent getById returns null

---

### Requirement: Custom Unit Listing

The system SHALL list all custom units as index entries.

**Rationale**: Users need to browse their saved custom units.

**Priority**: High

#### Scenario: List all custom units
- **GIVEN** the user has saved 5 custom units
- **WHEN** CustomUnitService.list() is called
- **THEN** return array of 5 UnitIndexEntry objects

#### Scenario: Empty custom units
- **GIVEN** no custom units have been created
- **WHEN** list() is called
- **THEN** return empty array

---

### Requirement: Unit Search Initialization

The system SHALL initialize a full-text search index on startup.

**Rationale**: Fast search requires pre-built index structure.

**Priority**: High

#### Scenario: Initialize search
- **GIVEN** the application is starting
- **WHEN** UnitSearchService.initialize() is called
- **THEN** build MiniSearch index from canonical units
- **AND** add any existing custom units to the index

---

### Requirement: Full-Text Unit Search

The system SHALL search units by text query across name, chassis, and variant.

**Rationale**: Users need to quickly find units by name or partial match.

**Priority**: High

#### Scenario: Search by name
- **GIVEN** the search index is initialized
- **WHEN** search("Warhammer") is called
- **THEN** return units with "Warhammer" in name or chassis

#### Scenario: Fuzzy search
- **GIVEN** the search index is initialized
- **WHEN** search("Warhmmer") is called with typo
- **THEN** return Warhammer units via fuzzy matching

#### Scenario: No results
- **GIVEN** the search index is initialized
- **WHEN** search("xyznonexistent") is called
- **THEN** return empty array

---

### Requirement: Dynamic Search Index Updates

The system SHALL update the search index when custom units change.

**Rationale**: Custom units must be searchable immediately after creation.

**Priority**: Medium

#### Scenario: Add to index
- **GIVEN** a new custom unit is created
- **WHEN** addToIndex(unitEntry) is called
- **THEN** the unit is immediately searchable

#### Scenario: Remove from index
- **GIVEN** a custom unit is deleted
- **WHEN** removeFromIndex(id) is called
- **THEN** the unit no longer appears in search results

---

### Requirement: Unit Factory Service

The system SHALL convert ISerializedUnit data to runtime IBattleMech objects.

**Rationale**: JSON files store serialized data; runtime requires fully typed objects with calculated values.

**Priority**: Critical

#### Scenario: Create from serialized data
- **GIVEN** valid ISerializedUnit JSON data
- **WHEN** UnitFactoryService.createFromSerialized(data) is called
- **THEN** return IUnitFactoryResult with success=true and unit object
- **AND** unit SHALL be a complete IBattleMech

#### Scenario: Parse engine configuration
- **GIVEN** serialized engine { type: "XL", rating: 300 }
- **WHEN** converting to IBattleMech
- **THEN** parse engine type string to EngineType enum
- **AND** calculate engine weight based on type and rating
- **AND** populate IEngineConfiguration

#### Scenario: Parse gyro configuration
- **GIVEN** serialized gyro { type: "STANDARD" }
- **WHEN** converting to IBattleMech
- **THEN** parse gyro type string to GyroType enum
- **AND** calculate gyro weight based on engine rating
- **AND** populate IGyroConfiguration

#### Scenario: Build armor allocation
- **GIVEN** serialized armor with location values
- **WHEN** converting to IBattleMech
- **THEN** map string locations to MechLocation enum
- **AND** handle front/rear armor for torso locations
- **AND** populate IArmorAllocation

#### Scenario: Resolve equipment references
- **GIVEN** serialized equipment array with IDs
- **WHEN** converting to IBattleMech
- **THEN** resolve each equipment ID via EquipmentRegistry
- **AND** create IMountedEquipment for each item
- **AND** log warnings for unresolved equipment

#### Scenario: Build critical slots
- **GIVEN** serialized critical slots per location
- **WHEN** converting to IBattleMech
- **THEN** map string locations to MechLocation enum
- **AND** create ICriticalSlotAssignment for each location
- **AND** maintain correct slot counts (6 for head/legs, 12 for arms/torsos)

#### Scenario: Calculate derived values
- **GIVEN** a complete ISerializedUnit
- **WHEN** creating IBattleMech
- **THEN** calculate total weight from components
- **AND** determine weight class from tonnage
- **AND** calculate structure points per location

#### Scenario: Factory error handling
- **GIVEN** invalid or incomplete serialized data
- **WHEN** UnitFactoryService.createFromSerialized(data) is called
- **THEN** return IUnitFactoryResult with success=false
- **AND** include descriptive error messages
- **AND** unit SHALL be null

---

### Requirement: Era-Based Unit Organization

The system SHALL organize canonical units by era with numbered prefixes.

**Rationale**: Numbered prefixes ensure correct chronological sorting in file browsers and APIs.

**Priority**: High

#### Scenario: Era folder structure
- **GIVEN** units are stored in `public/data/units/battlemechs/`
- **WHEN** accessing the directory
- **THEN** era folders SHALL have numbered prefixes:
  - `1-age-of-war/`
  - `2-star-league/`
  - `3-succession-wars/`
  - `4-clan-invasion/`
  - `5-civil-war/`
  - `6-dark-age/`
  - `7-ilclan/`

#### Scenario: Rules level sub-folders
- **GIVEN** an era folder exists
- **WHEN** accessing units within the era
- **THEN** units SHALL be organized by rules level:
  - `standard/` - Rules Level 1
  - `advanced/` - Rules Level 2
  - `experimental/` - Rules Level 3

#### Scenario: Unit file naming
- **GIVEN** a unit with chassis "Atlas" and model "AS7-D"
- **WHEN** storing the unit file
- **THEN** filename SHALL be `Atlas AS7-D.json`
- **AND** invalid characters SHALL be replaced with `-`

---

### Requirement: Unit Index Structure

The system SHALL maintain a master index of all canonical units.

**Rationale**: Index enables fast browsing without loading full unit data.

**Priority**: Critical

#### Scenario: Master index location
- **GIVEN** units are stored in `public/data/units/battlemechs/`
- **WHEN** accessing the index
- **THEN** index SHALL be at `public/data/units/battlemechs/index.json`

#### Scenario: Index entry format
- **GIVEN** a unit in the index
- **THEN** entry SHALL contain:
  - `id` - Unique unit identifier (e.g., "atlas-as7-d")
  - `chassis` - Base chassis name (e.g., "Atlas")
  - `model` - Variant designation (e.g., "AS7-D")
  - `tonnage` - Unit weight in tons (e.g., 100)
  - `techBase` - INNER_SPHERE, CLAN, or MIXED
  - `year` - Introduction year (e.g., 2755)
  - `role` - Combat role (e.g., "Juggernaut")
  - `path` - Relative path to full JSON file

#### Scenario: Index metadata
- **GIVEN** the index.json file
- **THEN** metadata SHALL include:
  - `version` - Format version string
  - `generatedAt` - ISO timestamp of generation
  - `totalUnits` - Total count of units in index

---

### Requirement: MTF Import Service

The system SHALL import and validate pre-converted unit JSON data.

**Rationale**: Units converted from MTF format need validation and equipment resolution.

**Priority**: High

#### Scenario: Import from JSON
- **GIVEN** valid ISerializedUnit JSON data
- **WHEN** MTFImportService.importFromJSON(data) is called
- **THEN** validate the data structure
- **AND** resolve equipment references
- **AND** return IImportResult with success status

#### Scenario: Validate unit data
- **GIVEN** ISerializedUnit data
- **WHEN** MTFImportService.validate(data) is called
- **THEN** check required fields (id, chassis, model, tonnage)
- **AND** validate enum values (techBase, rulesLevel, era)
- **AND** return IValidationResult with errors array

#### Scenario: Resolve equipment
- **GIVEN** unit with equipment IDs
- **WHEN** MTFImportService.resolveEquipment(equipmentIds) is called
- **THEN** look up each ID in EquipmentRegistry
- **AND** return IEquipmentResolution with found and missing lists

---

