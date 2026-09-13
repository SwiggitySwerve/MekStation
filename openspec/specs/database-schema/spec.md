# database-schema Specification

## Purpose

Defines static JSON storage for official data, server-side SQLite storage for saved custom units and versions, and browser-local storage for editing drafts and remaining local services. Each layer has a distinct authority and lifetime.

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

Library-save-supported customizer tabs SHALL persist library designs through the custom-unit REST API and server-side UnitRepository, with SQLite `custom_units` and `unit_versions` records. Browser draft storage and remaining IndexedDB services SHALL remain separate from a successful server library save.

**Source**: `src/components/customizer/tabs/MultiUnitTabsUnitState.ts:23-39`, `src/components/customizer/tabs/useMultiUnitTabsController.dialogs.ts:151-320`, `src/services/units/UnitRepository.ts:72-235`, `src/services/persistence/SQLiteService.migrations.ts:77-104`

#### Scenario: Save a library design

- **GIVEN** a tab supports library save
- **WHEN** the customizer receives a successful `CustomUnitApiService.create` or `.save` response with an id and positive integer version
- **THEN** the server SHALL create or update the authoritative custom-unit row and version history
- **AND** the customizer SHALL record that returned library identity and version as its library-save receipt
- **AND** a failed or receipt-less response SHALL NOT mark the draft as a library save

#### Scenario: Browser draft recovery

- **WHEN** an editor draft is written locally or reloaded
- **THEN** its construction and last known library-save receipt SHALL be recovered independently
- **AND** a browser write alone SHALL NOT claim that the server library version changed
- **AND** a browser-draft failure after a successful library response SHALL preserve the successful server outcome while warning that the draft write failed
- **AND** session Undo/Redo SHALL follow customizer-edit-recovery

#### Scenario: Remaining IndexedDB consumers

- **WHEN** a legacy or local-only service initializes IndexedDB
- **THEN** its `custom-units`, `unit-metadata`, and `custom-formulas` stores SHALL retain their existing behavior
- **AND** those records SHALL NOT be represented as a customizer library-save receipt or server combat eligibility
- **AND** custom-equipment storage SHALL NOT be assumed to exist without a separately implemented schema

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
- **THEN** a local merged query MAY include both official (static) and IndexedDB custom data
- **AND** custom items MAY override official items with same ID
- **AND** that local result SHALL NOT establish a server library-save receipt

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
