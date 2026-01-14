# Change: Add Calculation Guards and UI Rules

## Why

The system needs explicit rules for how calculations are automatically adjusted when user inputs change. Currently missing:
1. Armor tonnage should auto-cap when switching to more efficient armor types
2. Heat display should show maximum possible heat (weapons + worst-case movement)
3. UI should prevent invalid states through proactive guards

These rules were implemented ad-hoc but need formal specification to prevent regression.

## What Changes

- **armor-system**: Add requirement for automatic tonnage adjustment on armor type change
- **heat-management-system**: Add requirement for maximum heat display calculation

## Impact

- Affected specs: `armor-system`, `heat-management-system`
- Affected code: `useUnitStore.ts` (setArmorType), `CalculationService.ts` (calculateHeatProfile)
- Already implemented: Yes (this spec documents existing behavior)
