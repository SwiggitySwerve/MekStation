# Tasks: Add Attack Visual Effects

## 1. Weapon Visual Map

- [ ] 1.1 Create `src/utils/effects/weaponEffectMap.ts`
- [ ] 1.2 Map weapon types to categories: `laser | missile | ballistic
    | physical`
- [ ] 1.3 Map subtypes to colors (small/med pulse -> IR tint; med/large
      laser -> green; ER variants -> red-orange; missiles -> yellow
      trail; ballistic -> cyan tracer; physical -> white shockwave)
- [ ] 1.4 Unit tests covering every weapon type represented in the
      catalog

## 2. Effect Primitives

- [ ] 2.1 Create `LaserBeam.tsx`: solid line with glow filter from
      origin to target, 400ms duration
- [ ] 2.2 Create `MissileTrail.tsx`: dashed line animating from origin
      to target with an arrowhead, 600ms duration
- [ ] 2.3 Create `Tracer.tsx`: short bright dashes moving along the
      line, 300ms duration
- [ ] 2.4 Create `Shockwave.tsx`: expanding ring at target hex, 400ms
      duration
- [ ] 2.5 Create `ImpactFlash.tsx`: white burst at impact hex, 150ms
      duration

## 3. Attack Effects Layer

- [ ] 3.1 Create `src/components/gameplay/effects/AttackEffectsLayer.tsx`
- [ ] 3.2 Subscribes to `AttackResolved` events
- [ ] 3.3 For each hit, emits the appropriate primitive + impact flash
- [ ] 3.4 For each miss, emits a faded primitive that terminates past
      the target hex
- [ ] 3.5 Layer sits above the token layer, `pointer-events: none` so
      click-through is preserved

## 4. Miss vs Hit Differentiation

- [ ] 4.1 Hit: full opacity primitive ending at target center; impact
      flash at target
- [ ] 4.2 Miss: 40% opacity primitive overshooting the target by 1 hex
      in the attack direction; no impact flash
- [ ] 4.3 Partial (cluster half-hit) renders split dashes: solid hit
      portion, faded miss portion
- [ ] 4.4 Unit tests for each variant

## 5. Cluster Weapon Staggering

- [ ] 5.1 Multi-missile launchers (LRM/SRM) stagger trails with 30ms
      offset so a salvo reads as multiple missiles
- [ ] 5.2 Ultra AC double-tap staggers two tracers at 80ms offset
- [ ] 5.3 Rotary AC burst fires five tracers at 40ms offset
- [ ] 5.4 Visual stagger does not affect damage math (pure presentation)

## 6. Physical Attack Effects

- [ ] 6.1 Punch: shockwave at target hex, thin ring
- [ ] 6.2 Kick: shockwave at target hex, thicker ring
- [ ] 6.3 Club / hatchet / sword: shockwave plus faint arc from attacker
      to target hex
- [ ] 6.4 Charge / DFA: shockwave at both attacker and target hexes
- [ ] 6.5 Physical impact flashes use a red tint (distinct from
      ballistic white)

## 7. Event Timing

- [ ] 7.1 Effects queue alongside damage animations in
      `useAnimationQueue`
- [ ] 7.2 Beam/tracer/trail plays 300-600ms, then impact flash fires
- [ ] 7.3 Damage-pip decay fires on impact flash (coordinate with
      `add-damage-feedback-effects`)
- [ ] 7.4 Phase advancement waits for all queued effects to drain

## 8. Reduced Motion Fallback

- [ ] 8.1 On `prefers-reduced-motion: reduce`, render a single 300ms
      fading connecting line from origin to target
- [ ] 8.2 Impact flash is still shown but dimmed to 50% opacity and
      shortened to 80ms
- [ ] 8.3 Arcs and shockwaves collapse to a static line
- [ ] 8.4 Unit test: reduced motion path emits only the simplified line

## 9. Performance

- [ ] 9.1 Use CSS transforms + opacity animations (no layout thrash)
- [ ] 9.2 Reuse `<defs>` for glow filters across all beams
- [ ] 9.3 Budget: 30 concurrent effects at 60 FPS on a 30x30 map
- [ ] 9.4 Profile regression checked in CI

## 10. Tests

- [ ] 10.1 Unit test: `weaponEffectMap` returns correct category for
      each weapon type
- [ ] 10.2 Unit test: hit renders full-opacity primitive + flash
- [ ] 10.3 Unit test: miss renders faded primitive with no flash
- [ ] 10.4 Integration test: resolving a PPC hit produces a green beam
      and impact flash within 600ms
- [ ] 10.5 Integration test: LRM-20 hit produces 20 staggered trails

## 11. Spec Compliance

- [ ] 11.1 Every requirement in `attack-effects-system` spec has a
      GIVEN/WHEN/THEN scenario
- [ ] 11.2 Every requirement in `tactical-map-interface` delta has a
      scenario
- [ ] 11.3 Every requirement in `weapon-resolution-system` delta has a
      scenario
- [ ] 11.4 `openspec validate add-attack-visual-effects --strict` passes
      clean
