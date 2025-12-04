# Tasks: Add Unit Metrics

## 1. Rules Level (Quick Win)
- [x] 1.1 Update `IUnitIndexEntry` in `src/services/common/types.ts` to include `rulesLevel`
- [x] 1.2 Update `RawUnitIndexEntry` in `CanonicalUnitService.ts` to include `rulesLevel`
- [x] 1.3 Update `mapRawToIndexEntry` to map rulesLevel field
- [x] 1.4 Update index generator to include rulesLevel in output
- [x] 1.5 Regenerate `index.json` with rulesLevel field
- [x] 1.6 Add `rulesLevel` to `IUnitEntry` in page types
- [x] 1.7 Add Level column to units table UI

## 2. C-Bill Cost Calculation
- [x] 2.1 Add cost constants to `src/utils/construction/costCalculations.ts`:
  - Engine cost multipliers by type
  - Gyro cost multipliers by type
  - Structure cost per ton by type
  - Cockpit costs by type
  - Heat sink costs by type
- [x] 2.2 Create `src/utils/construction/costCalculations.ts`:
  - `calculateEngineCost(rating, type)`
  - `calculateGyroCost(engineRating, type)`
  - `calculateStructureCost(tonnage, type)`
  - `calculateCockpitCost(type)`
  - `calculateHeatSinkCost(count, type)`
  - `calculateTotalCost(unit)`
- [x] 2.3 Update index generator to calculate and include cost
- [x] 2.4 Regenerate index with cost field
- [x] 2.5 Add Price column to units table UI

## 3. Battle Value Calculation
- [x] 3.1 Add BV constants to `src/utils/construction/battleValueCalculations.ts`:
  - Speed factor lookup table
  - Defensive factor multipliers
  - Weapon BV values
- [x] 3.2 Create `src/utils/construction/battleValueCalculations.ts`:
  - `calculateDefensiveBV(armor, structure, heatSinks)` - armor, structure, heat dissipation
  - `calculateOffensiveBV(weapons)` - weapons, ammo, modifiers
  - `calculateSpeedFactor(walkMP, runMP, jumpMP)`
  - `calculateTotalBV(unit)`
- [x] 3.3 Update index generator to calculate and include BV
- [x] 3.4 Regenerate index with BV field
- [x] 3.5 Add BV column to units table UI

## 4. Validation
- [x] 4.1 Sample BV values generated (rough estimates for all 4217 units)
- [x] 4.2 Run `npm run build` - no type errors
- [x] 4.3 All columns sortable (ascending/descending)

## Implementation Notes

### New Files Created
- `src/utils/construction/costCalculations.ts` - Cost calculation formulas
- `src/utils/construction/battleValueCalculations.ts` - BV 2.0 calculation formulas
- `scripts/data-migration/add-rules-level-to-index.ts` - Add rulesLevel to index
- `scripts/data-migration/add-cost-to-index.ts` - Calculate and add cost to index
- `scripts/data-migration/add-bv-to-index.ts` - Calculate and add BV to index

### Modified Files
- `src/services/common/types.ts` - Added rulesLevel, cost, bv to IUnitIndexEntry
- `src/services/units/CanonicalUnitService.ts` - Map new fields from index
- `src/types/pages/UnitPageTypes.ts` - Added rulesLevel, cost, bv to IUnitEntry
- `src/pages/units/index.tsx` - Added Level, Price, BV columns with sorting
- `src/utils/construction/index.ts` - Export new modules
- `scripts/megameklab-conversion/mtf_converter.py` - Include rulesLevel in index
- `public/data/units/battlemechs/index.json` - Regenerated with all new fields

