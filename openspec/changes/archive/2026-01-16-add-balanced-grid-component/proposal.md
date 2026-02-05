# Change: Add BalancedGrid Component for Even Row Distribution

## Why

When UI elements wrap to multiple rows, the default CSS behavior creates uneven distributions (e.g., 7+1 or 6+4 instead of 4+4 or 5+5). This looks visually unbalanced and wastes horizontal space. A reusable component that calculates optimal column counts for balanced row distribution improves visual consistency across the application.

## What Changes

- Add new `BalancedGrid` component that automatically distributes items evenly across rows
- Add `useBalancedGrid` hook that calculates optimal column count based on container width
- Update `UnitInfoBanner` to use BalancedGrid for stats layout (10 items → 5+5)
- Update `CompactFilterBar` to use BalancedGrid for category buttons (8 items → 4+4)
- Fix child counting to use `Children.toArray()` instead of `Children.count()` to properly exclude conditional children (`{condition && <Child/>}`)
- Add `requestAnimationFrame` timing to ensure accurate container measurement after DOM paint

## Impact

- New capability: `balanced-grid`
- Modified specs: `unit-info-banner`, `equipment-browser`
- Affected code:
  - `src/components/common/BalancedGrid.tsx` (new)
  - `src/hooks/useBalancedGrid.ts` (new)
  - `src/components/customizer/shared/UnitInfoBanner.tsx` (modified)
  - `src/components/customizer/equipment/CompactFilterBar.tsx` (modified)
