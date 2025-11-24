# Update Checklist - Priority Action Items

## CRITICAL (Must Fix Immediately)

### 1. Database Setup Issues ⚠️
**Problem**: Empty SQLite database causing all API tests to fail

**Tasks**:
- [ ] **Populate test database** with sample unit data
  - Run `data/populate_db.py` script to populate database
  - Ensure database schema matches expected structure
  - Verify database contains test data for unit queries

- [ ] **Create test database setup**
  - Set up separate test database for testing
  - Configure test environment to use test database
  - Add database seeding for tests

**Files to Update**:
- `data/battletech_dev.sqlite` - Currently empty (0 bytes)
- `data/populate_db.py` - Database population script
- `services/db.ts` - Database connection service

### 2. Missing CriticalSlotRulesValidator Methods ⚠️
**Problem**: Refactored validator missing methods expected by tests

**Tasks**:
- [ ] **Add calculateLocationUtilization() method**
  ```typescript
  static calculateLocationUtilization(config: UnitConfiguration, equipment: any[]): LocationUtilization
  ```
- [ ] **Add missing static methods**:
  - `calculateLocationUtilization()`
  - `getDefaultLocationForComponent()`
  - `getSlotRequirementsForComponent()`

- [ ] **Update facade to expose required methods**
  - Add delegation methods in CriticalSlotRulesValidator
  - Ensure facade implements all required functionality

**Files to Update**:
- `services/validation/CriticalSlotRulesValidatorRefactored.ts`
- `services/validation/CriticalSlotValidationFacade.ts`

### 3. Fix Calculation Service Logic ⚠️
**Problem**: Weight, armor, and engine calculations returning incorrect values

**Tasks**:
- [ ] **Fix WeightCalculationService**
  - Debug armor weight calculation (expecting 98, getting 127)
  - Check armor point calculation logic
  - Verify weight calculation formulas match BattleTech rules

- [ ] **Fix ArmorRulesValidator**
  - Fix armor allocation validation
  - Correct armor waste calculations
  - Fix location cap calculations

- [ ] **Fix EngineCalculations**
  - Correct heat sink calculations (expecting 9, getting 6)
  - Fix integrated heat sink formulas
  - Verify engine slot calculations

**Files to Update**:
- `services/weight-balance/WeightCalculationService.ts`
- `services/validation/ArmorRulesValidator.ts`
- `utils/engineCalculations.ts`

## HIGH PRIORITY (Should Fix Soon)

### 4. Validation System Interface Alignment 🔶
**Problem**: Facade interface doesn't match test expectations

**Tasks**:
- [ ] **Update validation result structure**
  - Ensure all expected properties exist in CriticalSlotValidation
  - Add missing properties: `placementViolations`, `specialComponentSlots`
  - Update validation context handling

- [ ] **Fix validation rule compliance**
  - Ensure Special Component Slots rule exists
  - Add missing validation categories
  - Update rule severity levels

**Files to Update**:
- `services/validation/types/CriticalSlotValidationTypes.ts`
- `services/validation/CriticalSlotValidationFacade.ts`

### 5. React Hooks Dependencies 🔶
**Problem**: Missing dependencies in useEffect hooks causing warnings

**Tasks**:
- [ ] **Fix useEffect dependencies**
  - Add missing dependencies to useEffect hooks
  - Remove unnecessary dependencies
  - Fix conditional React hooks usage

- [ ] **Clean up unused variables**
  - Remove unused imports and variables
  - Fix TypeScript warnings

**Files to Update** (25+ files with React hooks issues):
- `components/criticalSlots/EnhancedCriticalSlotsDisplay.tsx`
- `components/compendium/UnitCompendiumList.tsx`
- `components/multiUnit/MultiUnitProvider.tsx`
- `components/unit/SingleUnitProvider.tsx`
- And many more...

## MEDIUM PRIORITY (Nice to Have)

### 6. Type Safety Improvements 🔷
**Problem**: 291 warnings about `any` type usage

**Tasks**:
- [ ] **Replace `any` with proper types**
  - Create proper TypeScript interfaces
  - Replace `any` types in API endpoints
  - Add type definitions for unit data structures

- [ ] **Add proper interfaces**
  - Create `UnitData` interface
  - Add `EquipmentItem` interface
  - Define `ValidationResult` types

**Files to Update**:
- `pages/api/units.ts` - 19 `any` type warnings
- `components/editor/tabs/ArmorTabV2.tsx` - 15 `any` type warnings
- `components/criticalSlots/EquipmentTray.tsx` - 12 `any` type warnings
- And many more...

### 7. Code Quality Improvements 🔷
**Problem**: Various code quality issues

**Tasks**:
- [ ] **Fix import statements**
  - Replace `require()` with `import`
  - Fix module import issues

- [ ] **Improve accessibility**
  - Add alt text to images
  - Escape HTML entities properly
  - Replace `<img>` with Next.js `<Image>`

- [ ] **Remove unused code**
  - Remove unused imports
  - Clean up dead code
  - Remove commented code

## Specific Test Failures to Address

### API Endpoint Tests (10 failures)
```
● /api/units › Sorting › should sort by role DESC
● /api/units › Pagination › should paginate results
● /api/units › Error Handling › should return 404 for non-existent unit
```
**Root Cause**: Empty database
**Fix**: Populate database with test data

### CriticalSlotRulesValidator Tests (20+ failures)
```
● CriticalSlotRulesValidator › calculateLocationUtilization
● CriticalSlotRulesValidator › validateCriticalSlots
● CriticalSlotRulesValidator › generateSlotOptimizations
```
**Root Cause**: Missing methods in refactored validator
**Fix**: Implement missing methods

### WeightRulesValidator Tests (2 failures)
```
● WeightRulesValidator › calculateWeightDistribution
```
**Root Cause**: Weight calculation returning NaN
**Fix**: Debug and fix weight calculation logic

### EngineCalculations Tests (3 failures)
```
● Engine Calculations › Integrated Heat Sink Calculations
● Engine Calculations › Comprehensive Engine Calculations
```
**Root Cause**: Incorrect heat sink calculations
**Fix**: Update calculation formulas

## Implementation Order

1. **Database Setup** (30 minutes)
   - Run database population script
   - Verify API endpoints work

2. **Implement Missing Methods** (2 hours)
   - Add calculateLocationUtilization()
   - Add other missing validator methods

3. **Fix Calculation Logic** (3 hours)
   - Debug weight calculations
   - Fix armor calculations
   - Correct engine calculations

4. **Update Validation System** (2 hours)
   - Align facade interface
   - Fix validation result structure

5. **Clean Up React Hooks** (1 hour)
   - Fix useEffect dependencies
   - Remove unused variables

6. **Type Safety** (4 hours)
   - Replace `any` types
   - Add proper interfaces

## Success Criteria

- [ ] All API endpoint tests pass (10 tests)
- [ ] All CriticalSlotRulesValidator tests pass (20+ tests)
- [ ] All calculation service tests pass (5+ tests)
- [ ] Lint warnings reduced by 75%
- [ ] Test suite passes with 98%+ success rate
- [ ] No critical functionality broken

## Notes

- Focus on database and missing methods first as they have the highest impact
- Type safety improvements can be done incrementally
- Some React hooks warnings might be acceptable if they don't affect functionality
- Ensure all changes maintain backward compatibility with existing code