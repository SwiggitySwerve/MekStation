# persistence-services Specification

## Purpose

TBD - created by archiving change add-service-layer. Update Purpose after archive.

## Requirements

### Requirement: Database Initialization

The system SHALL initialize SQLite database on application startup.

**Rationale**: Database must exist before any storage operations. SQLite replaces IndexedDB for cross-platform support.

**Priority**: Critical

#### Scenario: First initialization

- **GIVEN** the database file does not exist
- **WHEN** SQLiteService.initialize() is called
- **THEN** create database file at configured path
- **AND** run schema migrations to create tables

#### Scenario: Existing database

- **GIVEN** the database file exists
- **WHEN** SQLiteService.initialize() is called
- **THEN** open existing database
- **AND** run any pending migrations

#### Scenario: Database location configuration

- **GIVEN** environment variable `DATABASE_PATH` is set
- **WHEN** initializing database
- **THEN** use the configured path for database file
- **AND** default to `./data/mekstation.db` if not set

---

### Requirement: Generic Put Operation

The system SHALL store a unit by ID in the custom_units table.

**Rationale**: Core write operation for unit persistence.

**Priority**: Critical

#### Scenario: Store new unit

- **GIVEN** an initialized database
- **WHEN** UnitRepository.create(unitData) is called
- **THEN** insert the unit into custom_units table
- **AND** create version 1 entry in unit_versions table
- **AND** return the generated unit ID

#### Scenario: Update existing unit

- **GIVEN** a unit exists with ID "unit-123"
- **WHEN** UnitRepository.update("unit-123", newData) is called
- **THEN** update the unit in custom_units table
- **AND** increment current_version
- **AND** create new entry in unit_versions table with incremented version

---

### Requirement: Generic Get Operation

The system SHALL retrieve a unit by ID from the custom_units table.

**Rationale**: Core read operation for unit persistence.

**Priority**: Critical

#### Scenario: Get existing unit

- **GIVEN** a unit exists with ID "unit-123"
- **WHEN** UnitRepository.getById("unit-123") is called
- **THEN** return the stored unit data with current version

#### Scenario: Get non-existent unit

- **GIVEN** no unit at ID "unit-999"
- **WHEN** UnitRepository.getById("unit-999") is called
- **THEN** return null

---

### Requirement: Generic Delete Operation

The system SHALL remove a unit and its version history by ID.

**Rationale**: Users need to delete custom units they no longer want.

**Priority**: Critical

#### Scenario: Delete existing unit

- **GIVEN** a unit exists with ID "unit-123" with 5 versions
- **WHEN** UnitRepository.delete("unit-123") is called
- **THEN** remove the unit from custom_units table
- **AND** cascade delete all entries from unit_versions table

#### Scenario: Delete non-existent unit

- **GIVEN** no unit at ID "unit-999"
- **WHEN** UnitRepository.delete("unit-999") is called
- **THEN** complete without error (idempotent)

---

### Requirement: Get All Items

The system SHALL retrieve all custom units as index entries.

**Rationale**: Listing all custom units for browsing and search.

**Priority**: High

#### Scenario: Get all units

- **GIVEN** 5 units in custom_units table
- **WHEN** UnitRepository.list() is called
- **THEN** return array of 5 unit index entries (id, chassis, variant, tonnage, techBase, era, version)

#### Scenario: Empty database

- **GIVEN** no units in database
- **WHEN** UnitRepository.list() is called
- **THEN** return empty array

---

### Requirement: Export Single Unit

The system SHALL export a unit as a JSON file download.

**Rationale**: Users need to save their work locally.

**Priority**: Critical

#### Scenario: Export unit

- **GIVEN** a valid IFullUnit
- **WHEN** FileService.exportUnit(unit) is called
- **THEN** trigger browser download of JSON file
- **AND** filename defaults to "{chassis}-{variant}.json"

#### Scenario: Custom filename

- **GIVEN** a valid IFullUnit
- **WHEN** exportUnit(unit, "my-custom-mech.json") is called
- **THEN** trigger download with specified filename

---

### Requirement: Export Batch Units

The system SHALL export multiple units as a ZIP archive.

**Rationale**: Convenient bulk export of custom units.

**Priority**: Medium

#### Scenario: Export multiple units

- **GIVEN** 3 valid IFullUnit objects
- **WHEN** exportBatch(units) is called
- **THEN** trigger download of ZIP file
- **AND** ZIP contains 3 JSON files

#### Scenario: Custom batch filename

- **GIVEN** multiple units
- **WHEN** exportBatch(units, "my-lance.zip") is called
- **THEN** download with specified filename

---

### Requirement: Import Single Unit

The system SHALL import a unit from a JSON file.

**Rationale**: Users need to load previously exported units.

**Priority**: Critical

#### Scenario: Valid import

- **GIVEN** a valid JSON file matching unit schema
- **WHEN** FileService.importUnit(file) is called
- **THEN** return IImportResult with success = true
- **AND** include parsed IFullUnit

#### Scenario: Invalid JSON

- **GIVEN** a file with invalid JSON
- **WHEN** importUnit(file) is called
- **THEN** return IImportResult with success = false
- **AND** include error message

#### Scenario: Schema validation failure

- **GIVEN** valid JSON but wrong structure
- **WHEN** importUnit(file) is called
- **THEN** return IImportResult with success = false
- **AND** list specific validation errors

---

### Requirement: Import Batch Units

The system SHALL import multiple units from multiple files.

**Rationale**: Bulk import convenience.

**Priority**: Medium

#### Scenario: Import multiple files

- **GIVEN** 3 valid JSON files
- **WHEN** importBatch(files) is called
- **THEN** return array of 3 IImportResult objects

#### Scenario: Mixed success/failure

- **GIVEN** 2 valid files and 1 invalid
- **WHEN** importBatch(files) is called
- **THEN** return 2 successful results and 1 failure

---

### Requirement: Validate Import File

The system SHALL validate a file without importing it.

**Rationale**: Preview validation before committing import.

**Priority**: Medium

#### Scenario: Validate valid file

- **GIVEN** a valid unit JSON file
- **WHEN** validateFile(file) is called
- **THEN** return IValidationResult with isValid = true

#### Scenario: Validate invalid file

- **GIVEN** an invalid file
- **WHEN** validateFile(file) is called
- **THEN** return IValidationResult with specific errors

---

### Requirement: Unique Name Constraint

The system SHALL enforce unique chassis + variant combinations for custom units.

**Rationale**: Prevents confusion from duplicate unit names.

**Priority**: Critical

#### Scenario: Create with unique name

- **GIVEN** no unit named "Atlas Custom-1" exists
- **WHEN** creating unit with chassis="Atlas" variant="Custom-1"
- **THEN** create succeeds

#### Scenario: Create with duplicate name

- **GIVEN** a unit named "Atlas Custom-1" already exists
- **WHEN** creating unit with chassis="Atlas" variant="Custom-1"
- **THEN** return error with code "DUPLICATE_NAME"
- **AND** suggest next available name "Atlas Custom-2"

#### Scenario: Find by name

- **GIVEN** a unit with chassis="Atlas" variant="AS7-D-Custom-1" exists
- **WHEN** UnitRepository.findByName("Atlas", "AS7-D-Custom-1") is called
- **THEN** return the matching unit

---

### Requirement: Database Connection Management

The system SHALL manage SQLite connection lifecycle.

**Rationale**: Proper connection handling prevents resource leaks and corruption.

**Priority**: High

#### Scenario: WAL mode for concurrency

- **GIVEN** database is initialized
- **WHEN** connection is established
- **THEN** enable WAL (Write-Ahead Logging) mode
- **AND** allow concurrent readers with single writer

#### Scenario: Graceful shutdown

- **GIVEN** database connection is open
- **WHEN** application shuts down
- **THEN** close connection cleanly
- **AND** checkpoint WAL to main database file

---
