# Change: Fix Armor Points Display

## Why

The armor tab summary bar displays allocated points vs available-from-tonnage (e.g., "169/176"). This is misleading because the denominator can exceed the mech's physical armor capacity. The denominator should show the max armor the mech can hold, with wasted points shown separately.

## What Changes

- **MODIFIED** Armor Points Display requirement to show `allocated / maxTotalArmor` instead of `allocated / availablePoints`

## Impact

- Affected specs: `armor-system`
- Affected code: `src/components/customizer/tabs/ArmorTab.tsx`
- Affected tests: `src/__tests__/components/customizer/tabs/ArmorTab.test.tsx`
