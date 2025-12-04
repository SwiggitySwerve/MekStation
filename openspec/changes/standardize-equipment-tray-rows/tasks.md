# Tasks: Standardize Equipment Tray Row Formatting

## 1. Remove Legacy Code
- [ ] 1.1 Delete `src/components/customizer/equipment/EquipmentTray.tsx`
- [ ] 1.2 Update `src/components/customizer/equipment/index.ts` to remove `EquipmentTray` and `TrayEquipmentItem`/`WeightStats` exports

## 2. Standardize GlobalLoadoutTray Styles
- [ ] 2.1 Expand `trayStyles` const with standardized values for padding, text, gaps
- [ ] 2.2 Update `EquipmentItem` component to use pipe-separated stats format
- [ ] 2.3 Apply `trayStyles` consistently to `CategoryGroup` rows
- [ ] 2.4 Apply `trayStyles` consistently to `AllocationSection` headers
- [ ] 2.5 Remove any inline style variations that conflict with `trayStyles`

## 3. Verification
- [ ] 3.1 Run `npm run build` to verify no compilation errors
- [ ] 3.2 Visual verification that all row types have consistent height and alignment

