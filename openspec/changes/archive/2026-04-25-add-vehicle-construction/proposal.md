# Change: Add Vehicle Construction

## Why

Phase 6 brings combined arms to MekStation. Vehicles (combat vehicles, VTOLs, support vehicles) are the most common non-mech secondary unit and must move from skeleton UI to a full construction pipeline. Today `src/components/customizer/vehicle/` renders a chassis/armor/equipment shell but no construction rules enforce legal configurations, motive systems, turret allocation, engine tonnage, or crew. This change completes the construction side of the vehicle stack so later Phase 6 changes (BV, combat) have a valid unit to operate on.

## What Changes

- Add chassis configuration: motion type (Tracked/Wheeled/Hover/VTOL/Naval/Hydrofoil/Submarine/WiGE/Rail/Maglev) with per-type tonnage cap enforcement
- Add engine selection with motive-modifier weight table (ICE/Fusion/XL/Light/Fuel Cell) and engine-rating validation against cruise MP
- Add internal structure weight calculation (10% of tonnage, rounded to half-ton for combat vehicles)
- Add armor allocation for the 6–8 vehicle locations (Front / Left Side / Right Side / Rear / Turret / (Rotor for VTOL) / (Chin Turret for VTOL) / (Body for support))
- Add turret system: None / Single (360°) / Dual / Chin (VTOL only) / Sponson; enforce 10% of equipment weight rule
- Add weapon and equipment mounting per location with ammo and power-amp weight calculation
- Add crew size derivation from tonnage and motion type; enforce minimum crew per table
- Add BAR rating selection for support vehicles; armor weight uses BAR-based points/ton
- Add construction validation rule set (`VAL-VEHICLE-*`) covering tonnage/motion-type compatibility, engine legality, turret weight, armor max per location, crew, and power-amp requirements
- Wire the construction pipeline into `vehicle-unit-system` store and customizer tabs (Structure/Armor/Equipment/Turret)

## Non-goals

- Combat behavior (damage, motive hits, hit tables) — covered by `add-vehicle-combat-behavior`
- BV calculation — covered by `add-vehicle-battle-value`
- DropShip / naval warship construction — out of scope
- Record-sheet PDF layout for vehicles — follow-up work

## Dependencies

- **Requires**: existing `vehicle-unit-system` spec stubs (this change fills them), `construction-services`, `equipment-database`, `armor-system`
- **Blocks**: `add-vehicle-battle-value`, `add-vehicle-combat-behavior`
- **Phase 1 coupling**: uses the shared `construction-rules-core` pipeline; no dependency on A4 damage or A5 heat wiring (those are combat concerns)

## Ordering in Phase 6

Vehicle is the first of five unit types. Ordering: **vehicle → aerospace → battlearmor → infantry → protomech**. Vehicles ship first because they are the most common secondary unit in campaign forces.

## Impact

- **Affected specs**: `vehicle-unit-system` (ADDED requirements for motive/turret/crew/armor/validation), `construction-rules-core` (MODIFIED to route vehicle paths), `validation-rules-master` (MODIFIED to register `VAL-VEHICLE-*` rule IDs)
- **Affected code**: `src/stores/vehicle/`, `src/utils/construction/vehicle/`, `src/components/customizer/vehicle/*`, `src/types/vehicle/`, `src/services/vehicleConstructionService.ts`
- **New files**: vehicle chassis/turret/crew calculators, motive-type config table, BAR armor table for support vehicles
- **No schema change**: existing vehicle records already carry the data; logic gap is the target
