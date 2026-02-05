# Implementation Tasks: Phase 1 Foundation

## 1. Core Entity Types

- [x] 1.1 Create `src/types/core/IEntity.ts` - Base entity interface
- [x] 1.2 Create `src/types/core/ITechBaseEntity.ts` - Tech base classification interface
- [x] 1.3 Create `src/types/core/IWeightedComponent.ts` - Physical mass interface
- [x] 1.4 Create `src/types/core/ISlottedComponent.ts` - Critical slot interface
- [x] 1.5 Create `src/types/core/IPlaceableComponent.ts` - Composition interface
- [x] 1.6 Create `src/types/core/IValuedComponent.ts` - Economic properties interface
- [x] 1.7 Create `src/types/core/ITemporalEntity.ts` - Temporal availability interface
- [x] 1.8 Create `src/types/core/IDocumentedEntity.ts` - Source documentation interface
- [x] 1.9 Create barrel export `src/types/core/index.ts`

## 2. Core Enumerations

- [x] 2.1 Create `src/types/enums/TechBase.ts` - Inner Sphere, Clan, Mixed
- [x] 2.2 Create `src/types/enums/RulesLevel.ts` - Introductory, Standard, Advanced, Experimental
- [x] 2.3 Create `src/types/enums/Era.ts` - All 8 canonical eras
- [x] 2.4 Create `src/types/enums/WeightClass.ts` - Light, Medium, Heavy, Assault
- [x] 2.5 Create barrel export `src/types/enums/index.ts`

## 3. Era & Temporal System

- [x] 3.1 Create `src/types/temporal/Era.ts` - Era definitions with year ranges
- [x] 3.2 Create `src/utils/temporal/eraUtils.ts` - Era determination functions
- [x] 3.3 Create `src/utils/temporal/availabilityUtils.ts` - Temporal availability filtering
- [x] 3.4 Write tests for era determination logic

## 4. Physical Properties System

- [x] 4.1 Implement weight property validation (finite, >= 0)
- [x] 4.2 Implement criticalSlots property validation (integer, >= 0)
- [x] 4.3 Create weight rounding utilities (0.5 ton increments)
- [x] 4.4 Document canonical property naming ("weight" not "tons")

## 5. Rules Level System

- [x] 5.1 Create RulesLevel enum with 4 levels
- [x] 5.2 Create rules level comparison utilities
- [x] 5.3 Create rules level filtering functions
- [x] 5.4 Write tests for rules level logic

## 6. Validation Patterns

- [x] 6.1 Create `src/utils/typeGuards.ts` - Type guard implementations
- [x] 6.2 Create `isEntity()` type guard
- [x] 6.3 Create `isWeightedComponent()` type guard
- [x] 6.4 Create `isSlottedComponent()` type guard
- [x] 6.5 Create `isTechBaseEntity()` type guard
- [x] 6.6 Create `isTemporalEntity()` type guard
- [x] 6.7 Create validation result types and patterns
- [x] 6.8 Write comprehensive tests for type guards

## 7. Weight Class System

- [x] 7.1 Create WeightClass enum (Light 20-35, Medium 40-55, Heavy 60-75, Assault 80-100)
- [x] 7.2 Create `getWeightClass(tonnage)` utility function
- [x] 7.3 Create weight class validation rules
- [x] 7.4 Write tests for weight class determination

## 8. Integration & Documentation

- [x] 8.1 Create unified barrel export for all Phase 1 types
- [x] 8.2 Verify no circular dependencies
- [x] 8.3 Run full type checking (tsc --noEmit)
- [x] 8.4 Run all Phase 1 tests
- [x] 8.5 Update code references in specs
