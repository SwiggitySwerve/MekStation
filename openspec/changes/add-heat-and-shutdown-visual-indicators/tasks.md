# Tasks: Add Heat and Shutdown Visual Indicators

## 1. Heat Visual Map

- [ ] 1.1 Create `src/utils/effects/heatVisualMap.ts`
- [ ] 1.2 Thresholds: 0-4 neutral, 5-9 amber glow, 10-14 orange glow,
      15-19 red glow, 20+ red-white glow with subtle pulse
- [ ] 1.3 Map heat level to `{color, intensity, pulse}` tuple
- [ ] 1.4 Unit tests for every threshold boundary

## 2. HeatGlow Component

- [ ] 2.1 Create `src/components/gameplay/effects/HeatGlow.tsx`
- [ ] 2.2 Renders a radial glow around the sprite using SVG filter
- [ ] 2.3 Smoothly transitions between thresholds over 300ms
- [ ] 2.4 Pulse animation only above heat 20 (1.5s period, subtle)
- [ ] 2.5 Layer sits above sprite + armor pips, below selection ring

## 3. Shutdown Overlay

- [ ] 3.1 Create `src/components/gameplay/effects/ShutdownOverlay.tsx`
- [ ] 3.2 Desaturates the sprite via `<feColorMatrix>` filter
- [ ] 3.3 Adds a dim "POWERED DOWN" label beneath the token
- [ ] 3.4 Subtle flicker (~3s period) hints at failed restart attempts
- [ ] 3.5 Layer overrides HeatGlow while active (shutdown is definitive)

## 4. Startup Pulse

- [ ] 4.1 Create `src/components/gameplay/effects/StartupPulse.tsx`
- [ ] 4.2 Triggered on the frame a unit leaves shutdown state
- [ ] 4.3 Success branch: radial pulse 0 -> 1.2x scale, amber fading
      to neutral over 800ms
- [ ] 4.4 Failure branch: shorter pulse (400ms) fading to gray,
      shutdown overlay remains
- [ ] 4.5 Plays exactly once per restart attempt

## 5. Ammo Explosion Warning Aura

- [ ] 5.1 Create `src/components/gameplay/effects/AmmoExplosionAura.tsx`
- [ ] 5.2 Triggered when heat level would risk ammo cookoff per
      `heat-overflow-effects` rules
- [ ] 5.3 Red-purple halo pulsing at 1s period
- [ ] 5.4 Renders beneath HeatGlow and above sprite
- [ ] 5.5 Auto-dismisses when heat drops out of danger range

## 6. Event Subscription

- [ ] 6.1 Token wrappers subscribe to `HeatChanged`, `Shutdown`,
      `Startup`, `AmmoExplosionRiskEntered`, `AmmoExplosionRiskExited`
- [ ] 6.2 Effects update per subscription, not per tick
- [ ] 6.3 Subscriptions tear down on unmount

## 7. Layering Rules

- [ ] 7.1 Sprite (bottom)
- [ ] 7.2 Armor pip ring (above sprite)
- [ ] 7.3 Ammo explosion aura (above pips)
- [ ] 7.4 Heat glow (above aura, unless shutdown)
- [ ] 7.5 Shutdown overlay (overrides heat glow entirely)
- [ ] 7.6 Startup pulse (transient, above shutdown overlay)
- [ ] 7.7 Selection ring (always top)

## 8. Reduced Motion

- [ ] 8.1 Detect `prefers-reduced-motion: reduce`
- [ ] 8.2 HeatGlow collapses to a static colored outline matching the
      current threshold (no pulse)
- [ ] 8.3 Shutdown overlay removes flicker
- [ ] 8.4 Startup pulse becomes a single color snap
- [ ] 8.5 Ammo explosion aura becomes a static ring

## 9. Accessibility

- [ ] 9.1 Heat thresholds use both color and a textual badge ("HOT",
      "OVERHEAT", "CRITICAL") on the token when heat >= 15
- [ ] 9.2 Shutdown state announces via `aria-live` region
- [ ] 9.3 Colorblind palette uses amber -> orange -> red per heat ramp
      (distinguishable without red-green)

## 10. Tests

- [ ] 10.1 Unit test: `heatVisualMap` resolves correctly at each
      threshold
- [ ] 10.2 Unit test: HeatGlow transitions between thresholds over
      300ms
- [ ] 10.3 Unit test: shutdown overlay desaturates the sprite
- [ ] 10.4 Unit test: startup pulse plays once per restart
- [ ] 10.5 Integration test: heat climbs from 0 to 22; glow progresses
      through thresholds; at 22, ammo explosion aura activates
- [ ] 10.6 Integration test: reduced-motion mode renders static
      outlines only

## 11. Spec Compliance

- [ ] 11.1 Every requirement in `tactical-map-interface` delta has a
      GIVEN/WHEN/THEN scenario
- [ ] 11.2 Every requirement in `heat-overflow-effects` delta has a
      scenario
- [ ] 11.3 `openspec validate add-heat-and-shutdown-visual-indicators
--strict` passes clean
