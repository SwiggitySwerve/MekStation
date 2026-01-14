# Implementation Tasks

## 1. Tab Navigation Responsiveness

- [x] 1.1 Update `CustomizerTabs.tsx` to show icons-only below `sm` breakpoint
- [x] 1.2 Add scroll indicators (fade gradients) when tabs overflow
- [x] 1.3 Ensure tabs don't compress or wrap - use `flex-shrink-0`
- [x] 1.4 Add touch-friendly tap targets (min 44px height on mobile)

## 2. Loadout Sidebar Improvements

- [x] 2.1 Add responsive width classes to `GlobalLoadoutTray` (`w-[180px] lg:w-[240px]`)
- [x] 2.2 Add auto-collapse behavior on medium viewports (ResponsiveLoadoutTray switches to bottom sheet on mobile)
- [x] 2.3 Add "hide sidebar" floating button for temporary dismissal (collapse button in header)
- [x] 2.4 Improve collapsed state with visual equipment count badge

## 3. Content Layout Responsiveness

- [x] 3.1 Update `UnitEditorWithRouting.tsx` main container with `min-w-0` overflow handling
- [x] 3.2 Update styles - content area uses flex layout with proper overflow constraints
- [x] 3.3 Add `overflow-hidden` to content panel wrappers (via `overflow-auto` on scroll areas)
- [x] 3.4 Add responsive padding using Tailwind responsive classes (`px-2 sm:px-3`, etc.)

## 4. UnitInfoBanner Optimization

- [x] 4.1 Use clear, readable labels (Tonnage, Walk, Run, Jump, BV, Engine, Weight, Armor, Slots, Heat)
- [x] 4.2 Add `xs` breakpoint handling for very small screens (flex-wrap on stat boxes)
- [x] 4.3 Reduce font sizes at mobile breakpoints (`text-[9px] sm:text-[10px]`, `text-sm sm:text-base`)
- [x] 4.4 Make validation badge compact on mobile (included in banner with responsive sizing)

## 5. Testing & Validation

- [x] 5.1 Test on 320px (iPhone SE), 375px (iPhone), 768px (iPad), 1024px (iPad Pro)
- [x] 5.2 Test touch interactions - swipe, tap targets, drag handles
- [x] 5.3 Verify no horizontal scroll on page level
- [x] 5.4 Test loadout bottom sheet gesture responsiveness
