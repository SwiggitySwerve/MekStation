# Change: Personnel Unit Customizer UI

## Why
The multi-unit-type-support foundation is complete with BLK parsing and handlers for all unit types. Users need customizer UIs to view, edit, and build personnel units: Battle Armor, Infantry, and ProtoMechs.

## What Changes
- Add Battle Armor customizer (chassis, squad, manipulators)
- Add Infantry customizer (platoon config, weapons, armor kits)
- Add ProtoMech customizer (adapted mech-style interface)
- Create unit-specific diagrams and status bars
- Add validation rules for personnel units

## Impact
- Affected specs: customizer UI, unit construction
- Affected code: `src/components/customizer/`, `src/stores/`, `src/types/`
- Dependencies: Requires `add-multi-unit-type-support` foundation (archived 2026-01-18)
