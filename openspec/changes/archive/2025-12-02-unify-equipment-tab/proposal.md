# Change: Unify Equipment Tab with Global Loadout Tray

## Why

The current implementation has separate Weapons (placeholder) and Equipment tabs, which fragments the equipment management workflow. MekLab uses a unified approach with a persistent loadout panel accessible from any tab. Users need an efficient interface to browse, filter, and add equipment while maintaining visibility of their current loadout across all customizer tabs.

## What Changes

- **BREAKING**: Remove separate "Weapons" tab from tab bar
- Merge all equipment browsing into unified "Equipment" tab
- Implement **global loadout tray** on right edge, available across ALL tabs
- Tray header with Remove/Remove All buttons at top (no scrolling required)
- Categorized equipment display in tray (Energy Weapons, Ballistic, Ammo, etc.)
- Replace dropdown category filters with toggle buttons
- Add "Hide" filter toggles (Prototype, One-Shot, Unavailable)
- Add global status bar at bottom showing weight/slots/heat
- Handle structural slot components (Endo Steel, Ferro-Fibrous) separately

## Impact

- Affected specs:
  - `customizer-tabs` - Remove weapons tab, update Equipment tab description
  - `equipment-browser` - Add toggle button filters, column configuration
  - `equipment-tray` - Convert to global right-edge tray with categories
- Affected code:
  - `src/components/customizer/tabs/CustomizerTabs.tsx` - Remove weapons tab
  - `src/components/customizer/tabs/EquipmentTab.tsx` - Full-width browser only
  - `src/components/customizer/equipment/EquipmentBrowser.tsx` - Add toggle filters
  - `src/components/customizer/equipment/EquipmentFilters.tsx` - Toggle button UI
  - `src/components/customizer/equipment/EquipmentTray.tsx` - Global tray with categories
  - `src/components/customizer/CustomizerContent.tsx` - Add global tray and status bar

## Reference

- MekLab equipment tab screenshot provided by user
- Current specs: equipment-browser, equipment-tray, customizer-tabs
