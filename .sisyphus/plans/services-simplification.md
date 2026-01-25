# Services Layer Simplification

## Context

### Original Request
User wants to review modules one-by-one and find ways to simplify or abstract concepts for resources. Starting with the services layer.

### Interview Summary
**Key Discussions**:
- Pain points: code duplication, maintenance burden, performance issues
- Resources mean: domain entities, CRUD/persistence, state management, services
- Review approach: pattern-focused, one work plan per module
- Starting point: services/ module (highest duplication)

**Research Findings**:
- 40+ services across 6 domains (vault, unit, validation, construction, conversion, equipment)
- Multiple singleton patterns in use (module-level `let` vs static `getInstance()`)
- 76 test files exist in services/ - good coverage
- `IService` interface exists but NO service implements it
- `Result<T, E>` type exists but underutilized
- Only OfflineQueueService has proper cleanup; others may leak resources

### Metis Review
**Identified Gaps** (addressed):
- REMOVED `useEventListener` hook from scope - only 3 usages exist in codebase
- Clarified singleton count: ~40+ services with singleton patterns
- Not all repositories fit CRUD - only 6-8 of 13 are pure CRUD
- Added guardrails: IService lifecycle implementation is OUT OF SCOPE

---

## Work Objectives

### Core Objective
Create two abstractions to reduce code duplication and maintenance burden in the services layer: a singleton factory and a CRUD repository interface.

### Concrete Deliverables
- `src/services/core/createSingleton.ts` - Generic singleton factory function
- `src/services/core/ICrudRepository.ts` - Generic CRUD repository interface
- Migration of existing services to use new abstractions

### Definition of Done
- [x] `createSingleton<T>` factory created with full test coverage
- [x] `ICrudRepository<T>` interface created with documentation
- [x] At least 5 services migrated to use `createSingleton`
- [ ] At least 3 repositories migrated to implement `ICrudRepository`
- [ ] All existing tests pass (`npm test` - 0 failures)
- [ ] No breaking changes to public APIs

### Must Have
- Backward compatibility for all `get*Service()` and `get*Repository()` exports
- Reset functions for testing support
- TypeScript strict mode compliance
- Zero `any` types in new code

### Must NOT Have (Guardrails)
- DO NOT implement IService lifecycle in this phase
- DO NOT adopt Result<T,E> broadly (separate work plan)
- DO NOT touch desktop/services/ directory
- DO NOT modify test files beyond import changes
- DO NOT create base repository class (interface only)
- DO NOT change method signatures on services/repositories
- DO NOT add new features while refactoring singleton pattern

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: YES (Jest + React Testing Library, 76 test files in services/)
- **User wants tests**: YES (TDD for new abstractions)
- **Framework**: Jest

### TDD Workflow for New Abstractions

Each new abstraction follows RED-GREEN-REFACTOR:

1. **RED**: Write failing tests first
2. **GREEN**: Implement minimum code to pass
3. **REFACTOR**: Clean up while keeping green

### Migration Verification

After EACH service migration:
```bash
npm test -- --testPathPattern="services" --passWithNoTests
```

Expected: All tests pass, zero regressions

---

## Task Flow

```
Task 1 (createSingleton factory)
    ↓
Task 2 (ICrudRepository interface)
    ↓
Task 3 (Migrate vault domain singletons)
    ↓
Task 4 (Migrate equipment domain singletons) [parallel with 5]
Task 5 (Migrate unit domain singletons) [parallel with 4]
    ↓
Task 6 (Migrate repositories to ICrudRepository)
    ↓
Task 7 (Final verification & documentation)
```

## Parallelization

| Group | Tasks | Reason |
|-------|-------|--------|
| A | 4, 5 | Independent domains, no shared state |

| Task | Depends On | Reason |
|------|------------|--------|
| 3 | 1 | Needs createSingleton factory |
| 4 | 1, 3 | Needs factory + pattern validation from Task 3 |
| 5 | 1, 3 | Needs factory + pattern validation from Task 3 |
| 6 | 2 | Needs ICrudRepository interface |
| 7 | 3, 4, 5, 6 | Final verification after all migrations |

---

## TODOs

- [x] 1. Create `createSingleton<T>` Factory

  **What to do**:
  - Create `src/services/core/createSingleton.ts`
  - Implement generic factory that returns `{ get: () => T, reset: () => void }`
  - Support lazy initialization (create instance on first `get()` call)
  - Support optional cleanup function parameter
  - Write comprehensive tests first (TDD)

  **Must NOT do**:
  - Do NOT add IService lifecycle enforcement
  - Do NOT add async initialization support (keep it simple)
  - Do NOT modify existing services yet

  **Parallelizable**: NO (foundation for other tasks)

  **References**:

  **Pattern References** (existing code to follow):
  - `src/services/vault/VaultService.ts:719-733` - Module-level lazy init pattern to standardize on
  - `src/services/vault/OfflineQueueService.ts:376-381` - Reset function with cleanup pattern
  - `src/services/core/types/BaseTypes.ts:21-33` - IService interface for reference (but don't implement)

  **Test References**:
  - `src/services/vault/__tests__/VaultService.test.ts` - Test patterns for service singletons
  - `src/services/conversion/__tests__/BlkExportService.test.ts` - getInstance() test pattern

  **Acceptance Criteria**:

  - [ ] Test file created: `src/services/core/__tests__/createSingleton.test.ts`
  - [ ] Tests cover: lazy init, reset, cleanup callback, type safety
  - [ ] `npm test -- --testPathPattern="createSingleton"` → PASS

  **Manual Verification**:
  - [ ] TypeScript compiles with `npx tsc --noEmit`
  - [ ] No `any` types in implementation

  **Commit**: YES
  - Message: `refactor(services): add createSingleton factory for singleton management`
  - Files: `src/services/core/createSingleton.ts`, `src/services/core/__tests__/createSingleton.test.ts`
  - Pre-commit: `npm test -- --testPathPattern="createSingleton"`

---

- [x] 2. Create `ICrudRepository<T>` Interface

  **What to do**:
  - Create `src/services/core/ICrudRepository.ts`
  - Define generic interface with: `create`, `getById`, `getAll`, `update`, `delete`
  - Add optional `exists(id)` and `count()` methods
  - Document with JSDoc examples
  - Export from `src/services/core/index.ts`

  **Must NOT do**:
  - Do NOT create abstract base class
  - Do NOT force non-CRUD repositories to implement this
  - Do NOT add validation logic to interface

  **Parallelizable**: YES (with Task 1)

  **References**:

  **Pattern References** (existing repositories to model after):
  - `src/services/units/UnitRepository.ts:66-140` - CRUD methods pattern
  - `src/services/vault/ContactRepository.ts` - Repository with create/get/delete
  - `src/services/vault/PermissionRepository.ts` - Repository with indexed queries

  **Type References**:
  - `src/services/core/types/BaseTypes.ts:56-58` - ResultType pattern for return types

  **Acceptance Criteria**:

  - [ ] Interface file created: `src/services/core/ICrudRepository.ts`
  - [ ] Interface exported from `src/services/core/index.ts`
  - [ ] JSDoc documentation with example implementation
  - [ ] TypeScript compiles: `npx tsc --noEmit` → 0 errors

  **Commit**: YES
  - Message: `refactor(services): add ICrudRepository interface for repository standardization`
  - Files: `src/services/core/ICrudRepository.ts`, `src/services/core/index.ts`
  - Pre-commit: `npx tsc --noEmit`

---

- [x] 3. Migrate Vault Domain Singletons

  **What to do**:
  - Migrate these services to use `createSingleton`:
    - `VaultService`
    - `PermissionService`
    - `ContactService`
    - `OfflineQueueService` (preserve cleanup callback)
    - `VersionHistoryService`
  - Update exports to use factory-generated getters
  - Preserve all existing `get*Service()` and `reset*Service()` exports
  - Run domain tests after each migration

  **Must NOT do**:
  - Do NOT change public method signatures
  - Do NOT modify business logic
  - Do NOT change constructor parameters

  **Parallelizable**: NO (validates pattern before other domains)

  **References**:

  **Files to Migrate**:
  - `src/services/vault/VaultService.ts:719-733` - Current singleton pattern
  - `src/services/vault/PermissionService.ts` - Module-level pattern
  - `src/services/vault/ContactService.ts` - Module-level pattern
  - `src/services/vault/OfflineQueueService.ts:376-381` - Has cleanup to preserve
  - `src/services/vault/VersionHistoryService.ts` - Module-level pattern

  **Test Files** (must pass after migration):
  - `src/services/vault/__tests__/VaultService.test.ts`
  - `src/services/vault/__tests__/PermissionService.test.ts`
  - `src/services/vault/__tests__/ContactService.test.ts`
  - `src/services/vault/__tests__/OfflineQueueService.test.ts`
  - `src/services/vault/__tests__/VersionHistoryService.test.ts`

  **Acceptance Criteria**:

  - [ ] All 5 vault services use `createSingleton`
  - [ ] `npm test -- --testPathPattern="vault"` → PASS (all tests green)
  - [ ] Exports unchanged: `getVaultService`, `resetVaultService`, etc.

  **Commit**: YES
  - Message: `refactor(vault): migrate vault services to createSingleton factory`
  - Files: `src/services/vault/*.ts` (5 service files)
  - Pre-commit: `npm test -- --testPathPattern="vault"`

---

- [x] 4. Migrate Equipment Domain Singletons

  **What to do**:
  - Migrate these services to use `createSingleton`:
    - `EquipmentRegistry`
    - `EquipmentLoaderService`
    - `EquipmentNameMapper`
  - Convert from static `getInstance()` pattern to factory pattern
  - Preserve existing exports

  **Must NOT do**:
  - Do NOT change `initialize()` method behavior
  - Do NOT modify equipment loading logic

  **Parallelizable**: YES (with Task 5)

  **References**:

  **Files to Migrate**:
  - `src/services/equipment/EquipmentRegistry.ts:68-91` - Static getInstance pattern
  - `src/services/equipment/EquipmentLoaderService.ts` - Static getInstance pattern
  - `src/services/equipment/EquipmentNameMapper.ts` - Static getInstance pattern

  **Acceptance Criteria**:

  - [ ] All 3 equipment services use `createSingleton`
  - [ ] `npm test -- --testPathPattern="equipment"` → PASS
  - [ ] Existing exports preserved

  **Commit**: YES
  - Message: `refactor(equipment): migrate equipment services to createSingleton factory`
  - Files: `src/services/equipment/*.ts` (3 service files)
  - Pre-commit: `npm test -- --testPathPattern="equipment"`

---

- [x] 5. Migrate Unit Domain Singletons

  **What to do**:
  - Migrate these services to use `createSingleton`:
    - `UnitFactoryService`
    - `UnitTypeRegistry`
  - Convert from static `getInstance()` pattern to factory pattern
  - Preserve existing exports

  **Must NOT do**:
  - Do NOT change unit type handler registration
  - Do NOT modify factory creation logic

  **Parallelizable**: YES (with Task 4)

  **References**:

  **Files to Migrate**:
  - `src/services/units/UnitFactoryService.ts:110-122` - Static getInstance pattern
  - `src/services/units/UnitTypeRegistry.ts:26-38` - Static getInstance pattern

  **Test Files**:
  - `src/services/units/__tests__/UnitTypeRegistry.test.ts`

  **Acceptance Criteria**:

  - [ ] All 2 unit services use `createSingleton`
  - [ ] `npm test -- --testPathPattern="units"` → PASS
  - [ ] Existing exports preserved

  **Commit**: YES
  - Message: `refactor(units): migrate unit services to createSingleton factory`
  - Files: `src/services/units/*.ts` (2 service files)
  - Pre-commit: `npm test -- --testPathPattern="units"`

---

- [x] 6. Migrate Repositories to ICrudRepository

  **What to do**:
  - Add `implements ICrudRepository<T>` to these pure CRUD repositories:
    - `ContactRepository`
    - `PermissionRepository`
    - `VaultFolderRepository`
  - Add missing methods if needed (with no-op or throw)
  - Document which repositories are NOT pure CRUD and why

  **Must NOT do**:
  - Do NOT force PilotRepository (has `addAbility`, `recordKill` - not CRUD)
  - Do NOT force UnitRepository (has versioning - specialized)
  - Do NOT change existing method signatures

  **Parallelizable**: NO (depends on Task 2)

  **References**:

  **Files to Migrate**:
  - `src/services/vault/ContactRepository.ts` - Pure CRUD
  - `src/services/vault/PermissionRepository.ts` - Pure CRUD
  - `src/services/vault/VaultFolderRepository.ts` - Pure CRUD with hierarchy

  **Files to SKIP** (documented exclusions):
  - `src/services/pilots/PilotRepository.ts` - Has non-CRUD methods
  - `src/services/units/UnitRepository.ts` - Has versioning logic

  **Acceptance Criteria**:

  - [ ] 3 repositories implement `ICrudRepository<T>`
  - [ ] `npm test -- --testPathPattern="vault"` → PASS
  - [ ] Documentation added for excluded repositories

  **Commit**: YES
  - Message: `refactor(repositories): implement ICrudRepository interface for vault repositories`
  - Files: `src/services/vault/*Repository.ts` (3 files)
  - Pre-commit: `npm test -- --testPathPattern="vault"`

---

- [ ] 7. Final Verification & Documentation

  **What to do**:
  - Run full test suite
  - Update `src/services/README.md` with new patterns
  - Document migration guide for remaining services
  - Verify no TypeScript errors

  **Must NOT do**:
  - Do NOT migrate remaining services (future work)

  **Parallelizable**: NO (final step)

  **References**:

  **Files to Update**:
  - `src/services/README.md` - Add singleton factory documentation
  - `src/services/core/index.ts` - Ensure all exports are correct

  **Acceptance Criteria**:

  - [ ] `npm test` → ALL PASS (full suite)
  - [ ] `npx tsc --noEmit` → 0 errors
  - [ ] README updated with new patterns
  - [ ] Migration guide for remaining ~30 services documented

  **Commit**: YES
  - Message: `docs(services): add singleton factory and ICrudRepository documentation`
  - Files: `src/services/README.md`, `src/services/core/index.ts`
  - Pre-commit: `npm test`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `refactor(services): add createSingleton factory` | core/createSingleton.ts + test | `npm test -- createSingleton` |
| 2 | `refactor(services): add ICrudRepository interface` | core/ICrudRepository.ts | `npx tsc --noEmit` |
| 3 | `refactor(vault): migrate vault services to createSingleton` | vault/*.ts | `npm test -- vault` |
| 4 | `refactor(equipment): migrate equipment services to createSingleton` | equipment/*.ts | `npm test -- equipment` |
| 5 | `refactor(units): migrate unit services to createSingleton` | units/*.ts | `npm test -- units` |
| 6 | `refactor(repositories): implement ICrudRepository` | vault/*Repository.ts | `npm test -- vault` |
| 7 | `docs(services): add patterns documentation` | README.md | `npm test` |

---

## Success Criteria

### Verification Commands
```bash
# Full test suite
npm test

# TypeScript check
npx tsc --noEmit

# Specific domain tests
npm test -- --testPathPattern="services"
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass
- [ ] 10 services migrated to `createSingleton`
- [ ] 3 repositories implement `ICrudRepository`
- [ ] Documentation updated
