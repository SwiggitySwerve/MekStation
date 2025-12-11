# Service Layer Architecture Plan

## Overview

This document outlines the service layer architecture for the MekStation application. The design separates concerns between canonical (read-only) unit data and user-created custom units, with a clean service abstraction layer.

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                         UI COMPONENTS                            │
│  (Pages, Compendium, Customizer, Equipment Browser)             │
├──────────────────────────────────────────────────────────────────┤
│                      ZUSTAND STORES                              │
│  EditorStore    │    SearchStore    │    UIStore                │
│  (current mech, │    (filters,      │    (modals,               │
│   dirty state)  │     results)      │     layout)               │
├──────────────────────────────────────────────────────────────────┤
│                      SERVICE LAYER                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Unit        │  │ Equipment   │  │ Construction│              │
│  │ Services    │  │ Services    │  │ Services    │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│  ┌─────────────────────────────────────────────────┐            │
│  │              Persistence Services               │            │
│  └─────────────────────────────────────────────────┘            │
├──────────────────────────────────────────────────────────────────┤
│                      DATA LAYER                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Static JSON │  │ IndexedDB   │  │ File I/O    │              │
│  │ (canonical) │  │ (custom)    │  │ (export)    │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└──────────────────────────────────────────────────────────────────┘
```

## Data Architecture

### Canonical Units (Read-Only)

**Location:** `public/data/units/`

```
public/data/units/
├── index.json              # Lightweight search index (~500KB)
│                           # Contains: id, name, tonnage, techBase, era, weightClass
├── battlemechs/
│   ├── light/              # 20-35 tons
│   │   ├── commando-com-2d.json
│   │   ├── spider-sdr-5v.json
│   │   └── ...
│   ├── medium/             # 40-55 tons
│   ├── heavy/              # 60-75 tons
│   └── assault/            # 80-100 tons
└── vehicles/
    └── ...
```

**Index Schema:**
```typescript
interface UnitIndexEntry {
  id: string;           // Unique identifier
  name: string;         // Display name
  chassis: string;      // Base chassis name
  variant: string;      // Variant designation
  tonnage: number;
  techBase: TechBase;
  era: Era;
  weightClass: WeightClass;
  unitType: 'BattleMech' | 'Vehicle' | 'Infantry' | 'ProtoMech';
  filePath: string;     // Relative path to full JSON
}
```

### Custom Units (Read-Write)

**Storage:** IndexedDB database `mekstation`

**Stores:**
- `custom-units` - User-created mech variants
- `unit-metadata` - Tags, favorites, last-modified timestamps

**Export Format:** JSON files matching canonical unit schema

---

## Service Definitions

### 1. Unit Services (`src/services/units/`)

#### CanonicalUnitService

Provides read-only access to bundled canonical units.

```typescript
interface ICanonicalUnitService {
  // Load the lightweight index for searching
  getIndex(): Promise<UnitIndexEntry[]>;
  
  // Get full unit data by ID (lazy loads from static JSON)
  getById(id: string): Promise<IFullUnit | null>;
  
  // Get multiple units by ID
  getByIds(ids: string[]): Promise<IFullUnit[]>;
  
  // Get units by criteria (filters index in memory)
  query(criteria: UnitQueryCriteria): Promise<UnitIndexEntry[]>;
}
```

#### CustomUnitService

CRUD operations for user-created variants stored in IndexedDB.

```typescript
interface ICustomUnitService {
  // Create new custom unit
  create(unit: IFullUnit): Promise<string>;
  
  // Update existing custom unit
  update(id: string, unit: IFullUnit): Promise<void>;
  
  // Delete custom unit
  delete(id: string): Promise<void>;
  
  // Get custom unit by ID
  getById(id: string): Promise<IFullUnit | null>;
  
  // List all custom units
  list(): Promise<UnitIndexEntry[]>;
  
  // Check if unit exists
  exists(id: string): Promise<boolean>;
}
```

#### UnitSearchService

MiniSearch-powered full-text search across all units.

```typescript
interface IUnitSearchService {
  // Initialize search index (call on app start)
  initialize(): Promise<void>;
  
  // Search units by query string
  search(query: string, options?: SearchOptions): UnitIndexEntry[];
  
  // Add custom unit to search index
  addToIndex(unit: UnitIndexEntry): void;
  
  // Remove custom unit from search index
  removeFromIndex(id: string): void;
  
  // Rebuild entire index
  rebuildIndex(): Promise<void>;
}
```

---

### 2. Equipment Services (`src/services/equipment/`)

#### EquipmentLookupService

Access to equipment definitions (wraps existing type data).

```typescript
interface IEquipmentLookupService {
  // Get equipment by ID
  getById(id: string): IEquipmentItem | undefined;
  
  // Get all equipment in a category
  getByCategory(category: EquipmentCategory): IEquipmentItem[];
  
  // Get equipment compatible with tech base
  getByTechBase(techBase: TechBase): IEquipmentItem[];
  
  // Get equipment available in era
  getByEra(year: number): IEquipmentItem[];
  
  // Search equipment by name
  search(query: string): IEquipmentItem[];
  
  // Get all weapons
  getAllWeapons(): IWeapon[];
  
  // Get all ammunition
  getAllAmmunition(): IAmmunition[];
}
```

#### EquipmentCalculatorService

Calculates variable equipment properties (wraps existing calculator).

```typescript
interface IEquipmentCalculatorService {
  // Calculate properties for variable equipment
  calculateProperties(
    equipmentId: string,
    context: IVariableEquipmentContext
  ): ICalculatedEquipmentProperties;
  
  // Check if equipment has variable properties
  isVariable(equipmentId: string): boolean;
  
  // Get required context fields for calculation
  getRequiredContext(equipmentId: string): string[];
}
```

---

### 3. Construction Services (`src/services/construction/`)

#### MechBuilderService

Core mech construction and modification logic.

```typescript
interface IMechBuilderService {
  // Create empty mech shell
  createEmpty(tonnage: number, techBase: TechBase): IEditableMech;
  
  // Create from existing unit (for customization)
  createFromUnit(unit: IFullUnit): IEditableMech;
  
  // Apply changes to mech
  applyChanges(mech: IEditableMech, changes: IMechChanges): IEditableMech;
  
  // Set engine
  setEngine(mech: IEditableMech, engineType: string, rating: number): IEditableMech;
  
  // Set armor allocation
  setArmor(mech: IEditableMech, allocation: IArmorAllocation): IEditableMech;
  
  // Add equipment to location
  addEquipment(mech: IEditableMech, equipmentId: string, location: string): IEditableMech;
  
  // Remove equipment
  removeEquipment(mech: IEditableMech, slotIndex: number): IEditableMech;
}
```

#### ValidationService

Validates mech builds against BattleTech construction rules.

```typescript
interface IValidationService {
  // Validate entire mech build
  validate(mech: IEditableMech): IValidationResult;
  
  // Validate specific aspect
  validateWeight(mech: IEditableMech): IValidationError[];
  validateArmor(mech: IEditableMech): IValidationError[];
  validateCriticalSlots(mech: IEditableMech): IValidationError[];
  validateTechLevel(mech: IEditableMech): IValidationError[];
  
  // Check if equipment can be added
  canAddEquipment(mech: IEditableMech, equipmentId: string, location: string): boolean;
}
```

#### CalculationService

Computes derived values for a mech build.

```typescript
interface ICalculationService {
  // Calculate all totals
  calculateTotals(mech: IEditableMech): IMechTotals;
  
  // Calculate Battle Value
  calculateBattleValue(mech: IEditableMech): number;
  
  // Calculate total cost
  calculateCost(mech: IEditableMech): number;
  
  // Calculate heat profile
  calculateHeatProfile(mech: IEditableMech): IHeatProfile;
  
  // Calculate movement profile
  calculateMovement(mech: IEditableMech): IMovementProfile;
}
```

---

### 4. Persistence Services (`src/services/persistence/`)

#### IndexedDBService

Low-level IndexedDB operations.

```typescript
interface IIndexedDBService {
  // Initialize database
  initialize(): Promise<void>;
  
  // Generic CRUD
  put<T>(store: string, key: string, value: T): Promise<void>;
  get<T>(store: string, key: string): Promise<T | undefined>;
  delete(store: string, key: string): Promise<void>;
  getAll<T>(store: string): Promise<T[]>;
  
  // Clear store
  clear(store: string): Promise<void>;
}
```

#### FileService

Export and import JSON files.

```typescript
interface IFileService {
  // Export single unit to JSON file download
  exportUnit(unit: IFullUnit, filename?: string): void;
  
  // Export multiple units as ZIP
  exportBatch(units: IFullUnit[], filename?: string): void;
  
  // Import unit from JSON file
  importUnit(file: File): Promise<IImportResult>;
  
  // Import multiple units
  importBatch(files: File[]): Promise<IImportResult[]>;
  
  // Validate import file
  validateFile(file: File): Promise<IValidationResult>;
}
```

---

## File Structure

```
src/services/
├── index.ts                          # Barrel exports + service registry
├── units/
│   ├── index.ts                      # Unit services barrel
│   ├── CanonicalUnitService.ts
│   ├── CustomUnitService.ts
│   ├── UnitSearchService.ts
│   └── types.ts                      # Unit service interfaces
├── equipment/
│   ├── index.ts
│   ├── EquipmentLookupService.ts
│   └── EquipmentCalculatorService.ts
├── construction/
│   ├── index.ts
│   ├── MechBuilderService.ts
│   ├── ValidationService.ts
│   └── CalculationService.ts
└── persistence/
    ├── index.ts
    ├── IndexedDBService.ts
    └── FileService.ts
```

---

## Implementation Phases

### Phase 1: Infrastructure (COMPLETE)
- [x] Create IndexedDBService
- [x] Create service registry pattern
- [x] Set up barrel exports

### Phase 2: Equipment Services (COMPLETE)
- [x] Create EquipmentLookupService (wraps existing types)
- [x] Create EquipmentCalculatorService (wraps existing calculator)

### Phase 3: Unit Services (COMPLETE)
- [x] Create CanonicalUnitService
- [x] Create CustomUnitService
- [x] Create UnitSearchService with MiniSearch

### Phase 4: Construction Services (COMPLETE)
- [x] Create MechBuilderService
- [x] Create ValidationService (integrate existing validators)
- [x] Create CalculationService (integrate existing calculations)

### Phase 5: File I/O (COMPLETE)
- [x] Create FileService for export/import
- [x] Add file validation

### Phase 6: API Integration (COMPLETE)
- [x] Update API route stubs to use new services
- [x] Update component imports to use service registry
- [ ] Integration testing (ongoing)

**API Routes Updated:**
- `src/pages/api/units.ts` - Uses CanonicalUnitService
- `src/pages/api/equipment.ts` - Uses EquipmentLookupService
- `src/pages/api/catalog.ts` - Uses CanonicalUnitService
- `src/pages/api/equipment/catalog.ts` - Uses EquipmentLookupService
- `src/pages/api/equipment/filters.ts` - Returns enum-based filter options
- `src/pages/api/custom-variants.ts` - Documents client-side IndexedDB usage
- `src/pages/api/custom-variants/[variantId].ts` - Documents client-side IndexedDB usage

---

## Dependencies

**Existing (keep):**
- `minisearch` - Full-text search
- `zustand` - State management
- `uuid` - ID generation

**New (may need):**
- `idb` - IndexedDB wrapper (optional, can use raw API)
- `jszip` - For batch export (optional)

---

## Notes

1. **Service instances**: Use singleton pattern via service registry
2. **Lazy loading**: Canonical unit data loaded on-demand, not at startup
3. **Caching**: Consider LRU cache for frequently accessed units
4. **Error handling**: All services should return Result types or throw typed errors
5. **Testing**: Each service should be testable in isolation with mock data layer

---

## Related Documents

- OpenSpec specs: `openspec/specs/`
- Type definitions: `src/types/`
- Existing calculations: `src/utils/construction/`, `src/utils/equipment/`

---

**Created:** 2025-11-30
**Updated:** 2025-11-30
**Status:** Complete (All phases implemented)

