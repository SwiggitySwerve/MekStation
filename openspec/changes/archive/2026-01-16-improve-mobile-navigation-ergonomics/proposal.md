# Change: Improve Mobile Navigation Ergonomics

## Why

Mobile users need consistent, easily accessible navigation across all pages. The sidebar navigation was previously only accessible from the customizer's bottom tray, leaving other pages (Settings, Units, Compendium, etc.) without mobile navigation access. Additionally, the menu button position was on the left side, which is harder to reach for right-handed phone users (the majority of users).

## What Changes

- **Mobile Header**: Add a consistent mobile header bar to all pages (except customizer) with the page title and hamburger menu button
- **Right-Hand Ergonomics**: Move all mobile menu buttons to the right side for easier right-hand thumb access
- **Expanded Sidebar on Mobile**: Sidebar always opens fully expanded on mobile (with labels visible), ignoring the desktop collapsed preference
- **Navigation Close Behavior**: Sidebar closes automatically when any navigation item is selected on mobile
- **Customizer Exception**: Customizer page uses its own bottom tray navigation instead of the global mobile header
- **Settings Page Responsive Layout**: ArmorDiagramSettings now stacks vertically on mobile (variant list above, preview below)
- **Hydration Fix**: Fixed SSR hydration mismatch in ArmorDiagramSettings by deferring localStorage-dependent state until after mount
- **PWA Icons**: Generated PNG icons (192x192, 512x512) from SVG to fix manifest 404 errors

## Impact

- **Affected specs**:
  - `app-navigation` (NEW) - Global navigation sidebar and mobile header
  - `mobile-loadout-tray` - Menu button integration in bottom tray
- **Affected code**:
  - `src/components/common/Layout.tsx` - Mobile header with hamburger menu
  - `src/components/common/Sidebar.tsx` - Mobile expansion and close behavior
  - `src/components/customizer/mobile/MobileLoadoutHeader.tsx` - Menu button position
  - `src/components/customizer/armor/ArmorDiagramSettings.tsx` - Responsive layout and hydration fix
  - `src/stores/navigationStore.ts` - Mobile sidebar state management
  - `src/pages/_app.tsx` - Route-based mobile header visibility
  - `public/icons/` - Generated PNG icons for PWA manifest
