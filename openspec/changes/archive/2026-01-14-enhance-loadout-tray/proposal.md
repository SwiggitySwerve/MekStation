# Change: Enhance Loadout Tray with Category Filtering

## Why
The desktop GlobalLoadoutTray lacks category filtering that the mobile MobileLoadoutList already has. Users with many equipment items need to quickly filter by category (Energy, Ballistic, Missile, etc.) to find specific items. Additionally, the right-click context menu text was wrapping on longer location names.

## What Changes
- Add category filter bar to GlobalLoadoutTray matching mobile functionality
- Fix context menu layout to prevent text wrapping on quick-assign options

## Impact
- Affected specs: equipment-tray
- Affected code: `src/components/customizer/equipment/GlobalLoadoutTray.tsx`
