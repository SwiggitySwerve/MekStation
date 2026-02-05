# Change: Add Service Layer Architecture

## Why

The application needs a clean abstraction layer between UI components and data sources. Currently, there's no consistent pattern for accessing units, equipment, or persisting custom builds. This proposal introduces a service layer that provides:

- Separation of concerns (UI ↔ business logic ↔ data)
- Testable, mockable services
- Clear interfaces for unit operations, equipment lookup, construction logic, and persistence

## What Changes

- **ADDED** Unit Services specification (CanonicalUnitService, CustomUnitService, UnitSearchService)
- **ADDED** Equipment Services specification (EquipmentLookupService, EquipmentCalculatorService)
- **ADDED** Construction Services specification (MechBuilderService, ValidationService, CalculationService)
- **ADDED** Persistence Services specification (IndexedDBService, FileService)

## Impact

- **Affected specs**: None (new capabilities)
- **Affected code**:
  - `src/services/` - New service implementations
  - `src/pages/api/` - API routes will use services
  - `src/stores/` - Zustand stores will call services
- **Dependencies**: Existing type system (`src/types/`), existing utilities (`src/utils/`)
