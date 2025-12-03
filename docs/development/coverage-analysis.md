# Code Coverage Analysis Report

**Generated**: 2025-12-03
**Test Framework**: Jest
**Total Files Analyzed**: 164

## Executive Summary

| Metric | Coverage | Rating |
|--------|----------|--------|
| Statements | 41.91% | 🔴 Poor |
| Branches | 53.68% | 🟠 Fair |
| Functions | 59.32% | 🟠 Fair |
| Lines | 41.91% | 🔴 Poor |
| **Overall Average** | **49.20%** | 🔴 Poor |

---

## Coverage by Category

| Category | Statements | Branches | Functions | Lines | Files |
|----------|------------|----------|-----------|-------|-------|
| components/customizer | 0.0% | 17.6% | 15.7% | 0.0% | 51 |
| utils/colors | 0.0% | 20.0% | 20.0% | 0.0% | 5 |
| pages/api/units | 11.1% | 11.1% | 11.1% | 11.1% | 9 |
| services/persistence | 17.4% | 30.5% | 38.2% | 17.4% | 5 |
| services/units | 41.5% | 37.3% | 52.9% | 41.5% | 10 |
| services/other | 41.7% | 100.0% | 67.9% | 41.7% | 4 |
| utils/other | 58.0% | 78.7% | 90.7% | 58.0% | 8 |
| services/equipment | 67.3% | 73.1% | 84.8% | 67.3% | 9 |
| services/construction | 63.4% | 70.6% | 97.4% | 63.4% | 4 |
| utils/serialization | 65.4% | 95.0% | 100.0% | 65.4% | 3 |
| services/conversion | 77.8% | 76.9% | 100.0% | 77.8% | 7 |
| utils/physical | 66.7% | 100.0% | 100.0% | 66.7% | 3 |
| utils/temporal | 66.7% | 100.0% | 100.0% | 66.7% | 3 |
| utils/construction | 83.4% | 70.6% | 98.6% | 83.4% | 11 |
| utils/validation | 74.1% | 88.4% | 100.0% | 74.1% | 4 |
| components/ui | 77.9% | 97.9% | 100.0% | 77.9% | 7 |
| pages/api | 85.8% | 94.6% | 100.0% | 85.8% | 13 |
| components/common | 95.8% | 92.5% | 96.7% | 95.8% | 8 |

---

## Critical Gaps (0% Coverage)

The following files have **zero test coverage** and should be prioritized:

| File | Category |
|------|----------|
| `src/components/customizer/CustomizerWithRouter.tsx` | components/customizer |
| `src/components/customizer/UnitEditorWithRouting.tsx` | components/customizer |
| `src/components/customizer/armor/ArmorDiagram.tsx` | components/customizer |
| `src/components/customizer/armor/ArmorLegend.tsx` | components/customizer |
| `src/components/customizer/armor/ArmorLocation.tsx` | components/customizer |
| `src/components/customizer/armor/LocationArmorEditor.tsx` | components/customizer |
| `src/components/customizer/critical-slots/CriticalSlotToolbar.tsx` | components/customizer |
| `src/components/customizer/critical-slots/CriticalSlotsDisplay.tsx` | components/customizer |
| `src/components/customizer/critical-slots/DraggableEquipment.tsx` | components/customizer |
| `src/components/customizer/critical-slots/LocationGrid.tsx` | components/customizer |
| `src/components/customizer/critical-slots/SlotRow.tsx` | components/customizer |
| `src/components/customizer/dialogs/ImportUnitDialog.tsx` | components/customizer |
| `src/components/customizer/dialogs/ModalOverlay.tsx` | components/customizer |
| `src/components/customizer/dialogs/ResetConfirmationDialog.tsx` | components/customizer |
| `src/components/customizer/dialogs/SaveUnitDialog.tsx` | components/customizer |
| `src/components/customizer/dialogs/UnitLoadDialog.tsx` | components/customizer |
| `src/components/customizer/dialogs/UnsavedChangesDialog.tsx` | components/customizer |
| `src/components/customizer/dialogs/VersionHistoryDialog.tsx` | components/customizer |
| `src/components/customizer/equipment/CategoryToggleBar.tsx` | components/customizer |
| `src/components/customizer/equipment/EquipmentBrowser.tsx` | components/customizer |
| `src/components/customizer/equipment/EquipmentFilters.tsx` | components/customizer |
| `src/components/customizer/equipment/EquipmentRow.tsx` | components/customizer |
| `src/components/customizer/equipment/EquipmentTray.tsx` | components/customizer |
| `src/components/customizer/equipment/GlobalLoadoutTray.tsx` | components/customizer |
| `src/components/customizer/shared/ColorLegend.tsx` | components/customizer |
| `src/components/customizer/shared/GlobalStatusBar.tsx` | components/customizer |
| `src/components/customizer/shared/StatCell.tsx` | components/customizer |
| `src/components/customizer/shared/TechBaseBadge.tsx` | components/customizer |
| `src/components/customizer/shared/TechBaseConfiguration.tsx` | components/customizer |
| `src/components/customizer/shared/UnitInfoBanner.tsx` | components/customizer |

*...and 53 more files with 0% coverage*

---

## Low Coverage Files (<50%)

Files that exist but have insufficient test coverage:

| File | Statements | Functions | Category |
|------|------------|-----------|----------|
| `CustomUnitApiService.ts` | 5.3% | 5.9% | services/units |
| `IndexedDBService.ts` | 8.3% | 0.0% | services/persistence |
| `EquipmentLoaderService.ts` | 8.3% | 8.9% | services/equipment |
| `UnitSearchService.ts` | 31.1% | 14.3% | services/units |
| `equipmentListUtils.ts` | 40.5% | 55.2% | utils/other |
| `CanonicalUnitService.ts` | 48.9% | 46.7% | services/units |

---

## Well-Tested Files (>90% Coverage)

Files with excellent test coverage:

| File | Statements | Branches | Category |
|------|------------|----------|----------|
| `heatSinkCalculations.ts` | 90.7% | 42.9% | utils/construction |
| `constructionRules.ts` | 93.8% | 60.0% | utils/construction |
| `gyroCalculations.ts` | 92.0% | 66.7% | utils/construction |
| `EquipmentCalculatorService.ts` | 90.5% | 73.3% | services/equipment |
| `weightClassUtils.ts` | 91.5% | 72.7% | utils/other |
| `MTFImportService.ts` | 90.8% | 77.8% | services/conversion |
| `armorCalculations.ts` | 92.6% | 75.7% | utils/construction |
| `LocationMappings.ts` | 90.8% | 80.0% | services/conversion |
| `engineCalculations.ts` | 93.0% | 77.3% | utils/construction |
| `EquipmentNameResolver.ts` | 95.6% | 77.8% | services/conversion |
| `ConversionValidation.ts` | 97.1% | 76.6% | services/conversion |
| `ValidationOrchestrator.ts` | 98.2% | 77.8% | utils/validation |
| `displacementUtils.ts` | 98.4% | 78.9% | utils/construction |
| `slotOperations.ts` | 97.1% | 81.8% | utils/construction |
| `UnitFormatConverter.ts` | 96.8% | 84.3% | services/conversion |

---

## Recommendations

### Priority 1: Critical Business Logic (Immediate)

The following areas contain critical BattleTech construction rules and should have comprehensive tests:

1. **services/units/** - Unit management services at 41.5% coverage
   - Focus on: UnitLoaderService, UnitNameValidator, CustomUnitApiService
   
2. **services/persistence/** - Data persistence at 17.4% coverage
   - Focus on: FileService, MigrationService, IndexedDBService

3. **utils/construction/** - Construction calculations at 83.4% coverage
   - Generally well-tested, but verify movementCalculations.ts

### Priority 2: User Interface (Short-term)

4. **components/customizer/** - Main editor UI at 0% coverage
   - These are React components but critical for the user experience
   - Add integration tests for key user flows

5. **utils/colors/** - Color utilities at 0% coverage
   - Simple utilities, easy wins for coverage

### Priority 3: API Endpoints (Medium-term)

6. **pages/api/units/** - Unit API at 11.1% coverage
   - Custom unit CRUD operations need testing

---

## Coverage Targets

Based on the current state, recommended coverage thresholds:

```javascript
// jest.config.js
coverageThreshold: {
  global: {
    statements: 50,
    branches: 40,
    functions: 45,
    lines: 50
  },
  './src/services/construction/': {
    statements: 80,
    branches: 60,
    functions: 90
  },
  './src/utils/construction/': {
    statements: 90,
    branches: 70,
    functions: 95
  },
  './src/utils/validation/': {
    statements: 95,
    branches: 85,
    functions: 100
  }
}
```

---

## Test File Mapping

Current test files exist in `src/__tests__/` with the following structure:
- `api/` - API endpoint tests
- `components/` - React component tests
- `hooks/` - Custom hook tests
- `integration/` - Integration tests
- `service/` - Service layer tests
- `stores/` - Zustand store tests
- `unit/` - Unit tests for utilities

---

## Next Steps

1. Run `npm run test:coverage` to generate fresh coverage data
2. Open `coverage/lcov-report/index.html` in browser for detailed view
3. Focus on Priority 1 items first
4. Add coverage thresholds to prevent regression
5. Set up CI to track coverage trends

---

*This report is auto-generated by `scripts/analysis/coverage-analysis.js`*
