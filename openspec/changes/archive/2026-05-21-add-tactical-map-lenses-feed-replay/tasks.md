## 1. Lens Model

- [x] 1.1 Define tactical lens presets mapped to map layer ids and intensity defaults
  > Delivered in PR-G (Wave 7.3): `TacticalLensInterfaces.ts` (6 presets), `useTacticalLensState` hook, `TacticalLensControls` component wired into `left-tray` ShellSlot in GameplayLayout.
- [x] 1.2 Add lens state selectors for movement, attack, intel, terrain, objective, and survival views
  > `useTacticalLensState.applyLensLayers` drives `setLayerVisibility` via a `useEffect` in GameplayLayout, enabling preset layers and disabling all others when a lens is active.

## 2. Pins and Minimap

- [ ] 2.1 Add tactical pin model with coordinate, label, category, scope, and created turn/phase
  > **DEFERRED** — pins require a new data model + map rendering layer not needed for the lens foundation. Target: separate PR.
- [ ] 2.2 Render pins on map and minimap with layer visibility controls
  > **DEFERRED** — depends on 2.1 pin model.
- [ ] 2.3 Add GM/public/side/local pin projection behavior
  > **DEFERRED** — depends on 2.1 + multiplayer routing. Target: campaign/multiplayer wave.

## 3. Feed and Replay

- [x] 3.1 Add feed row map-focus handlers and event priority grouping
  > Delivered in PR-G: `getEventPriority` helper (4-tier: critical/high/normal/low) in `EventLogDisplay.helpers.ts`; `onRowFocus` prop added to `EventLogDisplay` and `EventRow` with keyboard accessibility (Enter/Space).
- [ ] 3.2 Add replay timeline controls synchronized with map, rail, inspectors, and feed
  > **DEFERRED** — replay timeline requires integration with the existing replay reducer; significant scope. Target: dedicated replay PR.
- [ ] 3.3 Persist or derive replay map terrain/elevation/objective source
  > **DEFERRED** — depends on 3.2 timeline controls and replay store integration.

## 4. Verification

- [x] 4.1 Unit tests for lens-to-layer mapping and feed priority
  > Delivered in PR-G: `useTacticalLensState.test.ts` (6 tests, 22 assertions), `EventLogDisplay.priority.test.tsx` (14 tests). All 27 tests pass; typecheck clean.
- [ ] 4.2 Component tests for pin visibility and feed row focus
  > **DEFERRED** — feed row focus component tests (click → onRowFocus callback) deferred to follow-up; pin visibility tests depend on 2.1 pin model.
- [ ] 4.3 Replay test proving non-clear terrain map restores without placeholder fallback
  > **DEFERRED** — depends on 3.2/3.3 replay integration.
