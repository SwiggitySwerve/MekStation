# Change: Aerospace Customizer UI

## Why
The multi-unit-type-support foundation is complete with BLK parsing and handlers for all unit types. Users need a customizer UI to view, edit, and build aerospace fighters and conventional fighters.

## What Changes
- Add aerospace state management (AerospaceState interface, store)
- Create aerospace customizer tabs (Structure, Armor, Equipment)
- Create aerospace diagram component with weapon arc visualization
- Create aerospace status bar
- Add aerospace validation rules

## Impact
- Affected specs: customizer UI, unit construction
- Affected code: `src/components/customizer/`, `src/stores/`, `src/types/`
- Dependencies: Requires `add-multi-unit-type-support` foundation (archived 2026-01-18)
