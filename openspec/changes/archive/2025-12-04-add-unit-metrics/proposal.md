# Change: Add Unit Metrics (BV, Cost, Rules Level)

## Why

The units table currently lacks important gameplay metrics that users need for army building and campaign play. Battle Value (BV) determines force balance, C-Bill cost enables economic tracking, and Rules Level helps filter units by game complexity.

## What Changes

- **Unit Index Format**: Add `rulesLevel`, `bv`, and `cost` fields to unit index entries
- **Cost Calculation**: Implement TechManual C-Bill cost formulas for all components
- **BV Calculation**: Implement BV 2.0 formulas (defensive BV, offensive BV, speed factor)
- **Units Table UI**: Add sortable columns for BV, Price, and Level

## Impact

- Affected specs: `unit-services`, `construction-services`, `battle-value-system`
- Affected code:
  - `scripts/data-migration/generate-unit-index.ts` - Add fields to index output
  - `src/services/common/types.ts` - Update IUnitIndexEntry interface
  - `src/services/units/CanonicalUnitService.ts` - Map new fields
  - `src/constants/BattleTechConstructionRules.ts` - Add cost/BV constants
  - `src/utils/construction/costCalculations.ts` - New cost calculation service
  - `src/utils/construction/battleValueCalculations.ts` - New BV calculation service
  - `src/pages/units/index.tsx` - Add table columns
  - `public/data/units/battlemechs/index.json` - Regenerated with new fields
