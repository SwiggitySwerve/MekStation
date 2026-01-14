# Implementation Tasks

## 1. Tab Navigation Responsiveness

- [ ] 1.1 Update `CustomizerTabs.tsx` to show icons-only below `sm` breakpoint
- [ ] 1.2 Add scroll indicators (fade gradients) when tabs overflow
- [ ] 1.3 Ensure tabs don't compress or wrap - use `flex-shrink-0`
- [ ] 1.4 Add touch-friendly tap targets (min 44px height on mobile)

## 2. Loadout Sidebar Improvements

- [ ] 2.1 Add responsive width classes to `GlobalLoadoutTray` (`md:w-[180px] lg:w-[240px]`)
- [ ] 2.2 Add auto-collapse behavior on medium viewports (collapsed by default below `lg`)
- [ ] 2.3 Add "hide sidebar" floating button for temporary dismissal
- [ ] 2.4 Improve collapsed state with visual equipment count badge

## 3. Content Layout Responsiveness

- [ ] 3.1 Update `UnitEditorWithRouting.tsx` main container with `min-w-0` overflow handling
- [ ] 3.2 Update `styles.ts` - change `twoColumn` breakpoint to `lg` when sidebar context applies
- [ ] 3.3 Add `overflow-hidden` to content panel wrappers
- [ ] 3.4 Add responsive padding using CSS custom properties

## 4. UnitInfoBanner Optimization

- [ ] 4.1 Use abbreviated labels on mobile (already partially done, enhance)
- [ ] 4.2 Add `xs` breakpoint handling for very small screens (stack all stats)
- [ ] 4.3 Reduce font sizes at mobile breakpoints
- [ ] 4.4 Make validation badge compact on mobile

## 5. Testing & Validation

- [ ] 5.1 Test on 320px (iPhone SE), 375px (iPhone), 768px (iPad), 1024px (iPad Pro)
- [ ] 5.2 Test touch interactions - swipe, tap targets, drag handles
- [ ] 5.3 Verify no horizontal scroll on page level
- [ ] 5.4 Test loadout bottom sheet gesture responsiveness
