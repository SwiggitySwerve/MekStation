# Unit Services Specification

**Status**: Draft
**Version**: 1.0
**Last Updated**: 2025-11-30
**Dependencies**: core-entity-types, database-schema
**Affects**: construction-services, persistence-services

---

## Overview

### Purpose

Provides access to BattleMech and other unit data through three specialized services: canonical units (read-only bundled data), custom units (user-created variants), and search functionality.

### Scope

**In Scope:**
- Loading and caching canonical unit data from static JSON
- CRUD operations for custom user-created units
- Full-text search across all units
- Unit filtering by criteria (tech base, era, weight class)

**Out of Scope:**
- Unit construction logic (see construction-services)
- Unit validation (see construction-services)
- File import/export (see persistence-services)

### Key Concepts

- **Canonical Unit**: Read-only unit from official BattleTech sources, bundled with application
- **Custom Unit**: User-created or modified variant stored in browser storage
- **Unit Index**: Lightweight metadata for search/browse (id, name, tonnage, techBase, era)
- **Full Unit**: Complete unit data including equipment, armor allocation, etc.

---

## ADDED Requirements

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
- **AND** return the complete IFullUnit object

#### Scenario: Unit not found
- **GIVEN** an invalid or unknown unit ID
- **WHEN** getById(unknownId) is called
- **THEN** return null

#### Scenario: Load multiple units
- **GIVEN** multiple valid unit IDs
- **WHEN** getByIds([id1, id2, id3]) is called
- **THEN** return array of IFullUnit objects in parallel
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
- **GIVEN** a valid IFullUnit object
- **WHEN** CustomUnitService.create(unit) is called
- **THEN** store the unit in IndexedDB
- **AND** return the generated unique ID

#### Scenario: Read custom unit
- **GIVEN** a custom unit exists with ID "custom-123"
- **WHEN** getById("custom-123") is called
- **THEN** return the complete IFullUnit from storage

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

## Data Model Requirements

### Required Interfaces

```typescript
/**
 * Lightweight unit metadata for search and browsing
 */
interface UnitIndexEntry {
  readonly id: string;
  readonly name: string;
  readonly chassis: string;
  readonly variant: string;
  readonly tonnage: number;
  readonly techBase: TechBase;
  readonly era: Era;
  readonly weightClass: WeightClass;
  readonly unitType: 'BattleMech' | 'Vehicle' | 'Infantry' | 'ProtoMech' | 'BattleArmor' | 'Aerospace';
  readonly filePath: string;
}

/**
 * Query criteria for filtering units
 */
interface UnitQueryCriteria {
  readonly techBase?: TechBase;
  readonly era?: Era;
  readonly weightClass?: WeightClass;
  readonly unitType?: UnitIndexEntry['unitType'];
  readonly minTonnage?: number;
  readonly maxTonnage?: number;
}

/**
 * Search options
 */
interface SearchOptions {
  readonly fuzzy?: boolean;
  readonly limit?: number;
  readonly fields?: string[];
}

/**
 * Canonical unit service interface
 */
interface ICanonicalUnitService {
  getIndex(): Promise<UnitIndexEntry[]>;
  getById(id: string): Promise<IFullUnit | null>;
  getByIds(ids: string[]): Promise<IFullUnit[]>;
  query(criteria: UnitQueryCriteria): Promise<UnitIndexEntry[]>;
}

/**
 * Custom unit service interface
 */
interface ICustomUnitService {
  create(unit: IFullUnit): Promise<string>;
  update(id: string, unit: IFullUnit): Promise<void>;
  delete(id: string): Promise<void>;
  getById(id: string): Promise<IFullUnit | null>;
  list(): Promise<UnitIndexEntry[]>;
  exists(id: string): Promise<boolean>;
}

/**
 * Unit search service interface
 */
interface IUnitSearchService {
  initialize(): Promise<void>;
  search(query: string, options?: SearchOptions): UnitIndexEntry[];
  addToIndex(unit: UnitIndexEntry): void;
  removeFromIndex(id: string): void;
  rebuildIndex(): Promise<void>;
}
```

---

## Dependencies

### Depends On
- **core-entity-types**: Base interfaces (IEntity, ITechBaseEntity)
- **database-schema**: IFullUnit definition
- **persistence-services**: IndexedDBService for custom unit storage

### Used By
- **construction-services**: Loads units for editing
- **UI components**: Browse and search units

---

## Implementation Notes

### Performance Considerations
- Index should be under 500KB for fast initial load
- Use LRU cache for recently accessed full unit data
- MiniSearch provides efficient client-side search

### Edge Cases
- Handle missing filePath gracefully (corrupted index)
- Custom unit IDs must not collide with canonical IDs (use "custom-" prefix)

---

## References

### Related Documentation
- `docs/architecture/SERVICE_LAYER_PLAN.md`
- `src/types/unit/DatabaseSchema.ts`

