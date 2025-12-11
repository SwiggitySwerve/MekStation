# Persistence Services Specification

**Status**: Draft
**Version**: 1.0
**Last Updated**: 2025-11-30
**Dependencies**: unit-entity-model, serialization-formats
**Affects**: unit-services

---

## Overview

### Purpose

Provides browser-based persistence and file I/O services. Handles IndexedDB storage for custom units and JSON file export/import.

### Scope

**In Scope:**
- IndexedDB database initialization and management
- Generic CRUD operations on object stores
- JSON file export (single unit, batch with ZIP)
- JSON file import with validation

**Out of Scope:**
- Cloud storage or sync
- Server-side persistence
- MTF or other legacy format support (future enhancement)

### Key Concepts

- **Object Store**: IndexedDB table equivalent
- **Import Result**: Validation status and parsed unit data
- **Batch Export**: Multiple units packaged as ZIP archive

---

## ADDED Requirements

### Requirement: Database Initialization

The system SHALL initialize IndexedDB on first access.

**Rationale**: Database must exist before any storage operations.

**Priority**: Critical

#### Scenario: First initialization
- **GIVEN** the database does not exist
- **WHEN** IndexedDBService.initialize() is called
- **THEN** create database "mekstation"
- **AND** create object stores: "custom-units", "unit-metadata"

#### Scenario: Upgrade schema
- **GIVEN** an older database version exists
- **WHEN** initialize() is called with newer schema version
- **THEN** migrate data to new schema

#### Scenario: Already initialized
- **GIVEN** the database is already open
- **WHEN** initialize() is called again
- **THEN** return immediately without error

---

### Requirement: Generic Put Operation

The system SHALL store a value by key in a specified object store.

**Rationale**: Core write operation for all persistence.

**Priority**: Critical

#### Scenario: Store new item
- **GIVEN** an initialized database
- **WHEN** put("custom-units", "unit-123", unitData) is called
- **THEN** store the data under key "unit-123"

#### Scenario: Update existing item
- **GIVEN** an item exists at key "unit-123"
- **WHEN** put("custom-units", "unit-123", newData) is called
- **THEN** replace the existing data

---

### Requirement: Generic Get Operation

The system SHALL retrieve a value by key from a specified object store.

**Rationale**: Core read operation for all persistence.

**Priority**: Critical

#### Scenario: Get existing item
- **GIVEN** an item exists at key "unit-123"
- **WHEN** get("custom-units", "unit-123") is called
- **THEN** return the stored data

#### Scenario: Get non-existent item
- **GIVEN** no item at key "unit-999"
- **WHEN** get("custom-units", "unit-999") is called
- **THEN** return undefined

---

### Requirement: Generic Delete Operation

The system SHALL remove a value by key from a specified object store.

**Rationale**: Users need to delete custom units.

**Priority**: Critical

#### Scenario: Delete existing item
- **GIVEN** an item exists at key "unit-123"
- **WHEN** delete("custom-units", "unit-123") is called
- **THEN** remove the item from storage

#### Scenario: Delete non-existent item
- **GIVEN** no item at key "unit-999"
- **WHEN** delete("custom-units", "unit-999") is called
- **THEN** complete without error (idempotent)

---

### Requirement: Get All Items

The system SHALL retrieve all values from a specified object store.

**Rationale**: Listing all custom units.

**Priority**: High

#### Scenario: Get all items
- **GIVEN** 5 items in "custom-units" store
- **WHEN** getAll("custom-units") is called
- **THEN** return array of all 5 stored values

#### Scenario: Empty store
- **GIVEN** no items in store
- **WHEN** getAll("custom-units") is called
- **THEN** return empty array

---

### Requirement: Clear Store

The system SHALL remove all items from a specified object store.

**Rationale**: Reset/cleanup functionality.

**Priority**: Medium

#### Scenario: Clear store
- **GIVEN** items exist in "custom-units" store
- **WHEN** clear("custom-units") is called
- **THEN** remove all items from the store

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

## Data Model Requirements

### Required Interfaces

```typescript
/**
 * IndexedDB service interface
 */
interface IIndexedDBService {
  initialize(): Promise<void>;
  put<T>(store: string, key: string, value: T): Promise<void>;
  get<T>(store: string, key: string): Promise<T | undefined>;
  delete(store: string, key: string): Promise<void>;
  getAll<T>(store: string): Promise<T[]>;
  clear(store: string): Promise<void>;
}

/**
 * Import result
 */
interface IImportResult {
  readonly success: boolean;
  readonly filename: string;
  readonly unit?: IFullUnit;
  readonly errors?: string[];
}

/**
 * File service interface
 */
interface IFileService {
  exportUnit(unit: IFullUnit, filename?: string): void;
  exportBatch(units: IFullUnit[], filename?: string): void;
  importUnit(file: File): Promise<IImportResult>;
  importBatch(files: File[]): Promise<IImportResult[]>;
  validateFile(file: File): Promise<IValidationResult>;
}
```

---

## Dependencies

### Depends On
- **unit-entity-model**: IFullUnit definition
- **serialization-formats**: JSON schema for validation

### Used By
- **unit-services**: CustomUnitService storage backend

---

## Implementation Notes

### Performance Considerations
- IndexedDB operations are asynchronous; use proper error handling
- Large batch exports may need progress indication
- Consider file size limits for imports

### Edge Cases
- Handle browser storage quota exceeded
- Handle corrupted IndexedDB gracefully
- Validate file extensions before processing

### Browser Compatibility
- IndexedDB is supported in all modern browsers
- File download uses `<a>` element with blob URL
- ZIP creation requires jszip library

---

## References

### Related Documentation
- `docs/architecture/SERVICE_LAYER_PLAN.md`
- MDN IndexedDB documentation
- `src/types/unit/DatabaseSchema.ts`

