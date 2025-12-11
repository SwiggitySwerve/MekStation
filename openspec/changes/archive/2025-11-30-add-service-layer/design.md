# Service Layer Design

## Context

The MekStation needs a service layer to abstract data access and business logic from UI components. This enables:
- Clear separation of concerns
- Testable business logic
- Consistent data access patterns
- Future extensibility (e.g., backend API, cloud sync)

## Goals / Non-Goals

**Goals:**
- Provide singleton service instances via registry
- Support lazy loading of unit data
- Enable offline-first with IndexedDB
- Wrap existing utility functions in service interfaces
- Support both canonical (read-only) and custom (read-write) units

**Non-Goals:**
- Backend server implementation (client-side only for now)
- Real-time sync between clients
- Cloud storage integration (future phase)
- Authentication/authorization

## Decisions

### Decision: Singleton Pattern via Service Registry

Services are instantiated as singletons accessed through a central registry.

```typescript
// src/services/index.ts
export const services = {
  units: {
    canonical: new CanonicalUnitService(),
    custom: new CustomUnitService(),
    search: new UnitSearchService(),
  },
  equipment: {
    lookup: new EquipmentLookupService(),
    calculator: new EquipmentCalculatorService(),
  },
  construction: {
    builder: new MechBuilderService(),
    validation: new ValidationService(),
    calculation: new CalculationService(),
  },
  persistence: {
    db: new IndexedDBService(),
    file: new FileService(),
  },
};
```

**Rationale**: Simple, explicit, and testable. Services can be mocked by replacing registry entries.

### Decision: Canonical Units as Static JSON

Canonical unit data is bundled as static JSON in `public/data/units/`:
- Lightweight index loaded on startup (~500KB)
- Full unit data lazy-loaded on demand
- No database writes for canonical data

**Rationale**: Simplest approach for read-only reference data. Avoids IndexedDB complexity for static content.

### Decision: Custom Units in IndexedDB

User-created variants stored in browser IndexedDB:
- Database: `mekstation`
- Stores: `custom-units`, `unit-metadata`
- Full CRUD operations

**Rationale**: Persistent browser storage that survives page refreshes. Standard web API with good browser support.

### Decision: Wrap Existing Utilities

Services wrap existing utility functions rather than reimplementing:
- `EquipmentLookupService` wraps `src/types/equipment/` exports
- `EquipmentCalculatorService` wraps `src/utils/equipment/EquipmentCalculator.ts`
- `ValidationService` wraps `src/services/validation/` validators

**Rationale**: Preserves existing tested logic. Services add consistent interface and caching.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| IndexedDB browser limits | Warn users approaching storage limits |
| Search performance with many units | Use MiniSearch for client-side full-text search |
| Service initialization order | Registry ensures services created in dependency order |

## Migration Plan

1. Create new service layer alongside existing code
2. Update API routes to use services
3. Update Zustand stores to call services
4. Delete old stub services (`mockApiService.ts`, `EquipmentGateway.ts`)
5. Archive this change

## Open Questions

- Should we add LRU cache for frequently accessed units?
- What's the maximum number of custom units we should support?
- Should file export support MTF format in addition to JSON?

