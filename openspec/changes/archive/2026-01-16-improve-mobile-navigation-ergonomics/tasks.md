# Tasks: Improve Mobile Navigation Ergonomics

## 1. Mobile Sidebar State Management

- [x] 1.1 Add `useMobileSidebarStore` to navigationStore with open/close/toggle actions
- [x] 1.2 Integrate store with `_app.tsx` for route change handling
- [x] 1.3 Close mobile sidebar automatically on route navigation

## 2. Sidebar Mobile Expansion Behavior

- [x] 2.1 Add `effectiveCollapsed` logic that forces expanded state when mobile sidebar is open
- [x] 2.2 Hide collapse toggle button on mobile (`hidden lg:block`)
- [x] 2.3 Close sidebar when any NavItem is clicked via `handleNavClick`

## 3. Mobile Header in Layout

- [x] 3.1 Add mobile header component to `Layout.tsx` with hamburger icon
- [x] 3.2 Position page title on left, menu button on right for ergonomics
- [x] 3.3 Add `hideMobileHeader` prop to Layout for pages with custom navigation
- [x] 3.4 Set `hideMobileHeader={true}` for customizer routes in `_app.tsx`

## 4. Customizer Bottom Tray Menu Button

- [x] 4.1 Add `onMenuOpen` prop to `MobileLoadoutHeader`
- [x] 4.2 Move menu button to right side of bottom tray (after stats and expand indicator)
- [x] 4.3 Pass `onMenuOpen` through `BottomSheetTray` and `ResponsiveLoadoutTray`
- [x] 4.4 Connect to `useMobileSidebarStore.open` in `UnitEditorWithRouting`

## 5. Settings Page Mobile Fixes

- [x] 5.1 Make ArmorDiagramSettings responsive (`flex-col md:flex-row`)
- [x] 5.2 Fix variant list width for mobile (`w-full md:w-48`)
- [x] 5.3 Fix hydration error by deferring localStorage state until after mount

## 6. PWA Icon Fixes

- [x] 6.1 Install `sharp` package for image processing
- [x] 6.2 Generate icon-192x192.png from icon.svg
- [x] 6.3 Generate icon-512x512.png from icon.svg

## 7. Testing and Verification

- [x] 7.1 Verify build passes with no TypeScript errors
- [x] 7.2 Update Sidebar tests to mock the navigation store
- [x] 7.3 Verify Layout tests pass with new mobile header logic
- [x] 7.4 Manual verification of mobile header on non-customizer pages
- [x] 7.5 Manual verification of bottom tray menu on customizer page
- [x] 7.6 Verify PWA icons load without 404 errors
