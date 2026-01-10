# PWA Customizer Implementation Tasks

Phased implementation plan for PWA usability improvements.

---

## Phase 1: PWA Shell Enhancement (Option D)
**Effort: 2-3 days | Risk: Low**

### Task List

#### 1.1 Safe Area Handling
- [ ] Add CSS custom properties for safe area insets in `globals.css`
- [ ] Update `CustomizerWithRouter.tsx` to use safe area padding
- [ ] Update `MultiUnitTabs.tsx` TabBar with safe area top padding
- [ ] Update `GlobalLoadoutTray.tsx` with safe area bottom padding
- [ ] Test on iOS PWA simulator / Safari

#### 1.2 Viewport & Meta Optimization
- [ ] Verify viewport meta in `_document.tsx` or `layout.tsx`
- [ ] Add `viewport-fit=cover` for edge-to-edge display
- [ ] Add `user-scalable=no` to prevent accidental zoom on inputs

#### 1.3 Touch Behavior CSS
- [ ] Add `overscroll-behavior-y: contain` to scrollable containers
- [ ] Add `touch-action: manipulation` to prevent double-tap zoom
- [ ] Add `-webkit-tap-highlight-color: transparent` for cleaner taps
- [ ] Update `styles.ts` with touch utility classes

#### 1.4 Input Mode Hints
- [ ] Add `inputMode="decimal"` to tonnage/armor number inputs in `ArmorTab.tsx`
- [ ] Add `inputMode="numeric"` to slot count inputs
- [ ] Add `inputMode="text"` with `autocomplete` hints to name fields
- [ ] Update `StructureTab.tsx` number inputs

#### 1.5 Touch Target Baseline
- [ ] Add `min-h-touch` and `min-w-touch` (44px) to `tailwind.config.ts`
- [ ] Update button styles in `styles.ts` with touch-safe variants
- [ ] Apply to stepper buttons in `ArmorTab.tsx`
- [ ] Apply to tab buttons in `CustomizerTabs.tsx`

#### 1.6 Haptic Feedback Hook
- [ ] Create `hooks/useHaptics.ts` with vibrate utility
- [ ] Add haptic feedback to primary action buttons
- [ ] Add haptic feedback to tab switches
- [ ] Add haptic feedback to equipment add/remove

---

## Phase 2: Responsive Breakpoints (Option B)
**Effort: 3-5 days | Risk: Low**

### Task List

#### 2.1 GlobalLoadoutTray Responsive Width
- [ ] Replace fixed `width: 260px` with responsive classes
- [ ] Add `w-full sm:w-[200px] md:w-[240px] lg:w-[260px]`
- [ ] Make collapsed state responsive: `w-10` consistent
- [ ] Update transition animations for width changes

#### 2.2 UnitInfoBanner Responsive Layout
- [ ] Replace `min-w-[380px]` with responsive stacking
- [ ] Stack sections vertically on mobile (`flex-col sm:flex-row`)
- [ ] Make identity section full-width on mobile
- [ ] Condense stats display on smaller screens
- [ ] Hide less critical stats on mobile (BV, Engine can collapse)

#### 2.3 CustomizerTabs Responsive
- [ ] Add icons to all tabs (currently optional)
- [ ] Show icons only on mobile: `<span className="hidden sm:inline">`
- [ ] Reduce padding on mobile: `px-2 sm:px-4`
- [ ] Consider horizontal scroll with snap on mobile

#### 2.4 TabBar (MultiUnitTabs) Responsive
- [ ] Reduce tab width on mobile
- [ ] Show truncated names or icons
- [ ] Ensure close button is touch-friendly
- [ ] Make "New Unit" / "Load" buttons icon-only on mobile

#### 2.5 Two-Column Layouts
- [ ] Audit all `grid-cols-2` usage
- [ ] Ensure `grid-cols-1 md:grid-cols-2` pattern is used
- [ ] Update `ArmorTab.tsx` two-column layout
- [ ] Update `StructureTab.tsx` if applicable
- [ ] Update `EquipmentTab.tsx` if applicable

#### 2.6 Modal/Dialog Responsive
- [ ] Add `max-h-[90vh]` to modal content
- [ ] Add `overflow-y-auto` to scrollable modal bodies
- [ ] Ensure modals work with virtual keyboard
- [ ] Test `NewTabModal.tsx` on mobile
- [ ] Test `SaveUnitDialog.tsx` on mobile

#### 2.7 Equipment Browser Responsive
- [ ] Update `EquipmentBrowser.tsx` for mobile layout
- [ ] Stack filters vertically on mobile
- [ ] Ensure equipment rows are touch-friendly
- [ ] Update `EquipmentRow.tsx` touch targets

---

## Phase 3: Hybrid Adaptive (Option C)
**Effort: 1-2 weeks | Risk: Medium**

### Task List

#### 3.1 Device Detection Infrastructure
- [ ] Create `hooks/useDeviceType.ts`
- [ ] Detect touch capability
- [ ] Detect screen size breakpoints
- [ ] Add resize listener with debounce
- [ ] Export `isMobile`, `isTablet`, `isTouch` flags

#### 3.2 Conditional DnD Backend
- [ ] Install `react-dnd-touch-backend` package
- [ ] Create `components/providers/DndProviderAdaptive.tsx`
- [ ] Use `TouchBackend` when touch detected
- [ ] Add `enableMouseEvents: true` for hybrid devices
- [ ] Update `CustomizerWithRouter.tsx` to use adaptive provider

#### 3.3 Bottom Sheet Tray Component
- [ ] Create `components/customizer/equipment/BottomSheetTray.tsx`
- [ ] Implement drag-to-expand gesture
- [ ] Add peek state (collapsed showing count)
- [ ] Add half-expanded state (equipment list)
- [ ] Add full-expanded state (with filters)
- [ ] Handle keyboard avoidance

#### 3.4 Adaptive Tray Switching
- [ ] Update `UnitEditorWithRouting.tsx` to conditionally render
- [ ] Render `BottomSheetTray` on mobile
- [ ] Render `GlobalLoadoutTray` on desktop
- [ ] Sync selection state between variants
- [ ] Test equipment assignment workflow on both

#### 3.5 Action Sheet Component
- [ ] Create `components/shared/ActionSheet.tsx`
- [ ] Implement slide-up animation
- [ ] Support action items with icons
- [ ] Support danger variant for destructive actions
- [ ] Add backdrop dismiss

#### 3.6 Long-Press Context Actions
- [ ] Create `hooks/useLongPress.ts`
- [ ] Integrate with `EquipmentItem` component
- [ ] Show `ActionSheet` on long-press (mobile)
- [ ] Keep context menu on right-click (desktop)
- [ ] Add actions: Assign, Unassign, Remove

#### 3.7 Compact Stats Banner
- [ ] Create `UnitInfoBannerCompact.tsx` for mobile
- [ ] Show only critical stats: Weight, Armor, Heat
- [ ] Add expandable detail drawer
- [ ] Update `UnitEditorWithRouting.tsx` to switch variants

---

## Phase 4: Touch-First Polish (Option A elements)
**Effort: As needed | Risk: Medium**

### Task List

#### 4.1 Enhanced Touch Targets
- [ ] Audit all interactive elements for 44px minimum
- [ ] Update icon buttons with larger tap areas
- [ ] Add visible focus states for touch
- [ ] Ensure adequate spacing between targets

#### 4.2 Gesture Enhancements
- [ ] Add swipe-to-close on tabs
- [ ] Add swipe-to-delete on equipment items
- [ ] Add pull-to-refresh on unit list (if applicable)
- [ ] Consider pinch-to-zoom on armor diagram

#### 4.3 Loading & Feedback States
- [ ] Add skeleton loaders for async content
- [ ] Improve loading spinners visibility
- [ ] Add success/error toast notifications
- [ ] Enhance haptic feedback patterns

#### 4.4 Keyboard Handling
- [ ] Handle virtual keyboard appearance
- [ ] Scroll inputs into view when focused
- [ ] Add "Done" button for number inputs
- [ ] Test form completion flow

#### 4.5 Offline Enhancements
- [ ] Add offline indicator in header
- [ ] Queue actions when offline
- [ ] Sync on reconnection
- [ ] Show pending changes status

---

## Parallelization Strategy

Each phase can be worked on in a separate worktree:

```bash
# Create worktrees for each phase
git worktree add ../pwa-phase1-shell -b feature/pwa-shell-enhancement
git worktree add ../pwa-phase2-responsive -b feature/pwa-responsive-breakpoints
git worktree add ../pwa-phase3-adaptive -b feature/pwa-hybrid-adaptive
git worktree add ../pwa-phase4-touch -b feature/pwa-touch-polish
```

### Merge Order
1. Phase 1 (Shell) - Foundation, no conflicts expected
2. Phase 2 (Responsive) - Layout changes, merge after Phase 1
3. Phase 3 (Adaptive) - New components, can parallel with Phase 2
4. Phase 4 (Polish) - Final refinements, merge last

### Dependencies
- Phase 2 depends on Phase 1 (touch utilities)
- Phase 3 depends on Phase 1 (device detection patterns)
- Phase 4 depends on Phases 1-3

---

## Files to Modify by Phase

### Phase 1
- `src/styles/globals.css`
- `src/pages/_document.tsx` or `src/app/layout.tsx`
- `tailwind.config.ts`
- `src/components/customizer/styles.ts`
- `src/components/customizer/CustomizerWithRouter.tsx`
- `src/components/customizer/tabs/ArmorTab.tsx`
- `src/components/customizer/tabs/StructureTab.tsx`
- `src/hooks/useHaptics.ts` (new)

### Phase 2
- `src/components/customizer/equipment/GlobalLoadoutTray.tsx`
- `src/components/customizer/shared/UnitInfoBanner.tsx`
- `src/components/customizer/tabs/CustomizerTabs.tsx`
- `src/components/customizer/tabs/TabBar.tsx`
- `src/components/customizer/tabs/ArmorTab.tsx`
- `src/components/customizer/equipment/EquipmentBrowser.tsx`
- `src/components/customizer/dialogs/*.tsx`

### Phase 3
- `src/hooks/useDeviceType.ts` (new)
- `src/hooks/useLongPress.ts` (new)
- `src/components/providers/DndProviderAdaptive.tsx` (new)
- `src/components/customizer/equipment/BottomSheetTray.tsx` (new)
- `src/components/shared/ActionSheet.tsx` (new)
- `src/components/customizer/shared/UnitInfoBannerCompact.tsx` (new)
- `src/components/customizer/UnitEditorWithRouting.tsx`
- `src/components/customizer/CustomizerWithRouter.tsx`

### Phase 4
- Various touch refinements across all components
- `src/components/shared/Toast.tsx` (new)
- `src/hooks/useOfflineStatus.ts` (new)
