# Tasks: Add Heat and Shutdown Visual Indicators

## 1. Heat Visual Map

- [x] 1.1 Create `src/utils/effects/heatVisualMap.ts`
- [x] 1.2 Thresholds: 0-4 neutral, 5-9 amber glow, 10-14 orange glow,
      15-19 red glow, 20+ red-white glow with subtle pulse
- [x] 1.3 Map heat level to `{color, intensity, pulse}` tuple
- [x] 1.4 Unit tests for every threshold boundary

## 2. HeatGlow Component

- [x] 2.1 Create `src/components/gameplay/effects/HeatGlow.tsx`
- [x] 2.2 Renders a radial glow around the sprite using SVG filter
- [x] 2.3 Smoothly transitions between thresholds over 300ms
- [x] 2.4 Pulse animation only above heat 20 (1.5s period, subtle)
- [x] 2.5 Layer sits above sprite + armor pips, below selection ring

## 3. Shutdown Overlay

- [x] 3.1 Create `src/components/gameplay/effects/ShutdownOverlay.tsx`
- [x] 3.2 Desaturates the sprite via `<feColorMatrix>` filter
- [x] 3.3 Adds a dim "POWERED DOWN" label beneath the token
- [x] 3.4 Subtle flicker (~3s period) hints at failed restart attempts
- [x] 3.5 Layer overrides HeatGlow while active (shutdown is definitive)

## 4. Startup Pulse

- [x] 4.1 Create `src/components/gameplay/effects/StartupPulse.tsx`
- [x] 4.2 Triggered on the frame a unit leaves shutdown state
- [x] 4.3 Success branch: radial pulse 0 -> 1.2x scale, amber fading
      to neutral over 800ms
- [x] 4.4 Failure branch: shorter pulse (400ms) fading to gray,
      shutdown overlay remains
- [x] 4.5 Plays exactly once per restart attempt

## 5. Ammo Explosion Warning Aura

- [x] 5.1 Create `src/components/gameplay/effects/AmmoExplosionAura.tsx`
- [x] 5.2 Triggered when heat level would risk ammo cookoff per
      `heat-overflow-effects` rules
- [x] 5.3 Red-purple halo pulsing at 1s period
- [x] 5.4 Renders beneath HeatGlow and above sprite
- [x] 5.5 Auto-dismisses when heat drops out of danger range

## 6. Event Subscription

- [x] 6.1 Token wrappers subscribe to `HeatChanged`, `Shutdown`,
      `Startup`, `AmmoExplosionRiskEntered`, `AmmoExplosionRiskExited`
- [x] 6.2 Effects update per subscription, not per tick
- [x] 6.3 Subscriptions tear down on unmount

## 7. Layering Rules

- [x] 7.1 Sprite (bottom)
- [x] 7.2 Armor pip ring (above sprite)
- [x] 7.3 Ammo explosion aura (above pips)
- [x] 7.4 Heat glow (above aura, unless shutdown)
- [x] 7.5 Shutdown overlay (overrides heat glow entirely)
- [x] 7.6 Startup pulse (transient, above shutdown overlay)
- [x] 7.7 Selection ring (always top)

## 8. Reduced Motion

- [x] 8.1 Detect `prefers-reduced-motion: reduce`
- [x] 8.2 HeatGlow collapses to a static colored outline matching the
      current threshold (no pulse)
- [x] 8.3 Shutdown overlay removes flicker
- [x] 8.4 Startup pulse becomes a single color snap
- [x] 8.5 Ammo explosion aura becomes a static ring

## 9. Accessibility

- [x] 9.1 Heat thresholds use both color and a textual badge ("HOT",
      "OVERHEAT", "CRITICAL") on the token when heat >= 15
- [x] 9.2 Shutdown state announces via `aria-live` region
- [x] 9.3 Colorblind palette uses amber -> orange -> red per heat ramp
      (distinguishable without red-green)

## 10. Tests

- [x] 10.1 Unit test: `heatVisualMap` resolves correctly at each
      threshold
- [x] 10.2 Unit test: HeatGlow transitions between thresholds over
      300ms
- [x] 10.3 Unit test: shutdown overlay desaturates the sprite
- [x] 10.4 Unit test: startup pulse plays once per restart
- [x] 10.5 Integration test: heat climbs from 0 to 22; glow progresses
      through thresholds; at 22, ammo explosion aura activates
- [x] 10.6 Integration test: reduced-motion mode renders static
      outlines only

## 11. Spec Compliance

- [x] 11.1 Every requirement in `tactical-map-interface` delta has a
      GIVEN/WHEN/THEN scenario
- [x] 11.2 Every requirement in `heat-overflow-effects` delta has a
      scenario
- [x] 11.3 `openspec validate add-heat-and-shutdown-visual-indicators
--strict` passes clean
