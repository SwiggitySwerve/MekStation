## 1. Session Projection

- [ ] 1.1 Add phase queue projection selectors for round, phase, active unit, upcoming units, unresolved actions, and blockers
- [ ] 1.2 Add activation focus request adapter decoupled from camera implementation

## 2. Rail UI

- [ ] 2.1 Build compact desktop turn-order rail and mobile collapsed rail
- [ ] 2.2 Add unit focus, blocker focus, skipped/completed/destroyed/withdrawn states
- [ ] 2.3 Integrate AI, hot-seat, spectator, and replay labels

## 3. Settings

- [ ] 3.1 Add auto-center and auto-cycle settings with session-safe defaults
- [ ] 3.2 Preserve manual unit selection when auto-cycle is disabled

## 4. Verification

- [ ] 4.1 Unit tests for projection by phase and blocker conditions
- [ ] 4.2 Component tests for rail selection, blocker display, and optional skip state
- [ ] 4.3 E2E test for Movement to Weapon Attack to Physical Attack to Heat/End rail updates
