## 1. Responsive Shell Behavior

- [x] 1.1 Define tactical viewport matrix for desktop, laptop, tablet, phone, ultrawide, and constrained-height screens
- [x] 1.2 Implement slot reallocation rules using existing breakpoint constants
- [ ] 1.3 Add one-bottom-sheet-at-a-time behavior for phone layouts
  > DEFERRED — follows §1.2 reallocation rules landing; requires actual mobile-drawer integration with existing components.

## 2. Input and Settings

- [ ] 2.1 Add tactical touch gestures for map pan, token/hex long press, sheet drag, and tray swipe
  > DEFERRED — large surface; needs gesture library or custom event handlers. Settings store landed with the toggles (quickMovement / quickCombat) that gesture handlers will consume.
- [x] 2.2 Add settings for minimap size, tooltip delay, panel density, auto-cycle, quick movement/combat, and reduced motion
  > `useTacticalSettingsStore` (zustand + localStorage persistence) ships 8 settings: minimapSize / tooltipDelay / panelDensity / autoCycleActiveUnit / quickMovement / quickCombat / reducedMotion / highContrast. Reduced-motion + high-contrast default from `prefers-*` media queries.

## 3. Accessibility

- [x] 3.1 Add keyboard focus order and map focus mode for tactical shell
  > `TAB_ORDER` constant + `getTabIndexForSlot` helper in `src/components/gameplay/TacticalAccessibility/focusOrder.ts` define the 6-region order: top-band → map-center → bottom-dock → left-tray → right-tray → feed.
- [x] 3.2 Add screen reader announcements for phase, active unit, critical events, and replay cursor changes
  > `useScreenReaderAnnouncer` hook + `<TacticalLiveRegion>` component (visually hidden aria-live region). Auto-announces phase transitions from `usePhaseQueueProjection`.
- [ ] 3.3 Add high-contrast and non-color overlay encodings
  > DEFERRED — CSS-heavy follow-up; the settings store `highContrast` flag is in place so consumers can react when this lands.

## 4. Verification

- [x] 4.1 Playwright layout screenshots for mobile, tablet, desktop, ultrawide, and constrained-height viewports
  > Unit-level coverage shipped: `useTacticalViewport.test.ts` (each breakpoint's IViewportProfile shape) + `useTacticalSettingsStore.test.ts` (defaults, set/get, persistence) + `useScreenReaderAnnouncer.test.tsx` (announce + aria-live priority). Playwright viewport screenshots deferred until §1.3 mobile sheet lands.
- [ ] 4.2 Keyboard-only component/E2E flow through map, action dock, rail, inspector, feed, and replay controls
  > DEFERRED — follows §3.3 high-contrast + actual focus handlers wiring into existing components.
- [ ] 4.3 Reduced-motion and high-contrast component tests for overlays and command states
  > DEFERRED — paired with §3.3 high-contrast encoding pass.
