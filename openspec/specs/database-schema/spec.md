# database-schema Specification

## Purpose

Defines the data storage architecture using a combination of static JSON files for official data and IndexedDB for user-created custom data. This hybrid approach enables fast initial load of bundled data while supporting persistent user customization.

## Requirements

### Requirement: Static Data Storage

The system SHALL store official equipment and units in static JSON files.

**Rationale**: Static files enable bundling with the application and fast initial load without database setup.

**Priority**: Critical

#### Scenario: Equipment file location

- **GIVEN** official equipment data
- **WHEN** determining storage location
- **THEN** equipment SHALL be stored in `public/data/equipment/official/`
- **AND** equipment SHALL be organized by category (weapons, ammunition, electronics, miscellaneous)

#### Scenario: Unit file location

- **GIVEN** official unit data
- **WHEN** determining storage location
- **THEN** units SHALL be stored in `public/data/units/battlemechs/`
- **AND** units SHALL be organized by era and rules level

#### Scenario: Static data is read-only

- **GIVEN** official data loaded from static files
- **WHEN** user attempts to modify
- **THEN** modifications SHALL NOT affect the original files
- **AND** modifications SHALL be stored as custom data

---

### Requirement: Dynamic Data Storage

The system SHALL store user-created data in IndexedDB.

**Rationale**: IndexedDB provides persistent browser storage for custom units and equipment.

**Priority**: Critical

#### Scenario: IndexedDB database

- **GIVEN** the application needs custom data storage
- **WHEN** initializing persistence
- **THEN** create database named "mekstation"
- **AND** database version SHALL be incremented for schema changes

#### Scenario: Custom units store

- **GIVEN** IndexedDB is initialized
- **THEN** "custom-units" object store SHALL exist
- **AND** store SHALL use unit ID as key
- **AND** store SHALL contain serialized ISerializedUnit data

#### Scenario: Custom equipment store

- **GIVEN** IndexedDB is initialized
- **THEN** "custom-equipment" object store SHALL exist
- **AND** store SHALL use equipment ID as key
- **AND** store SHALL support weapons, ammunition, and misc equipment

#### Scenario: Custom formulas store

- **GIVEN** IndexedDB is initialized
- **THEN** "custom-formulas" object store SHALL exist
- **AND** store SHALL contain variable equipment formulas
- **AND** formulas SHALL be keyed by equipment ID

---

### Requirement: Equipment Database Schema

The system SHALL define equipment record structure.

**Rationale**: Consistent schema enables reliable querying and validation.

**Priority**: Critical

#### Scenario: Common equipment fields

- **GIVEN** any equipment record
- **THEN** it MUST contain:
  - `id` - Unique identifier string
  - `name` - Display name
  - `category` - Equipment category
  - `techBase` - INNER_SPHERE, CLAN, or BOTH
  - `rulesLevel` - INTRODUCTORY, STANDARD, ADVANCED, or EXPERIMENTAL
  - `weight` - Weight in tons
  - `criticalSlots` - Number of critical slots
  - `costCBills` - Cost in C-Bills
  - `battleValue` - Battle Value points
  - `introductionYear` - Year of introduction

#### Scenario: Weapon-specific fields

- **GIVEN** a weapon equipment record
- **THEN** it MUST additionally contain:
  - `damage` - Damage value or damage object
  - `heat` - Heat generated when fired
  - `ranges` - Object with minimum, short, medium, long ranges

#### Scenario: Ammunition-specific fields

- **GIVEN** an ammunition equipment record
- **THEN** it MUST additionally contain:
  - `compatibleWeaponIds` - Array of weapon IDs this ammo works with
  - `shotsPerTon` - Number of shots per ton

---

### Requirement: Unit Database Schema

The system SHALL define unit record structure matching ISerializedUnit.

**Rationale**: Units are complex composite objects requiring detailed schema.

**Priority**: Critical

#### Scenario: Unit identity fields

- **GIVEN** a unit record
- **THEN** it MUST contain:
  - `id` - Unique identifier
  - `chassis` - Base chassis name
  - `model` - Variant designation
  - `unitType` - BattleMech, Vehicle, etc.
  - `tonnage` - Weight in tons

#### Scenario: Unit classification fields

- **GIVEN** a unit record
- **THEN** it MUST contain:
  - `techBase` - tech base
  - `rulesLevel` - Rules level
  - `era` - BattleTech era
  - `year` - Introduction year

#### Scenario: Unit structural components

- **GIVEN** a unit record
- **THEN** it MUST contain:
  - `engine` - Engine configuration
  - `gyro` - Gyro configuration
  - `structure` - Internal structure configuration
  - `armor` - Armor type and allocation
  - `heatSinks` - Heat sink configuration
  - `movement` - Movement capabilities

#### Scenario: Unit equipment and slots

- **GIVEN** a unit record
- **THEN** it MUST contain:
  - `equipment` - Array of mounted equipment
  - `criticalSlots` - Critical slot assignments per location

---

### Requirement: Index Files

The system SHALL maintain index files for fast catalog browsing.

**Rationale**: Index files enable searching and filtering without loading full data.

**Priority**: High

#### Scenario: Equipment index

- **GIVEN** equipment files are loaded
- **THEN** `public/data/equipment/official/index.json` SHALL contain:
  - List of all equipment categories
  - Count of items per category
  - File paths for each category

#### Scenario: Unit index

- **GIVEN** unit files exist
- **THEN** `public/data/units/battlemechs/index.json` SHALL contain:
  - Metadata (version, generatedAt, totalUnits)
  - Array of unit summary entries
  - Each entry with id, chassis, model, tonnage, techBase, year, role, path

---

### Requirement: Schema Validation Files

The system SHALL provide JSON Schema files for validation.

**Rationale**: Schema validation ensures data integrity at load time.

**Priority**: Medium

#### Scenario: Schema file location

- **GIVEN** validation schemas are needed
- **WHEN** accessing schemas
- **THEN** schemas SHALL be in `public/data/equipment/_schema/`

#### Scenario: Available schemas

- **GIVEN** the schema directory
- **THEN** it SHALL contain:
  - `weapon-schema.json` - For weapon validation
  - `ammunition-schema.json` - For ammunition validation
  - `electronics-schema.json` - For electronics validation
  - `misc-equipment-schema.json` - For miscellaneous equipment
  - `physical-weapon-schema.json` - For physical weapons
  - `unit-schema.json` - For unit validation

---

### Requirement: Query Interface

The system SHALL provide efficient query capabilities.

**Rationale**: Users need to search and filter data efficiently.

**Priority**: High

#### Scenario: Equipment query

- **WHEN** querying equipment
- **THEN** support filtering by:
  - Category (Energy, Ballistic, Missile, etc.)
  - Tech base (INNER_SPHERE, CLAN, BOTH)
  - Rules level (STANDARD, ADVANCED, EXPERIMENTAL)
  - Era/year
  - Name search

#### Scenario: Unit query

- **WHEN** querying units
- **THEN** support filtering by:
  - Tech base
  - Era
  - Weight class
  - Tonnage range
  - Role
  - Name/chassis search

#### Scenario: Combined data sources

- **WHEN** querying equipment or units
- **THEN** results SHALL include both official (static) and custom (IndexedDB) data
- **AND** custom items MAY override official items with same ID

---

### Requirement: Data Migration

The system SHALL handle data migration between versions.

**Rationale**: Schema changes require migrating existing user data.

**Priority**: Medium

#### Scenario: IndexedDB version upgrade

- **GIVEN** a newer IndexedDB schema version
- **WHEN** opening the database
- **THEN** run migration for each version increment
- **AND** preserve existing user data
- **AND** log migration actions

#### Scenario: Static file format changes

- **GIVEN** static file format changes between versions
- **WHEN** loading data
- **THEN** detect format version from metadata
- **AND** apply necessary transformations
- **AND** continue loading without data loss

---
