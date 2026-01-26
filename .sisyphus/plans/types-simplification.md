# Types Module Simplification

## Context

### Original Request
Module-by-module code review to simplify and abstract concepts for resources.

### Research Findings
- **30 directories, 118 files** of type definitions
- Well-organized with clear separation of concerns
- Key duplication in status enums, modifier params, and type guards

### Key Duplication Hotspots
| Pattern | Occurrences | Opportunity |
|---------|-------------|-------------|
| Status enums | 4 | Generic status tracker |
| Modifier params | 7 | Generic modifier base |
| Type guards | 12+ | Type guard factory |
| Config interfaces | 4 | Generic component config |

---

## Work Objectives

### Core Objective
Extract generic type patterns to reduce duplication while maintaining type safety.

### Concrete Deliverables
- `src/types/core/typeGuardFactory.ts` - Generic type guard creator
- `src/types/core/IStatusTrackable.ts` - Generic status tracking interface
- `src/types/pilot/IModifierBase.ts` - Generic modifier parameter base

### Definition of Done
- [x] 3 generic abstractions created
- [x] ~200 lines of type guard duplication eliminated
- [x] All TypeScript compilation passes
- [x] No breaking changes to existing types

### Must Have
- Full backward compatibility
- Proper generic constraints
- JSDoc documentation

### Must NOT Have (Guardrails)
- DO NOT change existing interface shapes
- DO NOT remove existing type guards (deprecate only)
- DO NOT force all types to use new generics

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (TypeScript compiler)
- **User wants tests**: Type checking via tsc
- **Framework**: TypeScript strict mode

---

## TODOs

- [x] 1. Create `typeGuardFactory.ts`

  **What to do**:
  - Create `src/types/core/typeGuardFactory.ts`
  - Implement createTypeGuard<T>() function
  - Support property checking with type inference

  **References**:
  - `src/types/core/IEntity.ts` - isIEntity type guard
  - `src/types/core/ITechBaseEntity.ts` - isITechBaseEntity guard
  - `src/types/pilot/PilotInterfaces.ts` - multiple guards

  **Acceptance Criteria**:
  - [ ] Factory function created
  - [ ] `npx tsc --noEmit` → 0 errors
  - [ ] JSDoc documentation

  **Commit**: YES
  - Message: `refactor(types): add type guard factory function`

---

- [x] 2. Create `IStatusTrackable<T>` Interface

  **What to do**:
  - Create `src/types/core/IStatusTrackable.ts`
  - Define generic interface for status tracking
  - Document usage with examples

  **References**:
  - `src/types/pilot/PilotInterfaces.ts:28-34` - PilotStatus
  - `src/types/campaign/CampaignInterfaces.ts:49-76` - Campaign statuses

  **Acceptance Criteria**:
  - [ ] Generic interface created
  - [ ] `npx tsc --noEmit` → 0 errors

  **Commit**: YES
  - Message: `refactor(types): add IStatusTrackable generic interface`

---

- [x] 3. Create `IModifierBase` Interface

  **What to do**:
  - Create `src/types/pilot/IModifierBase.ts`
  - Define base interface for modifier parameters
  - Update existing modifier interfaces to extend base

  **References**:
  - `src/types/pilot/PilotInterfaces.ts:129-186` - 5 modifier param interfaces

  **Acceptance Criteria**:
  - [ ] Base interface created
  - [ ] 5 modifier interfaces extend base
  - [ ] `npx tsc --noEmit` → 0 errors

  **Commit**: YES
  - Message: `refactor(types): add IModifierBase interface for pilot modifiers`

---

- [x] 4. Create `IComponentConfig<T>` Generic

  **What to do**:
  - Create `src/types/construction/IComponentConfig.ts`
  - Define generic for engine/gyro/structure/heat sink configs
  - Update existing config interfaces to use generic

  **References**:
  - `src/types/unit/BattleMechInterfaces.ts:75-105` - 4 config interfaces

  **Acceptance Criteria**:
  - [ ] Generic interface created
  - [ ] 4 config interfaces updated
  - [ ] `npx tsc --noEmit` → 0 errors

  **Commit**: YES
  - Message: `refactor(types): add IComponentConfig generic interface`

---

- [x] 5. Update Core Index Exports

  **What to do**:
  - Export new generics from `src/types/core/index.ts`
  - Add deprecation notices to replaced patterns
  - Update documentation

  **Acceptance Criteria**:
  - [ ] All new types exported
  - [ ] `npx tsc --noEmit` → 0 errors

  **Commit**: YES
  - Message: `refactor(types): export new generic types from core`

---

## Success Criteria

### Verification Commands
```bash
npx tsc --noEmit
npm run lint
```

### Final Checklist
- [x] 3 generic abstractions created
- [x] Type guards consolidated
- [x] All TypeScript compilation passes
- [x] Documentation updated
