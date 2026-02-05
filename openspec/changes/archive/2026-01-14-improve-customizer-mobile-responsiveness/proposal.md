# Change: Improve Customizer Mobile Responsiveness

## Why

The customizer interface has several mobile usability issues:

1. Tab labels overflow and become invisible on smaller screens
2. Loadout sidebar takes too much horizontal space on tablet/medium viewports
3. Content panels overflow their boundaries at narrow widths
4. The UnitInfoBanner stats become cramped on mobile

These issues make the customizer difficult to use on mobile devices and tablets.

## What Changes

### 1. Adaptive Tab Navigation

- Show icon-only tabs when viewport is narrow (below `sm` breakpoint)
- Add horizontal scrolling with visible scroll indicators for overflowing tabs
- Use `flex-shrink-0` to prevent tab compression

### 2. Loadout Tray Improvements

- Reduce desktop sidebar width on medium screens (`md:w-[180px] lg:w-[240px]`)
- Add a collapsible toggle that auto-collapses on medium viewports
- Improve bottom sheet on mobile with better drag affordance
- Add "hide" button to temporarily dismiss sidebar when more space is needed

### 3. Tab Content Responsive Layout

- Add `overflow-hidden` and `min-w-0` to prevent content overflow
- Use CSS `clamp()` for responsive padding
- Stack two-column layouts on `lg` breakpoint instead of `md` when sidebar is visible
- Add responsive text truncation for long equipment names

### 4. UnitInfoBanner Optimization

- Use abbreviated stat labels on mobile (e.g., "W/R/J" instead of "Walk / Run / Jump")
- Stack stats vertically on very small screens
- Reduce font sizes responsively

## Impact

- Affected specs: `customizer-tabs`, `equipment-tray`
- Affected files:
  - `src/components/customizer/tabs/CustomizerTabs.tsx`
  - `src/components/customizer/equipment/GlobalLoadoutTray.tsx`
  - `src/components/customizer/equipment/ResponsiveLoadoutTray.tsx`
  - `src/components/customizer/equipment/BottomSheetTray.tsx`
  - `src/components/customizer/UnitEditorWithRouting.tsx`
  - `src/components/customizer/shared/UnitInfoBanner.tsx`
  - `src/components/customizer/styles.ts`
- New spec: `customizer-responsive-layout` (consolidates responsive requirements)
