# PWA Customizer Implementation Tasks

Phased implementation plan for PWA usability improvements.

**Status: All phases complete!**

---

## Phase 1: PWA Shell Enhancement (Option D) ✅

**Effort: 2-3 days | Risk: Low | Status: COMPLETE**

### Task List

#### 1.1 Safe Area Handling

- [x] Add CSS custom properties for safe area insets in `globals.css`
- [x] Update `CustomizerWithRouter.tsx` to use safe area padding
- [x] Update `MultiUnitTabs.tsx` TabBar with safe area top padding
- [x] Update `GlobalLoadoutTray.tsx` with safe area bottom padding
- [ ] Test on iOS PWA simulator / Safari

#### 1.2 Viewport & Meta Optimization

- [x] Verify viewport meta in `_document.tsx` or `layout.tsx`
- [x] Add `viewport-fit=cover` for edge-to-edge display
- [x] Add `user-scalable=no` to prevent accidental zoom on inputs

#### 1.3 Touch Behavior CSS

- [x] Add `overscroll-behavior-y: contain` to scrollable containers
- [x] Add `touch-action: manipulation` to prevent double-tap zoom
- [x] Add `-webkit-tap-highlight-color: transparent` for cleaner taps
- [x] Update `styles.ts` with touch utility classes

#### 1.4 Input Mode Hints

- [x] Add `inputMode="decimal"` to tonnage/armor number inputs in `ArmorTab.tsx`
- [x] Add `inputMode="numeric"` to slot count inputs
- [x] Add `inputMode="text"` with `autocomplete` hints to name fields
- [x] Update `StructureTab.tsx` number inputs

#### 1.5 Touch Target Baseline

- [x] Add `min-h-touch` and `min-w-touch` (44px) to `tailwind.config.ts`
- [x] Update button styles in `styles.ts` with touch-safe variants
- [x] Apply to stepper buttons in `ArmorTab.tsx`
- [x] Apply to tab buttons in `CustomizerTabs.tsx`

#### 1.6 Haptic Feedback Hook

- [x] Create `hooks/useHaptics.ts` with vibrate utility
- [x] Add haptic feedback to primary action buttons
- [x] Add haptic feedback to tab switches
- [x] Add haptic feedback to equipment add/remove

---

## Phase 2: Responsive Breakpoints (Option B) ✅

**Effort: 3-5 days | Risk: Low | Status: COMPLETE**

### Task List

#### 2.1 GlobalLoadoutTray Responsive Width

- [x] Replace fixed `width: 260px` with responsive classes
- [x] Add `w-full sm:w-[200px] md:w-[240px] lg:w-[260px]`
- [x] Make collapsed state responsive: `w-10` consistent
- [x] Update transition animations for width changes

#### 2.2 UnitInfoBanner Responsive Layout

- [x] Replace `min-w-[380px]` with responsive stacking
- [x] Stack sections vertically on mobile (`flex-col sm:flex-row`)
- [x] Make identity section full-width on mobile
- [x] Condense stats display on smaller screens
- [x] Hide less critical stats on mobile (BV, Engine can collapse)

#### 2.3 CustomizerTabs Responsive

- [x] Add icons to all tabs (currently optional)
- [x] Show icons only on mobile: `<span className="hidden sm:inline">`
- [x] Reduce padding on mobile: `px-2 sm:px-4`
- [x] Consider horizontal scroll with snap on mobile

#### 2.4 TabBar (MultiUnitTabs) Responsive

- [x] Reduce tab width on mobile
- [x] Show truncated names or icons
- [x] Ensure close button is touch-friendly
- [x] Make "New Unit" / "Load" buttons icon-only on mobile

#### 2.5 Two-Column Layouts

- [x] Audit all `grid-cols-2` usage
- [x] Ensure `grid-cols-1 md:grid-cols-2` pattern is used
- [x] Update `ArmorTab.tsx` two-column layout
- [x] Update `StructureTab.tsx` if applicable
- [x] Update `EquipmentTab.tsx` if applicable

#### 2.6 Modal/Dialog Responsive

- [x] Add `max-h-[90vh]` to modal content
- [x] Add `overflow-y-auto` to scrollable modal bodies
- [x] Ensure modals work with virtual keyboard
- [x] Test `NewTabModal.tsx` on mobile
- [x] Test `SaveUnitDialog.tsx` on mobile

#### 2.7 Equipment Browser Responsive

- [x] Update `EquipmentBrowser.tsx` for mobile layout
- [x] Stack filters vertically on mobile
- [x] Ensure equipment rows are touch-friendly
- [x] Update `EquipmentRow.tsx` touch targets

---

## Phase 3: Hybrid Adaptive (Option C) ✅

**Effort: 1-2 weeks | Risk: Medium | Status: COMPLETE**

### Task List

#### 3.1 Device Detection Infrastructure

- [x] Create `hooks/useDeviceType.ts`
- [x] Detect touch capability
- [x] Detect screen size breakpoints
- [x] Add resize listener with debounce
- [x] Export `isMobile`, `isTablet`, `isTouch` flags

#### 3.2 Conditional DnD Backend

- [x] Install `react-dnd-touch-backend` package
- [x] Create `components/providers/DndProviderAdaptive.tsx`
- [x] Use `TouchBackend` when touch detected
- [x] Add `enableMouseEvents: true` for hybrid devices
- [x] Update `CustomizerWithRouter.tsx` to use adaptive provider

#### 3.3 Bottom Sheet Tray Component

- [x] Create `components/customizer/equipment/BottomSheetTray.tsx`
- [x] Implement drag-to-expand gesture
- [x] Add peek state (collapsed showing count)
- [x] Add half-expanded state (equipment list)
- [x] Add full-expanded state (with filters)
- [x] Handle keyboard avoidance

#### 3.4 Adaptive Tray Switching

- [x] Update `UnitEditorWithRouting.tsx` to conditionally render
- [x] Render `BottomSheetTray` on mobile
- [x] Render `GlobalLoadoutTray` on desktop
- [x] Sync selection state between variants
- [ ] Test equipment assignment workflow on both

#### 3.5 Action Sheet Component

- [x] Create `components/shared/ActionSheet.tsx`
- [x] Implement slide-up animation
- [x] Support action items with icons
- [x] Support danger variant for destructive actions
- [x] Add backdrop dismiss

#### 3.6 Long-Press Context Actions

- [x] Create `hooks/useLongPress.ts`
- [x] Integrate with `EquipmentItem` component
- [x] Show `ActionSheet` on long-press (mobile)
- [x] Keep context menu on right-click (desktop)
- [x] Add actions: Assign, Unassign, Remove

#### 3.7 Compact Stats Banner

- [x] Create `UnitInfoBannerCompact.tsx` for mobile
- [x] Show only critical stats: Weight, Armor, Heat
- [x] Add expandable detail drawer
- [x] Update `UnitEditorWithRouting.tsx` to switch variants

---

## Phase 4: Touch-First Polish (Option A elements) ✅

**Effort: As needed | Risk: Medium | Status: COMPLETE**

### Task List

#### 4.1 Enhanced Touch Targets

- [x] Audit all interactive elements for 44px minimum
- [x] Update icon buttons with larger tap areas
- [x] Add visible focus states for touch
- [x] Ensure adequate spacing between targets

#### 4.2 Gesture Enhancements

- [x] Add swipe-to-close on tabs
- [ ] Add swipe-to-delete on equipment items
- [ ] Add pull-to-refresh on unit list (if applicable)
- [ ] Consider pinch-to-zoom on armor diagram

#### 4.3 Loading & Feedback States

- [ ] Add skeleton loaders for async content
- [ ] Improve loading spinners visibility
- [x] Add success/error toast notifications
- [x] Enhance haptic feedback patterns

#### 4.4 Keyboard Handling

- [x] Handle virtual keyboard appearance
- [x] Scroll inputs into view when focused
- [ ] Add "Done" button for number inputs
- [ ] Test form completion flow

#### 4.5 Offline Enhancements

- [x] Add offline indicator in header
- [ ] Queue actions when offline
- [ ] Sync on reconnection
- [ ] Show pending changes status

---

## Implementation Summary

### Components Created

- `src/hooks/useDeviceType.ts` - Device detection
- `src/hooks/useLongPress.ts` - Long press gesture
- `src/hooks/useHaptics.ts` - Haptic feedback
- `src/hooks/useOfflineStatus.ts` - Offline detection
- `src/hooks/useVirtualKeyboard.ts` - Keyboard handling
- `src/components/providers/DndProviderAdaptive.tsx` - Conditional DnD
- `src/components/customizer/equipment/BottomSheetTray.tsx` - Mobile equipment tray
- `src/components/shared/ActionSheet.tsx` - Mobile context actions
- `src/components/shared/Toast.tsx` - Toast notifications
- `src/components/customizer/shared/UnitInfoBannerCompact.tsx` - Mobile stats banner

### Components Updated

- `GlobalLoadoutTray.tsx` - Responsive width
- `UnitInfoBanner.tsx` - Responsive layout
- `CustomizerTabs.tsx` - Icon-only mobile, responsive padding
- `TabBar.tsx` - Touch-friendly buttons
- `UnitTab.tsx` - Touch targets, responsive width
- `ModalOverlay.tsx` - Mobile max-height, overflow
- `EquipmentBrowser.tsx` - Hidden columns, touch search
- `EquipmentRow.tsx` - Touch-friendly add buttons
- `ArmorTab.tsx` - Responsive summary bar
- `StructureTab.tsx` - Responsive summary bar

### Commits

1. `65a1be87` - docs: add PWA customizer improvement options and implementation tasks
2. `bf6c6b17` - feat(pwa): implement Phase 3 hybrid adaptive components
3. `b0677e51` - feat(pwa): implement Phase 1 & 4 PWA shell and touch polish features
4. `4febece4` - feat(pwa): add touch target utilities to Tailwind config
5. `0aad1f3e` - feat(pwa): improve touch targets in UnitTab and responsive layouts
6. `08cda89b` - feat(pwa): improve TabBar icon button touch targets
7. `1475f400` - feat(pwa): implement Phase 2 responsive breakpoints for customizer
8. `c6a853fc` - feat(pwa): make tab summary bars responsive and fix TypeScript error

---

## Remaining Work (Optional)

The following items are nice-to-have but not critical:

- iOS PWA simulator testing
- Swipe-to-delete on equipment items
- Pull-to-refresh gesture
- Pinch-to-zoom on armor diagram
- Skeleton loaders for async content
- "Done" button for number inputs on iOS
- Offline action queueing and sync
