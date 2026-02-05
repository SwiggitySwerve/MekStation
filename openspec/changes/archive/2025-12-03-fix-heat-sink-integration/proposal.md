# Change: Fix Heat Sink Engine Integration

## Why

The current implementation has two critical issues:

1. **Integral heat sink calculation is incorrectly capped at 10** - The formula should be `floor(rating / 25)` with no cap. A 400-rating engine should provide 16 integral heat sinks, not 10.
2. **External heat sinks are not added to the equipment loadout** - Unlike jump jets, Endo Steel, and Ferro-Fibrous, external heat sinks are not materialized as equipment items for critical slot assignment.

Evidence from MegaMekLab:

- 100-ton mech with 400-rating engine shows "Engine Free: 16" (not 10)
- 75-ton mech with 300-rating engine shows "Engine Free: 12" (not 10)

## What Changes

1. **Remove erroneous cap** in `calculateIntegralHeatSinks()` - Change from `Math.min(10, floor(rating/25))` to `floor(rating/25)`
2. **Add heat sink equipment sync** to useUnitStore - External heat sinks need to be added to equipment array when heat sink count/type changes (following the jump jet pattern)
3. **Update spec** - Fix the "max 10" language in the Engine Integration scenario

## Impact

- Affected specs: `heat-sink-system`
- Affected code:
  - `src/utils/construction/engineCalculations.ts` - Remove cap
  - `src/services/units/UnitFactoryService.ts` - Remove secondary cap
  - `src/stores/useUnitStore.ts` - Add heat sink equipment sync
  - Tests expecting capped behavior
