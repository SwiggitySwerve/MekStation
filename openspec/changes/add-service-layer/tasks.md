# Service Layer Implementation Tasks

## 1. Infrastructure Setup

- [ ] 1.1 Create service registry pattern (`src/services/index.ts`)
- [ ] 1.2 Set up barrel exports for each service domain
- [ ] 1.3 Define common service interfaces and error types

## 2. Persistence Services

- [ ] 2.1 Implement IndexedDBService with database initialization
- [ ] 2.2 Implement FileService for JSON export/import
- [ ] 2.3 Add file validation for imports

## 3. Equipment Services

- [ ] 3.1 Implement EquipmentLookupService (wraps existing types)
- [ ] 3.2 Implement EquipmentCalculatorService (wraps existing calculator)
- [ ] 3.3 Add equipment filtering and search

## 4. Unit Services

- [ ] 4.1 Implement CanonicalUnitService with lazy loading
- [ ] 4.2 Implement CustomUnitService with IndexedDB storage
- [ ] 4.3 Implement UnitSearchService with MiniSearch
- [ ] 4.4 Create unit index schema and generation

## 5. Construction Services

- [ ] 5.1 Implement MechBuilderService for mech construction
- [ ] 5.2 Implement ValidationService (integrate existing validators)
- [ ] 5.3 Implement CalculationService (integrate existing calculations)

## 6. Integration

- [ ] 6.1 Update API routes to use services
- [ ] 6.2 Update Zustand stores to call services
- [ ] 6.3 Delete old stub services
- [ ] 6.4 Add service tests

