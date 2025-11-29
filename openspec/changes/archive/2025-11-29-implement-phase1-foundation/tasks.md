# Implementation Tasks: Phase 1 Foundation

## 1. Core Entity Types
- [ ] 1.1 Create `src/types/core/IEntity.ts` - Base entity interface
- [ ] 1.2 Create `src/types/core/ITechBaseEntity.ts` - Tech base classification interface
- [ ] 1.3 Create `src/types/core/IWeightedComponent.ts` - Physical mass interface
- [ ] 1.4 Create `src/types/core/ISlottedComponent.ts` - Critical slot interface
- [ ] 1.5 Create `src/types/core/IPlaceableComponent.ts` - Composition interface
- [ ] 1.6 Create `src/types/core/IValuedComponent.ts` - Economic properties interface
- [ ] 1.7 Create `src/types/core/ITemporalEntity.ts` - Temporal availability interface
- [ ] 1.8 Create `src/types/core/IDocumentedEntity.ts` - Source documentation interface
- [ ] 1.9 Create barrel export `src/types/core/index.ts`

## 2. Core Enumerations
- [ ] 2.1 Create `src/types/enums/TechBase.ts` - Inner Sphere, Clan, Mixed
- [ ] 2.2 Create `src/types/enums/RulesLevel.ts` - Introductory, Standard, Advanced, Experimental
- [ ] 2.3 Create `src/types/enums/Era.ts` - All 8 canonical eras
- [ ] 2.4 Create `src/types/enums/WeightClass.ts` - Light, Medium, Heavy, Assault
- [ ] 2.5 Create barrel export `src/types/enums/index.ts`

## 3. Era & Temporal System
- [ ] 3.1 Create `src/types/temporal/Era.ts` - Era definitions with year ranges
- [ ] 3.2 Create `src/utils/temporal/eraUtils.ts` - Era determination functions
- [ ] 3.3 Create `src/utils/temporal/availabilityUtils.ts` - Temporal availability filtering
- [ ] 3.4 Write tests for era determination logic

## 4. Physical Properties System
- [ ] 4.1 Implement weight property validation (finite, >= 0)
- [ ] 4.2 Implement criticalSlots property validation (integer, >= 0)
- [ ] 4.3 Create weight rounding utilities (0.5 ton increments)
- [ ] 4.4 Document canonical property naming ("weight" not "tons")

## 5. Rules Level System
- [ ] 5.1 Create RulesLevel enum with 4 levels
- [ ] 5.2 Create rules level comparison utilities
- [ ] 5.3 Create rules level filtering functions
- [ ] 5.4 Write tests for rules level logic

## 6. Validation Patterns
- [ ] 6.1 Create `src/utils/typeGuards.ts` - Type guard implementations
- [ ] 6.2 Create `isEntity()` type guard
- [ ] 6.3 Create `isWeightedComponent()` type guard
- [ ] 6.4 Create `isSlottedComponent()` type guard
- [ ] 6.5 Create `isTechBaseEntity()` type guard
- [ ] 6.6 Create `isTemporalEntity()` type guard
- [ ] 6.7 Create validation result types and patterns
- [ ] 6.8 Write comprehensive tests for type guards

## 7. Weight Class System
- [ ] 7.1 Create WeightClass enum (Light 20-35, Medium 40-55, Heavy 60-75, Assault 80-100)
- [ ] 7.2 Create `getWeightClass(tonnage)` utility function
- [ ] 7.3 Create weight class validation rules
- [ ] 7.4 Write tests for weight class determination

## 8. Integration & Documentation
- [ ] 8.1 Create unified barrel export for all Phase 1 types
- [ ] 8.2 Verify no circular dependencies
- [ ] 8.3 Run full type checking (tsc --noEmit)
- [ ] 8.4 Run all Phase 1 tests
- [ ] 8.5 Update code references in specs

