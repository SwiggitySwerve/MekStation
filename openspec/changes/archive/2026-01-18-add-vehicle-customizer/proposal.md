# Change: Vehicle Customizer UI

## Why

The multi-unit-type-support foundation is complete with BLK parsing and handlers for all unit types. Users need a customizer UI to view, edit, and build combat vehicles (tanks, VTOLs, support vehicles).

## What Changes

- Add vehicle state management (VehicleState interface, store)
- Create vehicle customizer tabs (Structure, Armor, Equipment, Turret)
- Create vehicle diagram component
- Create vehicle status bar
- Add vehicle validation rules

## Impact

- Affected specs: customizer UI, unit construction
- Affected code: `src/components/customizer/`, `src/stores/`, `src/types/`
- Dependencies: Requires `add-multi-unit-type-support` foundation (archived 2026-01-18)
