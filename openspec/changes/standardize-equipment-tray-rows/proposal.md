# Change: Standardize Equipment Tray Row Formatting

## Why
The GlobalLoadoutTray component has inconsistent styling across row types - varying padding (`px-2`, `px-3`), text sizes (`text-xs`, `text-sm`, `text-[10px]`, `text-[9px]`), and gaps (`gap-1`, `gap-1.5`, `gap-2`). This creates visual inconsistency and makes maintenance difficult. Additionally, the legacy `EquipmentTray.tsx` component is unused and should be removed.

## What Changes
- Remove unused `EquipmentTray.tsx` legacy component
- Standardize all row types in `GlobalLoadoutTray` to consistent h-7 height
- Apply uniform padding, text sizes, and gaps via centralized `trayStyles` object
- Update equipment stats display format from `2t 3c RT` to `2t | 3 slots | RT` (pipe-separated)
- Clean up exports from equipment component index

## Impact
- Affected specs: `equipment-tray`
- Affected code:
  - `src/components/customizer/equipment/EquipmentTray.tsx` (DELETE)
  - `src/components/customizer/equipment/GlobalLoadoutTray.tsx` (MODIFY)
  - `src/components/customizer/equipment/index.ts` (MODIFY)

