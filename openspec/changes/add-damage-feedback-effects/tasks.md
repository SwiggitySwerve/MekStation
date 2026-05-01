# Tasks: Add Damage Feedback Effects

## 1. Screen Shake Hook

- [x] 1.1 Create `src/hooks/useScreenShake.ts`
- [x] 1.2 Exposes `shake(intensity, duration)` which offsets the map
      root by pseudo-random x/y within the intensity radius
- [x] 1.3 Subscribes to `DamageApplied` events, fires shake when hit
      damage >= 10
- [x] 1.4 Intensity scales linearly with damage, clamped at 8px
- [x] 1.5 Duration fixed at 300ms
- [x] 1.6 Reduced motion halves amplitude and skips if intensity < 2px

## 2. Hit Location Flash

- [x] 2.1 Create `src/components/gameplay/effects/HitLocationFlash.tsx`
- [x] 2.2 On `DamageApplied`, flash the specific pip group white at
      60% opacity for 250ms
- [x] 2.3 Works for both attached location (RA, LT, etc.) and
      transferred locations
- [x] 2.4 Stacks with armor-pip decay already defined in
      `add-damage-feedback-ui`

## 3. Smoke Puff

- [x] 3.1 Create `src/components/gameplay/effects/SmokePuff.tsx`
- [x] 3.2 Renders a looping animated smoke sprite near the location's
      pip group
- [x] 3.3 Activates when a location is destroyed (structure = 0 or
      location marked destroyed)
- [x] 3.4 Persists until the unit dies or is removed
- [x] 3.5 Supports multiple concurrent smoke streams per unit (one per
      destroyed location)

## 4. Engine Fire

- [x] 4.1 Create `src/components/gameplay/effects/EngineFire.tsx`
- [x] 4.2 Triggered on engine critical hit events
- [x] 4.3 Renders a small animated flame at the unit's torso anchor
- [x] 4.4 Persists until the unit dies
- [x] 4.5 Second engine crit intensifies the flame (larger, brighter)

## 5. Debris Cloud + Wreck Sprite

- [x] 5.1 Create `src/components/gameplay/effects/DebrisCloud.tsx`
- [x] 5.2 Triggered on `UnitDestroyed` event
- [x] 5.3 Plays 800ms debris burst centered on the token
- [x] 5.4 Token transitions to a wreck sprite variant (homemade, per
      archetype) with ~50% opacity
- [x] 5.5 Wreck remains on the hex blocking LOS per existing rules
- [x] 5.6 Persistent smoke / fire from this unit clear when it becomes
      a wreck (replaced by a single quieter smoke stream)

## 6. Event Subscriptions

- [x] 6.1 `HitLocationFlash` subscribes to `DamageApplied`
- [x] 6.2 `SmokePuff` subscribes to `LocationDestroyed`
- [x] 6.3 `EngineFire` subscribes to `CriticalHit` events where slot =
      ENGINE
- [x] 6.4 `DebrisCloud` subscribes to `UnitDestroyed`
- [x] 6.5 Screen shake subscribes to `DamageApplied`
- [x] 6.6 All subscriptions tear down on unmount

## 7. Persistent Effect Layer

- [x] 7.1 Create `PersistentEffectsLayer.tsx` rendering smoke and fire
      across every live unit with destroyed parts / engine damage
- [x] 7.2 Layer reads derived state (not events) so persistent effects
      survive page reload / replay
- [x] 7.3 Layer sits between sprite-ring and selection ring

## 8. Reduced Motion

- [x] 8.1 Screen shake halves amplitude and skips tiny shakes
- [x] 8.2 Smoke and fire reduce to a static icon (no animation)
- [x] 8.3 Debris cloud collapses to a single frame puff
- [x] 8.4 Hit location flash becomes an instant color change for 80ms

## 9. Accessibility

- [x] 9.1 Screen shake announces via `aria-live` "heavy hit" when
      triggered
- [x] 9.2 Persistent smoke / fire include `<title>` SVG elements for
      screen readers
- [x] 9.3 Destroyed units render a textual "WRECK" badge on the token
      for colorblind-safe legibility

## 10. Performance

- [x] 10.1 Smoke and fire use a single shared SVG animation definition
      referenced via `<use>`
- [x] 10.2 Screen shake uses CSS transform only on the map root
      (doesn't invalidate children)
- [x] 10.3 Wreck sprite replaces live sprite — no double render
- [ ] 10.4 Budget: 20 concurrent persistent effects at 60 FPS

## 11. Tests

- [x] 11.1 Unit test: screen shake intensity scales with damage
- [x] 11.2 Unit test: hit location flash targets correct pip group
- [x] 11.3 Unit test: smoke activates on LocationDestroyed
- [x] 11.4 Unit test: engine fire activates on engine crit
- [x] 11.5 Unit test: debris cloud + wreck transition on UnitDestroyed
- [x] 11.6 Integration test: unit takes 25-damage CT hit — shake
      triggers, pip flashes, no destruction events fire
- [x] 11.7 Integration test: unit destroyed — cloud plays, wreck sprite
      appears, prior smoke streams collapse

## 12. Spec Compliance

- [x] 12.1 Every requirement in `tactical-map-interface` delta has a
      GIVEN/WHEN/THEN scenario
- [x] 12.2 Every requirement in `damage-system` delta has a scenario
- [x] 12.3 `openspec validate add-damage-feedback-effects --strict`
      passes clean
