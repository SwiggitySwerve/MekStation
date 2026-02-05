# Change: Update BV and Heat Calculation Implementation

## Why

The Battle Value (BV) and heat calculations were not functioning correctly due to:

1. Equipment registry not being initialized before calculations ran
2. Speed factor using raw MP instead of TMM (Target Movement Modifier)
3. Heat adjustment formula being too aggressive for small amounts of excess heat
4. Heat values not being displayed because equipment items had `heat: 0` when loaded before registry initialization

These issues caused BV to display as 631 (defensive only) instead of ~1,623, and heat to display as 0/19 instead of 27/19 for the Marauder C reference unit.

## What Changes

### Battle Value System

- **MODIFIED**: Speed factor now uses TMM-based lookup table instead of raw MP
- **MODIFIED**: Heat adjustment formula uses efficiency-based scaling with 90%+ threshold for no penalty
- **ADDED**: Registry initialization check with graceful fallback

### Heat Management System

- **ADDED**: Movement heat generation rules (running, jumping)
- **MODIFIED**: Heat profile calculation uses equipment registry lookup

### Construction Services

- **MODIFIED**: `calculateHeatProfile` verifies registry initialization before equipment heat lookup
- **MODIFIED**: `calculateBattleValue` includes debug logging and registry initialization handling

## Impact

- Affected specs: `battle-value-system`, `heat-management-system`, `construction-services`
- Affected code:
  - `src/services/construction/CalculationService.ts`
  - `src/types/validation/BattleValue.ts`
  - `src/hooks/useEquipmentRegistry.ts` (new)
  - `src/components/customizer/UnitEditorWithRouting.tsx`
  - `src/pages/_app.tsx`
