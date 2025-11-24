# Old Files to Clean Up After Gateway Refactor

## 🎯 Priority Cleanup (High Impact)

### 1. Redundant Calculation Utilities (Can be removed once migrated)

**Status:** These files contain calculation logic now handled by our expression-based CalculationEngine

#### Engine Calculations
- **`utils/engineCalculations.ts`**
  - **Replacement:** `services/systemComponents/calculations/LookupTables.ts` + `ComponentCalculations.ts`
  - **Used by:** 15 files (needs migration first)
  - **Action:** Migrate imports to use `SystemComponentsGateway.calculateEngineWeight()` instead

#### Gyro Calculations
- **`utils/gyroCalculations.ts`**
  - **Replacement:** `services/systemComponents/calculations/LookupTables.ts` + `ComponentCalculations.ts`
  - **Used by:** 15 files (needs migration first)
  - **Action:** Migrate to use `SystemComponentsGateway.calculateGyroWeight()` instead

#### Structure Calculations
- **`utils/structureCalculations.ts`**
  - **Replacement:** `services/systemComponents/calculations/ComponentCalculations.ts`
  - **Used by:** Multiple files
  - **Action:** Migrate to use `SystemComponentsGateway.calculateStructureWeight()` instead

#### Component Calculations (General)
- **`utils/componentCalculations.ts`**
  - **Replacement:** `services/systemComponents/calculations/ComponentCalculations.ts`
  - **Contains:** General component calculation utilities
  - **Action:** Migrate specific functions to SystemComponentsGateway or delete if redundant

---

### 2. Old Component Database Service

#### ComponentDatabaseService.ts
- **File:** `services/ComponentDatabaseService.ts` (~1,023 lines!)
- **Problem:** 
  - Violates SOLID (single 1000+ line file)
  - Hardcoded component data mixed with calculation logic
  - Duplicates functionality of new SystemComponentsGateway
- **Replacement:** `services/systemComponents/SystemComponentsGateway.ts`
- **Used by:** 
  - `hooks/useComponentDatabase.ts`
  - `utils/criticalSlots/CriticalSlotCalculator.ts`
- **Action:** 
  1. Create migration hook: `hooks/systemComponents/useSystemComponents.ts`
  2. Update the 2 files using it
  3. Delete ComponentDatabaseService.ts

**Migration Example:**
```typescript
// Old
import { ComponentDatabaseService } from '../services/ComponentDatabaseService'
const engines = ComponentDatabaseService.getEngines(...)

// New
import { SystemComponentsGateway } from '../services/systemComponents/SystemComponentsGateway'
const engines = SystemComponentsGateway.getEngines({
  techBase: 'Inner Sphere',
  unitTonnage: 50,
  desiredRating: 200
})
```

---

### 3. Overlapping Weight/Calculation Services

#### Weight Balance Service
- **File:** `services/weight-balance/WeightCalculationService.ts`
- **Problem:** Overlaps with new calculation system
- **Contains:** Weight calculations for engines, gyros, structures
- **Action:** Audit and migrate specific calculations to expression system

#### Unit Calculation Service
- **File:** `utils/editor/UnitCalculationService.ts`
- **Problem:** Scattered calculation logic with inline multipliers
- **Contains:** `calculateWeightBreakdown()`, `calculateEngineWeight()`, etc.
- **Action:** Replace with SystemComponentsGateway calls

#### Critical Slot Managers
- **Files:**
  - `utils/criticalSlots/UnitCriticalManager.ts`
  - `utils/criticalSlots/WeightBalanceManager.ts`
  - `utils/criticalSlots/UnitCalculationManager.ts`
- **Problem:** Duplicate weight and slot calculations
- **Action:** Consolidate to use SystemComponentsGateway

---

## 📋 Medium Priority Cleanup

### 4. Validation Services with Embedded Calculations

#### Component Validation
- **File:** `utils/componentValidation.ts`
- **Contains:** Validation logic mixed with calculations
- **Action:** Keep validation, migrate calculations to gateway

#### Engine Validation Service
- **File:** `utils/editor/EngineValidationService.ts`
- **Contains:** Engine compatibility checks + weight calculations
- **Action:** Use `SystemComponentsGateway.validateEngineForUnit()` instead

#### Advanced Validation
- **File:** `utils/advancedValidation.ts`
- **Contains:** Complex validation with inline calculations
- **Action:** Separate validation logic from calculations

---

### 5. Unit Analysis with Calculations

#### Unit Analysis
- **File:** `utils/unitAnalysis.ts`
- **Contains:** Analysis functions with embedded weight calculations
- **Action:** Refactor to use SystemComponentsGateway for calculations

#### BattleTech Construction Calculator
- **File:** `utils/unit/BattleTechConstructionCalculator.ts`
- **Contains:** Construction rules + calculations
- **Action:** Keep rules, migrate calculations

---

### 6. Armor Allocation
- **File:** `utils/armorAllocation.ts`
- **Contains:** `calculateRemainingTonnage()` which calls engine/gyro/structure calculations
- **Action:** Refactor to use SystemComponentsGateway

---

## 🔍 Low Priority / Audit Needed

### 7. Other Calculation Files (15 files found)

These files reference calculation functions but may have other purposes:
- Review each to determine if calculations can be extracted
- Keep business logic, replace only calculation calls

---

## 📦 Cleanup Strategy

### Phase 1: Create Migration Hooks ✅ (Can start now)
1. Create `hooks/systemComponents/useSystemComponents.ts`
2. Create `hooks/equipment/useEquipment.ts` 
3. Provide drop-in replacements for old hooks

### Phase 2: Migrate High-Impact Files (Week 1)
1. Migrate `hooks/useComponentDatabase.ts` to use new gateway
2. Migrate `utils/criticalSlots/CriticalSlotCalculator.ts`
3. Update imports in 15 files using engine/gyro/structure calculations
4. **Then delete:** `services/ComponentDatabaseService.ts`

### Phase 3: Migrate Calculation Utilities (Week 2)
1. Audit all 15 files using calculation utilities
2. Replace direct calculation calls with gateway calls
3. **Then delete:** 
   - `utils/engineCalculations.ts`
   - `utils/gyroCalculations.ts`
   - `utils/structureCalculations.ts`
   - `utils/componentCalculations.ts`

### Phase 4: Consolidate Weight/Validation Services (Week 3)
1. Migrate weight calculation services
2. Separate validation logic from calculations
3. **Then delete or refactor:**
   - `services/weight-balance/WeightCalculationService.ts` (parts)
   - `utils/editor/UnitCalculationService.ts` (parts)
   - `utils/criticalSlots/*Manager.ts` files (consolidate)

---

## 🎯 Expected Results

### Lines of Code Reduction
- **Before:** ~5,000 lines of scattered calculation logic
- **After:** ~1,500 lines in unified calculation system
- **Reduction:** 70% fewer lines to maintain

### Files Deleted
- **Immediate:** 3 files (already done: db.ts, equipment.ts API, equipmentService.ts)
- **Phase 2:** 1 file (ComponentDatabaseService.ts)
- **Phase 3:** 4 files (calculation utilities)
- **Phase 4:** 3-5 files (consolidated managers)
- **Total:** 11-13 files deleted

### Files Refactored
- **Phase 2:** 15 files (migrate calculation imports)
- **Phase 3:** 5-10 files (validation services)
- **Phase 4:** 3-5 files (managers)
- **Total:** 23-30 files refactored

### SOLID Compliance Improvements
- **Before:** 1,023-line ComponentDatabaseService
- **After:** Distributed across 6 focused adapters (~150 lines each)
- **Improvement:** 85% reduction in file size, clear responsibilities

---

## ⚠️ Migration Warnings

### Don't Delete Until Migration Complete
These files are still actively used and need careful migration:
1. `utils/engineCalculations.ts` - Used by 15 files
2. `utils/gyroCalculations.ts` - Used by 15 files
3. `services/ComponentDatabaseService.ts` - Used by 2 files

### Keep These Files (Different Purpose)
- `services/ComponentPlacementService.ts` - Handles UI placement, not calculations
- `services/ComponentUpdateService.ts` - Handles state updates, not calculations
- `constants/BattleTechConstructionRules.ts` - Rules definitions, not calculations

---

## 📊 Cleanup Metrics

### Current State
- **Calculation-related files:** ~20 files
- **Total lines in calculation files:** ~5,000 lines
- **Average file size:** 250 lines
- **Files >300 lines:** 5 files (including 1,023-line ComponentDatabaseService!)

### Target State
- **Unified calculation files:** 8 files (in calculation system)
- **Total lines:** ~1,500 lines
- **Average file size:** 190 lines
- **Files >300 lines:** 0 files (SOLID compliance!)

### Improvement
- **70% reduction** in calculation code
- **60% fewer** calculation-related files
- **100% elimination** of 300+ line files
- **100% improvement** in SOLID compliance

---

## 🚀 Quick Wins (Can Do Now)

### Immediate Deletions (Zero Risk)
These files have no active imports outside backup folder:
```bash
# Check for imports first, then delete if safe
git grep -l "from.*ComponentDatabaseService" | grep -v backup
```

### Create New Hooks (Parallel Development)
While old files are still in use, create new hooks:
1. `hooks/systemComponents/useSystemComponents.ts`
2. `hooks/equipment/useEquipment.ts`

These provide migration path without breaking existing code.

---

## 📝 Recommended Next Steps

1. **Week 1:** Create migration hooks
2. **Week 2:** Migrate ComponentDatabaseService users (2 files)
3. **Week 3:** Delete ComponentDatabaseService.ts (1,023 lines freed!)
4. **Week 4:** Migrate calculation utilities (15 files)
5. **Week 5:** Delete calculation utilities (4 files, ~1,000 lines freed!)
6. **Week 6:** Consolidate managers (5-10 files refactored)

**Total Impact:** 
- 11-13 files deleted
- 23-30 files refactored
- ~3,500 lines removed
- 100% SOLID compliance achieved

---

**Status:** Ready to begin cleanup  
**Risk Level:** Low (with proper migration)  
**Impact:** High (code quality, maintainability)

