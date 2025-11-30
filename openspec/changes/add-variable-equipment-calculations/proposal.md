# Change: Add Variable Equipment Calculations

## Why

Many BattleTech equipment items have properties (weight, slots, cost, BV) that vary based on mech configuration. Currently, these items store placeholder values (`weight: 0`) with no calculation functions. This makes it impossible to accurately calculate construction weight and validate mech builds.

## What Changes

- **ADDED**: Variable equipment calculation system with standardized interfaces
- **ADDED**: Calculation functions for:
  - Targeting Computer (weight/slots from weapon tonnage)
  - MASC (weight/slots from engine rating)
  - Supercharger (weight from engine weight)
  - Partial Wing (weight from mech tonnage)
  - TSM cost (from mech tonnage)
- **MODIFIED**: Electronics system spec with targeting computer formulas
- **MODIFIED**: Movement system spec with MASC/Supercharger/Partial Wing formulas
- **MODIFIED**: Equipment database spec with variable equipment patterns

## Impact

- Affected specs: electronics-system, movement-system, physical-weapons-system, equipment-database
- Affected code:
  - `src/types/equipment/VariableEquipment.ts` (new)
  - `src/utils/equipment/variableEquipmentCalculations.ts` (new)
  - `src/utils/equipment/EquipmentCalculator.ts` (new)
  - `src/types/equipment/ElectronicsTypes.ts` (modify)
  - `src/types/equipment/MiscEquipmentTypes.ts` (modify)

