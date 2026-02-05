## MODIFIED Requirements

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

## ADDED Requirements

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

## REMOVED Requirements

### Requirement: Clear Store

**Reason**: Replaced by explicit delete operations. Bulk clear is dangerous and rarely needed.

**Migration**: Use individual delete operations or database reset utility.

---
