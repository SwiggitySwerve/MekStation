# Mobile/Desktop Component Consolidation Plan

**Date**: 2026-01-14  
**Status**: Ready for Implementation  
**Estimated Effort**: 4-6 hours  
**Risk Level**: Low  

## Executive Summary

Extract ~142 lines of duplicated code from `GlobalLoadoutTray` (desktop) and `MobileLoadoutList` (mobile) into shared modules. The core architecture (separate components for mobile/desktop) is correct and will be preserved.

## Current State

```
src/components/customizer/
├── equipment/
│   ├── GlobalLoadoutTray.tsx (841 lines) - Desktop sidebar
│   ├── BottomSheetTray.tsx (213 lines) - Mobile wrapper
│   ├── ResponsiveLoadoutTray.tsx (135 lines) - CSS switch
│   ├── EquipmentBrowser.tsx
│   ├── EquipmentRow.tsx
│   └── CompactFilterBar.tsx
└── mobile/
    ├── MobileEquipmentRow.tsx (277 lines)
    ├── MobileLoadoutHeader.tsx (188 lines)
    ├── MobileLoadoutList.tsx (428 lines)
    └── index.ts
```

## Proposed Changes

### 1. New File: `equipmentConstants.ts`

**Path**: `src/components/customizer/equipment/equipmentConstants.ts`

**Extract from**:
- `GlobalLoadoutTray.tsx` lines 83-132
- `MobileLoadoutList.tsx` lines 51-73

**Contents**:
```typescript
// Category ordering for display
export const CATEGORY_ORDER: EquipmentCategory[] = [...]

// Category display labels
export const CATEGORY_LABELS: Record<EquipmentCategory, string> = {...}

// Filter button configuration
export interface CategoryFilterConfig {
  category: EquipmentCategory | 'ALL';
  label: string;
  icon: string;
}
export const CATEGORY_FILTERS: CategoryFilterConfig[] = [...]

// Categories grouped under "Other" filter
export const OTHER_CATEGORIES: EquipmentCategory[] = [...]
```

**Lines saved**: ~25 lines

---

### 2. New File: `locationUtils.ts`

**Path**: `src/utils/locationUtils.ts`

**Extract from**:
- `GlobalLoadoutTray.tsx` lines 194-207
- `MobileEquipmentRow.tsx` lines 75-87

**Contents**:
```typescript
/** Convert location names to shorthand (e.g., "Right Torso" -> "RT") */
export function getLocationShorthand(location: string): string {
  const shortcuts: Record<string, string> = {
    'Head': 'HD',
    'Center Torso': 'CT',
    'Left Torso': 'LT',
    'Right Torso': 'RT',
    'Left Arm': 'LA',
    'Right Arm': 'RA',
    'Left Leg': 'LL',
    'Right Leg': 'RL',
  };
  return shortcuts[location] || location;
}
```

**Lines saved**: ~12 lines

---

### 3. New File: `CategoryFilterBar.tsx`

**Path**: `src/components/customizer/equipment/CategoryFilterBar.tsx`

**Extract from**:
- `GlobalLoadoutTray.tsx` lines 213-247 (CategoryFilterBar component)
- `MobileLoadoutList.tsx` lines 79-113 (CategoryFilterBar component)

**Interface**:
```typescript
interface CategoryFilterBarProps {
  activeCategory: EquipmentCategory | 'ALL';
  onSelectCategory: (category: EquipmentCategory | 'ALL') => void;
  /** Show text labels alongside icons (default: false) */
  showLabels?: boolean;
  /** Compact mode for sidebar (default: false) */
  compact?: boolean;
  className?: string;
}
```

**Behavior**:
- `compact={true}` (desktop): 28px buttons, icons only, tight spacing
- `compact={false}` (mobile): Larger buttons, optional labels, more padding
- `showLabels={true}`: Show category labels (hidden on xs, visible on sm+)

**Lines saved**: ~65 lines (35 + 30)

---

### 4. New File: `useEquipmentFiltering.ts`

**Path**: `src/hooks/useEquipmentFiltering.ts`

**Extract from**:
- `GlobalLoadoutTray.tsx` lines 592-615 (filtering/grouping logic)
- `MobileLoadoutList.tsx` lines 237-268 (filtering/grouping logic)

**Interface**:
```typescript
interface UseEquipmentFilteringOptions<T extends { category: EquipmentCategory; isAllocated: boolean }> {
  equipment: T[];
  activeCategory: EquipmentCategory | 'ALL';
}

interface UseEquipmentFilteringResult<T> {
  /** Equipment filtered by active category */
  filteredEquipment: T[];
  /** Unallocated items from filtered set */
  unallocated: T[];
  /** Allocated items from filtered set */
  allocated: T[];
  /** Unallocated items grouped by category */
  unallocatedByCategory: Map<EquipmentCategory, T[]>;
  /** Allocated items grouped by category */
  allocatedByCategory: Map<EquipmentCategory, T[]>;
}

export function useEquipmentFiltering<T>(...): UseEquipmentFilteringResult<T>
```

**Lines saved**: ~40 lines

---

## Implementation Order

### Phase 1: Extract Constants & Utils (Low Risk)

1. **Create `equipmentConstants.ts`**
   - Copy constants from GlobalLoadoutTray
   - Export all constants
   - Update GlobalLoadoutTray imports
   - Update MobileLoadoutList imports
   - Run tests

2. **Create `locationUtils.ts`**
   - Copy function from GlobalLoadoutTray
   - Export function
   - Update GlobalLoadoutTray imports
   - Update MobileEquipmentRow imports
   - Run tests

### Phase 2: Extract CategoryFilterBar (Medium Risk)

3. **Create `CategoryFilterBar.tsx`**
   - Design unified interface with compact/showLabels props
   - Implement component supporting both modes
   - Add unit tests
   - Update GlobalLoadoutTray to use shared component
   - Update MobileLoadoutList to use shared component
   - Run full test suite

### Phase 3: Extract Hook (Medium Risk)

4. **Create `useEquipmentFiltering.ts`**
   - Implement generic hook
   - Add unit tests
   - Update GlobalLoadoutTray to use hook
   - Update MobileLoadoutList to use hook
   - Run full test suite

### Phase 4: Cleanup

5. **Update barrel exports**
   - Add to `equipment/index.ts`
   - Add to `hooks/index.ts` (if exists)

6. **Final verification**
   - Run `npm run lint`
   - Run `npm test`
   - Manual testing on mobile and desktop viewports

---

## Files Modified

| File | Action | Changes |
|------|--------|---------|
| `src/components/customizer/equipment/equipmentConstants.ts` | CREATE | New file with shared constants |
| `src/utils/locationUtils.ts` | CREATE | New file with location shorthand function |
| `src/components/customizer/equipment/CategoryFilterBar.tsx` | CREATE | New shared filter bar component |
| `src/hooks/useEquipmentFiltering.ts` | CREATE | New hook for filtering/grouping logic |
| `src/components/customizer/equipment/GlobalLoadoutTray.tsx` | MODIFY | Remove duplicates, import shared code |
| `src/components/customizer/mobile/MobileLoadoutList.tsx` | MODIFY | Remove duplicates, import shared code |
| `src/components/customizer/mobile/MobileEquipmentRow.tsx` | MODIFY | Import shared location utility |
| `src/components/customizer/equipment/index.ts` | MODIFY | Add new exports |

---

## Detailed Code Changes

### GlobalLoadoutTray.tsx Changes

**Remove** (lines to delete):
- Lines 83-132: CATEGORY_ORDER, CATEGORY_LABELS, CategoryFilterConfig, CATEGORY_FILTERS, OTHER_CATEGORIES
- Lines 194-207: getLocationShorthand function
- Lines 213-247: CategoryFilterBar component
- Lines 592-615: Filtering/grouping useMemo blocks (replace with hook)

**Add** (imports):
```typescript
import { CATEGORY_ORDER, CATEGORY_LABELS, CATEGORY_FILTERS, OTHER_CATEGORIES } from './equipmentConstants';
import { getLocationShorthand } from '@/utils/locationUtils';
import { CategoryFilterBar } from './CategoryFilterBar';
import { useEquipmentFiltering } from '@/hooks/useEquipmentFiltering';
```

**Estimated reduction**: ~130 lines removed, ~10 lines added = **~120 lines saved**

---

### MobileLoadoutList.tsx Changes

**Remove** (lines to delete):
- Lines 51-73: CategoryConfig, CATEGORY_FILTERS, OTHER_CATEGORIES
- Lines 79-113: CategoryFilterBar component
- Lines 237-268: Filtering logic (replace with hook)

**Add** (imports):
```typescript
import { CATEGORY_FILTERS, OTHER_CATEGORIES } from '../equipment/equipmentConstants';
import { CategoryFilterBar } from '../equipment/CategoryFilterBar';
import { useEquipmentFiltering } from '@/hooks/useEquipmentFiltering';
```

**Estimated reduction**: ~70 lines removed, ~5 lines added = **~65 lines saved**

---

### MobileEquipmentRow.tsx Changes

**Remove**:
- Lines 75-87: getLocationShorthand function

**Add**:
```typescript
import { getLocationShorthand } from '@/utils/locationUtils';
```

**Estimated reduction**: ~12 lines removed, ~1 line added = **~11 lines saved**

---

## Rollback Plan

If issues arise:
1. All changes are additive until final step
2. Git revert to pre-refactoring commit
3. Original files preserved in git history

---

## Success Criteria

- [ ] All existing tests pass
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Manual verification: desktop loadout tray works
- [ ] Manual verification: mobile loadout tray works
- [ ] Code review: shared components are correctly used
- [ ] Lines of code reduced by ~140-200 lines

---

## Notes

### Why Keep Components Separate

The analysis confirmed that `GlobalLoadoutTray` and `MobileLoadoutList` should remain separate because:

1. **Different interaction patterns**: Desktop uses drag-drop + context menus; Mobile uses tap-to-assign + inline buttons
2. **Different layouts**: Desktop is a collapsible sidebar (180-240px); Mobile is full-screen overlay
3. **Different row heights**: Desktop uses 28px; Mobile uses 36px+ for touch targets
4. **Different state management**: Desktop has expand/collapse; Mobile has open/close

Merging them would create unnecessary complexity and conditional logic.

### What We're Extracting

Only the **implementation details** that are truly duplicated:
- Constants (category configs)
- Utilities (location shorthand)
- UI patterns (filter bar with same functionality)
- Logic (filtering/grouping algorithm)

This reduces maintenance burden while preserving the distinct UX for each platform.
