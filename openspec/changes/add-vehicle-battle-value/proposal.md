# Change: Add Vehicle Battle Value

## Why

The `battle-value-system` spec currently scopes BV to BattleMechs and reports BV=0 for every vehicle. Campaigns already list vehicles in forces, so undercosting them skews force-comparison, salvage payouts, and scenario balance. This change adds Vehicle BV 2.0 computation using TechManual rules for combat vehicles, VTOLs, and support vehicles. It depends on `add-vehicle-construction` so the calculator has legal inputs, and it blocks `add-vehicle-combat-behavior` which uses BV for AI target prioritization.

## What Changes

- Add vehicle-specific defensive BV: armor BV × armor multiplier + structure BV + defensive equipment BV − explosive penalties
- Add vehicle defensive factor = 1 + ((maxMovement × 0.5) / 10) using ground speed (cruise × 0.5 for TMM) and flanking for VTOL / Hover / Hydrofoil bonus
- Add vehicle offensive BV: weapon BV + ammo BV + offensive equipment BV, then × speed factor
- Add vehicle speed factor using `runMP = flankMP` (no separate jump contribution for wheeled/tracked; VTOL includes altitude movement once combat spec lands)
- Apply vehicle-specific multipliers: +5% for VTOL maneuverability, +5% per turret arc, motive-modifier penalty for fragile motive systems (hover/hydrofoil motive penalty already captured in offensive factor)
- Apply crew skill multiplier identical to mech table (gunnery × piloting)
- Support BAR armor scaling: support vehicles with BAR < 10 multiply armor BV by BAR / 10
- Record vehicle BV breakdown on unit for display in customizer status bar

## Non-goals

- Motive-damage BV adjustments during combat (those are handled live, not at construction BV)
- BV calculation for DropShips / naval warships
- Battle Armor / Infantry / Protomech / Aerospace BV — each has its own Phase 6 change

## Dependencies

- **Requires**: `add-vehicle-construction` (legal unit state), `battle-value-system` (defines mech BV patterns reused here)
- **Blocks**: `add-vehicle-combat-behavior` (AI uses BV for target pick)
- **Phase 1 coupling**: none — BV is construction-time

## Impact

- **Affected specs**: `battle-value-system` (MODIFIED to reference vehicle path), `vehicle-unit-system` (ADDED BV requirements)
- **Affected code**: `src/utils/construction/battleValueCalculations.ts` (new `calculateVehicleBV`), `src/utils/construction/vehicle/vehicleBV.ts`, `src/utils/construction/equipmentBVResolver.ts` (already applies to weapons; add vehicle-specific multipliers), `src/components/customizer/vehicle/VehicleStatusBar.tsx`
- **New file**: `src/utils/construction/vehicle/vehicleBV.ts` with defensive/offensive decomposition
- **Validation target**: BV parity against MegaMekLab canonical vehicles should reach ≥ 95% within 5% and ≥ 80% within 1% (bar is lower than mechs because catalogs have fewer canonical vehicles)
