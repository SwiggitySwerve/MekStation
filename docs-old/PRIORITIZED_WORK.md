# 🎯 Prioritized Work - BattleTech Editor

**Last Updated:** January 2025  
**Status:** Active Development

This document consolidates all prioritized work items from across the project documentation, organized by priority and impact.

---

## 🚨 **CRITICAL PRIORITY - Immediate Action Required**

### 1. Type Safety Emergency Fix
**Priority:** 🔴 CRITICAL  
**Timeline:** 1-2 weeks  
**Impact:** Prevents runtime errors, improves developer experience

#### Issues
- **151 files** with `as any` type casting
- **928 instances** of `any` types throughout codebase
- Type definition mismatches causing compilation errors

#### Required Actions
1. Fix `UnitConfiguration` type definition inconsistencies
2. Replace all `as any` casts with proper types
3. Add proper TypeScript types to React contexts (`useMultiUnit`, `useUnit`)
4. Define validation result interfaces

#### Files Requiring Immediate Attention
- `services/WeightBalanceService.ts` - Uses `any[]` for equipment lists
- `components/editor/tabs/StructureTabV2.tsx` - Type errors blocking build
- `services/ConstructionRulesValidator.ts` - 43 instances of `any`
- `services/EquipmentAllocationService.ts` - 51 instances of `any`
- `services/analysis/AnalysisManager.ts` - 42 instances of `any`

#### Success Criteria
- [ ] Zero `as any` type casts in production code
- [ ] Build compiles without type errors
- [ ] All React contexts properly typed
- [ ] Validation interfaces defined

---

### 2. Production Debug Code Cleanup
**Priority:** 🔴 CRITICAL  
**Timeline:** 3-5 days  
**Impact:** Performance, security, code quality

#### Issues
- **50+ console.log statements** in production code
- Debug code exposing internal state
- Performance degradation from logging

#### Required Actions
1. Remove all `console.log` statements
2. Implement proper logging service
3. Add environment-based logging levels

#### Success Criteria
- [ ] Zero console.log statements in production code
- [ ] Proper logging service implemented
- [ ] Performance benchmarks maintained

---

### 3. Critical God Class Decomposition
**Priority:** 🔴 CRITICAL  
**Timeline:** 2-3 weeks  
**Impact:** Maintainability, SOLID compliance

#### Target: UnitCriticalManager.ts (2,084 lines)
**Current State:** Single file with 40+ responsibilities  
**Target State:** 8 focused services (~200-400 lines each)

#### Decomposition Plan
Split into:
- `ICriticalSlotManagementService` (~400 lines)
- `IEquipmentPlacementService` (~350 lines)
- `IWeightCalculationService` (~300 lines)
- `IArmorManagementService` (~250 lines)
- `IHeatManagementService` (~200 lines)
- `IValidationOrchestrator` (~300 lines)
- `IConfigurationService` (~200 lines)
- `UnitCriticalSlotOrchestrator` (~284 lines) - Coordination only

#### Success Criteria
- [ ] UnitCriticalManager decomposed into <500 line components
- [ ] All services implement interfaces
- [ ] SOLID principles compliance >90%
- [ ] No class >500 lines (except legitimate orchestrators)

---

## 🔥 **HIGH PRIORITY - Next Sprint**

### 4. Calculation Utility Migration
**Priority:** 🟠 HIGH  
**Timeline:** 2-3 weeks  
**Impact:** Code deduplication, maintainability

#### Files to Migrate
- `utils/engineCalculations.ts` → `SystemComponentsGateway.calculateEngineWeight()`
- `utils/gyroCalculations.ts` → `SystemComponentsGateway.calculateGyroWeight()`
- `utils/structureCalculations.ts` → `SystemComponentsGateway.calculateStructureWeight()`
- `utils/componentCalculations.ts` → `SystemComponentsGateway` methods

#### Migration Strategy
1. **Week 1:** Create migration hooks (`useSystemComponents`, `useEquipment`)
2. **Week 2:** Migrate 15 files using calculation utilities
3. **Week 3:** Delete old calculation files (~1,000 lines freed)

#### Expected Results
- **70% reduction** in calculation code
- **11-13 files deleted**
- **23-30 files refactored**
- **100% SOLID compliance** for calculation system

#### Success Criteria
- [ ] All calculation utilities migrated to SystemComponentsGateway
- [ ] Old calculation files deleted
- [ ] No duplicate calculation logic
- [ ] All tests passing

---

### 5. ComponentDatabaseService Removal
**Priority:** 🟠 HIGH  
**Timeline:** 1-2 weeks  
**Impact:** SOLID compliance, code quality

#### Current State
- **1,023-line monolithic file** (`services/ComponentDatabaseService.ts`)
- Violates SOLID principles
- Duplicates functionality of `SystemComponentsGateway`

#### Migration Plan
1. Verify migration hooks exist (`hooks/systemComponents/useSystemComponents.ts`)
2. Update 2 files using ComponentDatabaseService:
   - `hooks/useComponentDatabase.ts`
   - `utils/criticalSlots/CriticalSlotCalculator.ts`
3. Delete ComponentDatabaseService.ts

#### Success Criteria
- [ ] ComponentDatabaseService.ts deleted
- [ ] All references migrated to SystemComponentsGateway
- [ ] No broken imports
- [ ] Tests passing

---

### 6. Test Coverage Improvement
**Priority:** 🟠 HIGH  
**Timeline:** 2 weeks  
**Impact:** Code reliability, refactoring safety

#### Current State
- **91 test files** for **160+ service files** (57% coverage)
- Missing tests for critical services

#### Required Actions
1. Add tests for:
   - `UnitCriticalManager.test.ts` (partially covered)
   - `ConstructionRulesValidator.test.ts` (incomplete)
   - `AutoAllocationEngine.test.ts` (missing)
   - 45+ other service tests (missing)

#### Target Coverage
- **95% test coverage** for all services
- **80% integration test coverage**

#### Success Criteria
- [ ] Test coverage >95% for all services
- [ ] Integration test coverage >80%
- [ ] All critical paths tested
- [ ] Zero critical bugs in refactored code

---

## 🟡 **MEDIUM PRIORITY - Backlog**

### 7. Validation Services Type Safety
**Priority:** 🟡 MEDIUM  
**Timeline:** 1-2 weeks  
**Impact:** Type safety, maintainability

#### Files Affected
- `services/validation/*` (35 files)
- Extensive use of `any` types in validation logic

#### Required Actions
1. Migrate to strict `ICompleteUnitConfiguration` types
2. Define validation result interfaces
3. Remove all `any` types from validation services

#### Success Criteria
- [ ] All validation services use strict types
- [ ] Validation interfaces defined
- [ ] No `any` types in validation code

---

### 8. Large File Refactoring
**Priority:** 🟡 MEDIUM  
**Timeline:** 3-4 weeks  
**Impact:** Maintainability, SOLID compliance

#### Target Files (>500 lines)
- `ConstructionRulesValidator.ts` (1,949 lines)
- `AutoAllocationEngine.ts` (1,153 lines)
- `EquipmentAllocationService.ts` (1,125 lines)
- `CriticalSlotCalculator.ts` (1,077 lines)
- `WeightBalanceService.ts` (994 lines)
- `WeaponValidationService.ts` (936 lines)

#### Refactoring Strategy
1. Extract focused services from each large file
2. Implement interfaces for all services
3. Apply dependency injection patterns

#### Success Criteria
- [ ] No file >500 lines (except orchestrators)
- [ ] All services have interfaces
- [ ] SOLID principles compliance >90%

---

### 9. Naming Standardization
**Priority:** 🟡 MEDIUM  
**Timeline:** 1-2 weeks  
**Impact:** Code consistency, developer experience

#### Required Changes
Apply naming refactoring plan to all 160 services:
- `*Manager` → `*Service` (where appropriate)
- Consistent interface naming (`I*` prefix)
- Consistent file naming conventions

#### Success Criteria
- [ ] Consistent naming across all services
- [ ] All interfaces use `I` prefix
- [ ] File naming conventions followed

---

## 🔵 **LOW PRIORITY - Future Enhancements**

### 10. Documentation Organization
**Priority:** 🔵 LOW  
**Timeline:** Ongoing  
**Impact:** Developer onboarding, maintainability

#### Required Actions
1. Consolidate duplicate documentation
2. Update outdated references
3. Create quick reference guides
4. Organize by category and priority

#### Success Criteria
- [ ] No duplicate documentation
- [ ] All references updated
- [ ] Quick reference guides created
- [ ] Documentation organized by category

---

### 11. Performance Optimizations
**Priority:** 🔵 LOW  
**Timeline:** Ongoing  
**Impact:** User experience

#### Areas for Optimization
- Equipment browser pagination
- Critical slots rendering
- Large unit list handling
- Calculation caching

#### Success Criteria
- [ ] Sub-1-second response times maintained
- [ ] Performance benchmarks met
- [ ] Caching implemented where appropriate

---

## 📊 **Work Summary**

### By Priority
- **Critical:** 3 items (6-8 weeks)
- **High:** 3 items (5-7 weeks)
- **Medium:** 3 items (5-8 weeks)
- **Low:** 2 items (ongoing)

### By Impact
- **Type Safety:** 151 files, 928 instances
- **Code Reduction:** ~3,500 lines to be removed
- **Test Coverage:** 57% → 95% target
- **SOLID Compliance:** ~40% → 95% target

### Estimated Timeline
- **Critical Items:** 6-8 weeks
- **High Priority:** 5-7 weeks
- **Medium Priority:** 5-8 weeks
- **Total:** 16-23 weeks for all priorities

---

## 🎯 **Recommended Next Steps**

### Immediate (This Week)
1. Fix type errors blocking build (`StructureTabV2.tsx`)
2. Remove console.log statements
3. Start UnitCriticalManager decomposition planning

### Short Term (This Month)
1. Complete type safety fixes
2. Migrate calculation utilities
3. Remove ComponentDatabaseService

### Medium Term (Next Quarter)
1. Complete large file refactoring
2. Improve test coverage
3. Standardize naming conventions

---

## 📝 **Notes**

- All priorities are based on impact analysis from `docs/analysis/REMAINING_WORK_ANALYSIS.md`
- Cleanup candidates from `docs/project-history/CLEANUP_CANDIDATES.md`
- Type system refactor from `docs/HANDOFF_REFACTOR_2025.md`
- Implementation status from `docs/implementation-progress.md`

---

**For detailed implementation plans, see:**
- `docs/project-history/CLEANUP_CANDIDATES.md` - Cleanup strategy
- `docs/analysis/REMAINING_WORK_ANALYSIS.md` - Comprehensive analysis
- `docs/HANDOFF_REFACTOR_2025.md` - Type system refactor details
- `docs/implementation-task-list.md` - Detailed task breakdown

