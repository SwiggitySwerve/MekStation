# Tasks: Add Damage Feedback UI

## 1. Event Subscription

- [ ] 1.1 Action panel subscribes to `DamageApplied`, `CriticalHit`,
      `CriticalHitResolved`, and `PilotHit` events for the selected unit.
      Consciousness state is derived from the `consciousnessRoll` /
      `consciousnessCheck` fields on `IDamageAppliedPayload` (see
      `GameSessionInterfaces.ts:315`) — there is no standalone
      `ConsciousnessRoll` event
- [x] 1.2 Map subscribes to the same events for any unit with a token
- [x] 1.3 Subscriptions tear down on selection change

## 2. Armor Pip Decay Animation

- [x] 2.1 Extend `ArmorPip` with a `justDamaged` prop
- [x] 2.2 On `DamageApplied` for a location, pips for that location set
      `justDamaged = true` for 400ms
- [x] 2.3 During that window, pip flashes red at 60% opacity then fades
      to empty
- [ ] 2.4 Armor-to-structure transfers animate in sequence (armor pip
      drains first, then structure pip flashes)

## 3. Critical Hit Overlay

- [x] 3.1 New `CritHitOverlay` component positioned over the affected
      unit's token
- [x] 3.2 On `CriticalHit`, overlay plays a burst animation lasting
      ~600ms
- [x] 3.3 Overlay dismisses automatically; no click-through blocking the
      map
- [x] 3.4 Concurrent crits on the same token queue, not stack

## 4. Event Log — Damage Entries

- [x] 4.1 Extend `EventLogDisplay` renderer to handle `DamageApplied`
- [x] 4.2 Entry reads: `"<Target> took <N> damage to <Location> from
<Weapon>"`
- [ ] 4.3 Entries with transfer chains render each step indented
      (`→ overflow to LT`, `→ structure breach`)
- [x] 4.4 Critical hit entries render with a distinct orange accent bar

## 5. Pilot Wound Flash

- [ ] 5.1 Pilot wound track on action panel reads the consciousness
      roll from `IDamageAppliedPayload` (head-hit derived) and from
      `PilotHit` events for the selected pilot
- [x] 5.2 On a roll (payload exposes `consciousnessRoll` / TN), the
      track pulses yellow briefly (roll happening)
- [x] 5.3 If roll fails, a red "Unconscious" badge appears and persists
- [x] 5.4 If pilot consciousness state changes without a visible roll
      (e.g., cockpit crit kills pilot directly), the badge still
      reconciles with `IUnitGameState` pilot state

## 6. Head Hit Emphasis

- [x] 6.1 Head hits render with an extra warning icon in the event log
- [x] 6.2 Pilot damage from head hits renders `"Pilot takes 1 hit"` in
      the log
- [x] 6.3 Killing head hit renders `"Pilot killed"` in red

## 7. Multi-Hit Batching

- [x] 7.1 Multiple `DamageApplied` events from one weapon's cluster roll
      animate sequentially with a 50ms stagger
- [ ] 7.2 Event log groups them under a parent entry for the attack
- [x] 7.3 Animation queue drains without dropping events

## 8. Damage Number Floater

- [x] 8.1 On `DamageApplied`, a red floating number rises above the hit
      token for ~800ms
- [x] 8.2 Number shows the damage amount
- [x] 8.3 Floater does not block map interactions; it's a pure overlay

## 9. Accessibility — Colorblind Safety

- [x] 9.1 Armor pip decay reinforces the color shift with a pattern
      change (red flash + diagonal hatching) so deuteranopia / protanopia
      users still perceive damaged-this-turn state without relying on
      hue alone
- [x] 9.2 Crit hit overlay renders with both color and shape — a
      rotating chevron or "!" glyph in addition to the orange burst
- [x] 9.3 Pilot-wound "Unconscious" red badge includes a glyph (e.g.,
      a down-arrow or power icon) so it's distinguishable from other
      red UI elements
- [x] 9.4 Damage-number floater uses a bold-weight font + drop shadow
      so it reads against any map tile color
- [x] 9.5 Event log entries mark hits / crits / kills with leading
      glyphs (✓ / ⚠ / ✕) in addition to color accents
- [x] 9.6 Snapshot test: flipping `prefers-color-scheme` and simulated
      deuteranopia (via CSS filter in test harness) still leaves every
      damage state legible

## 10. Tests

- [x] 10.1 Unit test: `ArmorPip` flashes red when `justDamaged` flips
      to true
- [x] 10.2 Unit test: crit overlay dismisses automatically after 600ms
- [x] 10.3 Integration test: a resolved attack that does 10 damage +
      triggers a crit produces a pip decay, a crit burst, and two log
      entries
- [x] 10.4 Integration test: a `DamageApplied` event carrying a
      consciousness-roll field triggers the yellow pulse; failed roll
      triggers the red badge

## 11. Spec Compliance

- [ ] 11.1 Every requirement in `damage-system` delta has at least one
      GIVEN/WHEN/THEN scenario
- [ ] 11.2 Every requirement in `tactical-map-interface` delta has at
      least one scenario
- [ ] 11.3 `openspec validate add-damage-feedback-ui --strict` passes
      clean
