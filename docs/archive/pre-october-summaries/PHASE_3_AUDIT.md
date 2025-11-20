# Phase 3: Calculation Utilities Migration - Audit Report

**Date:** October 12, 2025  
**Status:** IN PROGRESS

---

## Files Using Calculation Utilities (Active Files Only)

### High Priority - Services & Utils (15 files)

1. **services/SystemComponentService.ts** - Core service using calculations
2. **services/validation/ValidationCalculations.ts** - Validation with calculations
3. **services/validation/ComponentValidationManager.ts** - Component validation
4. **services/validation/WeightRulesValidator.ts** - Weight validation
5. **services/WeightBalanceService.ts** - Weight balance calculations
6. **utils/unit/BattleTechConstructionCalculator.ts** - Construction calculations
7. **utils/unitAnalysis.ts** - Unit analysis with calculations
8. **utils/editor/UnitCalculationService.ts** - Editor calculations
9. **utils/criticalSlots/WeightBalanceManager.ts** - Weight balance manager
10. **utils/criticalSlots/UnitCalculationManager.ts** - Unit calculation manager
11. **utils/constructionRules/ConstructionRulesEngine.ts** - Construction rules
12. **utils/componentValidation.ts** - Component validation
13. **utils/componentSync.ts** - Component synchronization
14. **utils/armorAllocation.ts** - Armor allocation
15. **utils/advancedValidation.ts** - Advanced validation

### Medium Priority - Components (3 files)

16. **components/criticalSlots/EnhancedSystemComponentControls.tsx** - UI controls
17. **components/editor/tabs/StructureTabV2.tsx** - Structure tab
18. **components/editor/tabs/StructureTabWithHooks.tsx** - Structure tab with hooks

### Low Priority - Types & Tests (7 files)

19. **types/systemComponents.ts** - Type definitions (may just re-export)
20. **utils/componentCalculations.ts** - TARGET FOR DELETION (defines calculations)
21. **__tests__/utils/engineCalculations.test.ts** - Engine calculation tests
22. **__tests__/utils/structureCalculations.test.ts** - Structure calculation tests
23. **__tests__/utils/gyroCalculations.test.ts** - Gyro calculation tests
24. **__tests__/integration/TopBarWeightCalculation.test.tsx** - Integration test
25. **__tests__/integration/EndoSteelWeightCalculation.test.tsx** - Integration test

---

## Target Files for Deletion

After migration, these 4 files will be deleted:

1. **utils/engineCalculations.ts** (~250 lines)
2. **utils/gyroCalculations.ts** (~200 lines)
3. **utils/structureCalculations.ts** (~180 lines)
4. **utils/componentCalculations.ts** (~200 lines)

**Total:** ~830 lines to be removed

---

## Migration Strategy

### Step 1: High Priority Services (Days 1-3)
Migrate services layer first as they're used by multiple components.

**Order:**
1. SystemComponentService.ts (might be redundant with gateway?)
2. WeightBalanceService.ts
3. ValidationCalculations.ts
4. ComponentValidationManager.ts
5. WeightRulesValidator.ts

### Step 2: High Priority Utils (Days 4-6)
Migrate utility files that contain business logic.

**Order:**
6. BattleTechConstructionCalculator.ts
7. UnitCalculationService.ts
8. WeightBalanceManager.ts
9. UnitCalculationManager.ts
10. ConstructionRulesEngine.ts

### Step 3: Validation & Allocation (Days 7-8)
Separate validation logic from calculations.

**Order:**
11. componentValidation.ts
12. advancedValidation.ts
13. armorAllocation.ts
14. unitAnalysis.ts
15. componentSync.ts

### Step 4: Components (Day 9)
Update UI components to use new patterns.

**Order:**
16. EnhancedSystemComponentControls.tsx
17. StructureTabV2.tsx
18. StructureTabWithHooks.tsx

### Step 5: Tests (Day 10)
Update or remove tests for deleted calculation files.

**Order:**
19. Update integration tests to use gateway
20. Remove unit tests for deleted files

### Step 6: Types & Cleanup (Day 10)
Final cleanup.

**Order:**
21. Update systemComponents.ts if needed
22. Verify all imports
23. Delete 4 calculation utility files

---

## Migration Pattern

### Before:
```typescript
import { calculateEngineWeight, ENGINE_WEIGHT_MULTIPLIERS } from '../../utils/engineCalculations'

const weight = calculateEngineWeight(engineRating, unitTonnage, engineType)
```

### After:
```typescript
import { SystemComponentsGateway } from '../../services/systemComponents/SystemComponentsGateway'

const weight = SystemComponentsGateway.calculateEngineWeight(engineId, engineRating, unitTonnage)
```

### Key Differences:
1. Need `engineId` instead of just `engineType` string
2. Gateway method names are slightly different
3. May need to create context for some operations
4. Lookup tables now internal to gateway

---

## Verification Checklist

For each migrated file:
- [ ] All calculation imports replaced
- [ ] All calculation calls replaced
- [ ] Tests updated and passing
- [ ] No type errors
- [ ] No linter errors
- [ ] Manual smoke test

Before deleting calculation files:
- [ ] Search returns 0 active imports
- [ ] All tests passing
- [ ] Build succeeds
- [ ] Integration tests pass

---

## Risk Assessment

### Low Risk (5 files)
- Types file (just re-exports)
- Component files (simple UI updates)
- ComponentSync (may be simple)

### Medium Risk (10 files)
- Validation files (need to preserve logic)
- Manager files (complex state management)
- Analysis files (multiple calculations)

### High Risk (5 files)
- SystemComponentService.ts (may be redundant, need careful review)
- BattleTechConstructionCalculator.ts (core construction logic)
- ConstructionRulesEngine.ts (complex rules)
- WeightBalanceService.ts (critical for weight calculations)
- UnitCalculationService.ts (widely used)

---

## Decision Points

1. **SystemComponentService.ts**: Keep or delete?
   - Does it duplicate SystemComponentsGateway?
   - If redundant, merge functionality into gateway

2. **WeightBalanceService.ts**: Refactor or replace?
   - Keep as thin wrapper?
   - Or use gateway directly?

3. **Test files**: Update or delete?
   - Keep integration tests (update to use gateway)
   - Delete unit tests for calculation utilities

---

## Next Actions

1. Start with SystemComponentService.ts audit
2. Determine if it's redundant with gateway
3. Begin migration of validation services
4. Track progress in this document

---

**Status:** Ready to begin Phase 3 migrations

