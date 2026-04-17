# Tasks: Add Damage Feedback UI

## 1. Event Subscription

- [ ] 1.1 Action panel subscribes to `DamageApplied`, `CriticalHit`,
      `ConsciousnessRoll`, `PilotHit` events for the selected unit
- [ ] 1.2 Map subscribes to the same events for any unit with a token
- [ ] 1.3 Subscriptions tear down on selection change

## 2. Armor Pip Decay Animation

- [ ] 2.1 Extend `ArmorPip` with a `justDamaged` prop
- [ ] 2.2 On `DamageApplied` for a location, pips for that location set
      `justDamaged = true` for 400ms
- [ ] 2.3 During that window, pip flashes red at 60% opacity then fades
      to empty
- [ ] 2.4 Armor-to-structure transfers animate in sequence (armor pip
      drains first, then structure pip flashes)

## 3. Critical Hit Overlay

- [ ] 3.1 New `CritHitOverlay` component positioned over the affected
      unit's token
- [ ] 3.2 On `CriticalHit`, overlay plays a burst animation lasting
      ~600ms
- [ ] 3.3 Overlay dismisses automatically; no click-through blocking the
      map
- [ ] 3.4 Concurrent crits on the same token queue, not stack

## 4. Event Log — Damage Entries

- [ ] 4.1 Extend `EventLogDisplay` renderer to handle `DamageApplied`
- [ ] 4.2 Entry reads: `"<Target> took <N> damage to <Location> from
<Weapon>"`
- [ ] 4.3 Entries with transfer chains render each step indented
      (`→ overflow to LT`, `→ structure breach`)
- [ ] 4.4 Critical hit entries render with a distinct orange accent bar

## 5. Pilot Wound Flash

- [ ] 5.1 Pilot wound track on action panel subscribes to
      `ConsciousnessRoll` events for the selected pilot
- [ ] 5.2 On roll, the track pulses yellow briefly (roll happening)
- [ ] 5.3 If roll fails, a red "Unconscious" badge appears and persists
- [ ] 5.4 If pilot consciousness state changes without a roll, the
      badge still reconciles with state

## 6. Head Hit Emphasis

- [ ] 6.1 Head hits render with an extra warning icon in the event log
- [ ] 6.2 Pilot damage from head hits renders `"Pilot takes 1 hit"` in
      the log
- [ ] 6.3 Killing head hit renders `"Pilot killed"` in red

## 7. Multi-Hit Batching

- [ ] 7.1 Multiple `DamageApplied` events from one weapon's cluster roll
      animate sequentially with a 50ms stagger
- [ ] 7.2 Event log groups them under a parent entry for the attack
- [ ] 7.3 Animation queue drains without dropping events

## 8. Damage Number Floater

- [ ] 8.1 On `DamageApplied`, a red floating number rises above the hit
      token for ~800ms
- [ ] 8.2 Number shows the damage amount
- [ ] 8.3 Floater does not block map interactions; it's a pure overlay

## 9. Tests

- [ ] 9.1 Unit test: `ArmorPip` flashes red when `justDamaged` flips to
      true
- [ ] 9.2 Unit test: crit overlay dismisses automatically after 600ms
- [ ] 9.3 Integration test: a resolved attack that does 10 damage +
      triggers a crit produces a pip decay, a crit burst, and two log
      entries
- [ ] 9.4 Integration test: pilot consciousness roll triggers yellow
      pulse; failure triggers red badge

## 10. Spec Compliance

- [ ] 10.1 Every requirement in `damage-system` delta has at least one
      GIVEN/WHEN/THEN scenario
- [ ] 10.2 Every requirement in `tactical-map-interface` delta has at
      least one scenario
- [ ] 10.3 `openspec validate add-damage-feedback-ui --strict` passes
      clean
