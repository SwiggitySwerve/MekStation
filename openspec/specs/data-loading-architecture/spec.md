# data-loading-architecture Specification

## Purpose

Defines the data-driven architecture for loading equipment and unit data from static JSON files. This approach separates data from code, enabling easy updates, user customization, and MegaMek compatibility.

## Requirements

### Requirement: Directory Structure

The system SHALL organize data files in a hierarchical directory structure under `public/data/`.

**Rationale**: Consistent organization enables predictable file access and logical grouping.

**Priority**: Critical

#### Scenario: Equipment directory structure
- **GIVEN** the application needs equipment data
- **WHEN** accessing `public/data/equipment/`
- **THEN** structure SHALL be:
  - `_schema/` - JSON Schema validation files
  - `official/` - Official BattleTech equipment
  - `custom/` - User-defined equipment
  - `name-mappings.json` - MTF name to canonical ID mappings

#### Scenario: Unit directory structure
- **GIVEN** the application needs unit data
- **WHEN** accessing `public/data/units/battlemechs/`
- **THEN** structure SHALL be organized by era with numbered prefixes:
  - `1-age-of-war/`
  - `2-star-league/`
  - `3-succession-wars/`
  - `4-clan-invasion/`
  - `5-civil-war/`
  - `6-dark-age/`
  - `7-ilclan/`

#### Scenario: Rules level sub-organization
- **GIVEN** a unit era folder exists
- **WHEN** accessing units within that era
- **THEN** units SHALL be organized by rules level:
  - `standard/`
  - `advanced/`
  - `experimental/`

---

### Requirement: Equipment JSON Files

The system SHALL store equipment definitions in JSON files organized by category.

**Rationale**: Separating equipment by category improves load times and maintainability.

**Priority**: Critical

#### Scenario: Weapon files
- **GIVEN** weapon equipment needs to be loaded
- **WHEN** accessing `public/data/equipment/official/weapons/`
- **THEN** weapons SHALL be organized as:
  - `energy.json` - Lasers, PPCs, flamers
  - `ballistic.json` - Autocannons, machine guns, Gauss
  - `missile.json` - LRMs, SRMs, MRMs
  - `physical.json` - Hatchets, swords, claws

#### Scenario: Other equipment files
- **GIVEN** non-weapon equipment needs to be loaded
- **WHEN** accessing `public/data/equipment/official/`
- **THEN** equipment SHALL be in category files:
  - `ammunition.json` - All ammunition types
  - `electronics.json` - Sensors, ECM, targeting systems
  - `miscellaneous.json` - MASC, TSM, jump jets, heat sinks

#### Scenario: Equipment index
- **GIVEN** equipment files have been loaded
- **WHEN** accessing `public/data/equipment/official/index.json`
- **THEN** index SHALL list all equipment files and item counts

---

### Requirement: Unit JSON Files

The system SHALL store unit definitions as individual JSON files matching the ISerializedUnit schema.

**Rationale**: Individual files enable lazy loading and reduce memory usage.

**Priority**: Critical

#### Scenario: Unit file naming
- **GIVEN** a unit needs to be stored
- **WHEN** writing the unit file
- **THEN** filename SHALL be `{Chassis} {Model}.json`
- **AND** filename SHALL have invalid characters replaced with `-`

#### Scenario: Unit file location
- **GIVEN** a unit with introduction year 3050 and Advanced rules level
- **WHEN** determining file location
- **THEN** path SHALL be `public/data/units/battlemechs/4-clan-invasion/advanced/{filename}.json`

#### Scenario: Unit index file
- **GIVEN** units exist in an era folder
- **WHEN** accessing `public/data/units/battlemechs/index.json`
- **THEN** index SHALL contain:
  - `version` - Format version string
  - `generatedAt` - ISO timestamp
  - `totalUnits` - Total unit count
  - `units` - Array of unit metadata (id, chassis, model, tonnage, techBase, year, role, path)

---

### Requirement: JSON Schema Validation

The system SHALL validate equipment and unit data against JSON Schema definitions.

**Rationale**: Schema validation ensures data integrity and catches errors early.

**Priority**: High

#### Scenario: Equipment schema files
- **GIVEN** equipment data needs validation
- **WHEN** accessing `public/data/equipment/_schema/`
- **THEN** schemas SHALL exist for:
  - `weapon-schema.json`
  - `ammunition-schema.json`
  - `electronics-schema.json`
  - `misc-equipment-schema.json`
  - `physical-weapon-schema.json`
  - `unit-schema.json`

#### Scenario: Schema validation on load
- **GIVEN** JSON data is being loaded
- **WHEN** the loader processes the data
- **THEN** data SHOULD be validated against the appropriate schema
- **AND** validation errors SHALL be logged with details

---

### Requirement: Index-Based Catalog Loading

The system SHALL use index files for fast catalog browsing without loading full data.

**Rationale**: Index files contain lightweight metadata enabling fast search and filtering.

**Priority**: High

#### Scenario: Load unit catalog
- **GIVEN** the application is starting
- **WHEN** loading the unit catalog
- **THEN** system SHALL load only `index.json` initially
- **AND** full unit data SHALL be lazy-loaded on demand

#### Scenario: Index metadata
- **GIVEN** a unit index entry
- **THEN** entry SHALL contain:
  - `id` - Unique unit identifier
  - `chassis` - Base chassis name
  - `model` - Variant designation
  - `tonnage` - Unit weight in tons
  - `techBase` - INNER_SPHERE, CLAN, or MIXED
  - `year` - Introduction year
  - `role` - Combat role (Juggernaut, Skirmisher, etc.)
  - `path` - Relative path to full JSON file

---

### Requirement: Era-Based Organization

The system SHALL organize units by BattleTech era using numbered prefixes.

**Rationale**: Numbered prefixes ensure correct chronological sorting in file systems.

**Priority**: High

#### Scenario: Era folder mapping
- **GIVEN** a unit with a specific introduction year
- **WHEN** determining the era folder
- **THEN** mapping SHALL be:
  - Year < 2005: `0-early-spaceflight`
  - Year 2005-2570: `1-age-of-war`
  - Year 2571-2780: `2-star-league`
  - Year 2781-3049: `3-succession-wars`
  - Year 3050-3067: `4-clan-invasion`
  - Year 3068-3080: `5-civil-war`
  - Year 3081-3151: `6-dark-age`
  - Year 3152+: `7-ilclan`

---

### Requirement: Static vs Dynamic Data Sources

The system SHALL distinguish between static (bundled) and dynamic (user-created) data.

**Rationale**: Official data is read-only; user data requires persistence.

**Priority**: High

#### Scenario: Official data access
- **GIVEN** official equipment or units
- **WHEN** accessing the data
- **THEN** data SHALL be loaded from `public/data/` (static files)
- **AND** data SHALL NOT be modifiable by the user

#### Scenario: Custom data access
- **GIVEN** user-created equipment or units
- **WHEN** accessing the data
- **THEN** data SHALL be loaded from IndexedDB (dynamic storage)
- **AND** data SHALL support CRUD operations

#### Scenario: Merged data view
- **GIVEN** both official and custom data exist
- **WHEN** querying equipment or units
- **THEN** results SHALL include both sources
- **AND** custom items MAY override official items by ID

---

### Requirement: Equipment Name Mapping

The system SHALL map legacy MTF equipment names to canonical IDs.

**Rationale**: MegaMek files use various naming conventions; mapping ensures compatibility.

**Priority**: High

#### Scenario: Load name mappings
- **GIVEN** the application is initializing
- **WHEN** loading equipment
- **THEN** system SHALL load `public/data/equipment/name-mappings.json`

#### Scenario: Resolve equipment name
- **GIVEN** an MTF file contains "Medium Laser"
- **WHEN** resolving the equipment reference
- **THEN** mapper SHALL return canonical ID "medium-laser"

#### Scenario: Unknown equipment name
- **GIVEN** an MTF file contains an unrecognized name
- **WHEN** resolving the equipment reference
- **THEN** mapper SHALL return null
- **AND** system SHALL log a warning

---

