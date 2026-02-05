# Service Layer Implementation Tasks

## 1. Infrastructure Setup

- [x] 1.1 Create service registry pattern (`src/services/index.ts`)
- [x] 1.2 Set up barrel exports for each service domain
- [x] 1.3 Define common service interfaces and error types

## 2. Persistence Services

- [x] 2.1 Implement IndexedDBService with database initialization
- [x] 2.2 Implement FileService for JSON export/import
- [x] 2.3 Add file validation for imports

## 3. Equipment Services

- [x] 3.1 Implement EquipmentLookupService (wraps existing types)
- [x] 3.2 Implement EquipmentCalculatorService (wraps existing calculator)
- [x] 3.3 Add equipment filtering and search

## 4. Unit Services

- [x] 4.1 Implement CanonicalUnitService with lazy loading
- [x] 4.2 Implement CustomUnitService with IndexedDB storage
- [x] 4.3 Implement UnitSearchService with MiniSearch
- [x] 4.4 Create unit index schema and generation

## 5. Construction Services

- [x] 5.1 Implement MechBuilderService for mech construction
- [x] 5.2 Implement ValidationService (integrate existing validators)
- [x] 5.3 Implement CalculationService (integrate existing calculations)

## 6. Integration

- [x] 6.1 Update API routes to use services
- [x] 6.2 Update Zustand stores to call services
- [x] 6.3 Delete old stub services
- [x] 6.4 Add service tests
