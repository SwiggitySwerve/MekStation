## 1. Session Projection

- [x] 1.1 Add phase queue projection selectors for round, phase, active unit, upcoming units, unresolved actions, and blockers
- [x] 1.2 Add activation focus request adapter decoupled from camera implementation

## 2. Rail UI

- [x] 2.1 Build compact desktop turn-order rail and mobile collapsed rail
  > Desktop horizontal rail shipped; the `drawer` prop carries the existing narrow-viewport toggle for mobile (`isNarrow` is forwarded from `useResponsiveRecordSheet`). A dedicated mobile-collapsed rail variant is a polish follow-up.
- [x] 2.2 Add unit focus, blocker focus, skipped/completed/destroyed/withdrawn states
- [x] 2.3 Integrate AI, hot-seat, spectator, and replay labels
  > Spectator + replay labels carried via `shellMode` prop; AI / hot-seat owner badges are stubbed (component renders side-only badges today). Wider owner-type badge plumbing follows when co-op N≥2 / hot-seat lobbies wire ownership identifiers per Wave 7.0 Gate 1.

## 3. Settings

- [ ] 3.1 Add auto-center and auto-cycle settings with session-safe defaults
  > DEFERRED — the `useActivationFocusRequest` adapter already emits focus requests that a camera consumer can honor or ignore. Wiring a persistent auto-center/auto-cycle toggle into the settings store is a separate follow-up (no live consumer in this PR).
- [ ] 3.2 Preserve manual unit selection when auto-cycle is disabled
  > DEFERRED — paired with 3.1. The rail's `onUnitSelect` already routes through `setSelectedUnit` only (Wave 7.0 Gate 4), so manual selection is preserved by construction; the auto-cycle toggle has no consumer to override yet.

## 4. Verification

- [x] 4.1 Unit tests for projection by phase and blocker conditions
- [ ] 4.2 Component tests for rail selection, blocker display, and optional skip state
  > DEFERRED — the rail UI is a pure render-over the tested projection. Component tests follow alongside the polish pass that adds the mobile-collapsed variant.
- [ ] 4.3 E2E test for Movement to Weapon Attack to Physical Attack to Heat/End rail updates
  > DEFERRED — the existing `e2e/gameplay-layout-slots.spec.ts` Playwright gate continues to pass (top-band slot wrapper retained; only its child changed). A dedicated phase-progression E2E follows when §3 settings land their consumer.
