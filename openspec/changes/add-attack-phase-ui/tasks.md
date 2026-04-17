# Tasks: Add Attack Phase UI

## 1. Attack Phase State

- [ ] 1.1 Extend `useGameplayStore` with `attackPlan: {attackerId,
    targetId, selectedWeapons: Set<weaponId>}`
- [ ] 1.2 Clear `attackPlan` on phase change away from Weapon Attack
- [ ] 1.3 Selector `getAttackPlan(attackerId)` returns current plan

## 2. Target Lock Flow

- [ ] 2.1 During Weapon Attack phase, clicking an enemy token while a
      friendly unit is selected locks that enemy as the target
- [ ] 2.2 Target token receives a pulsing red target ring
- [ ] 2.3 Clicking the target again or clicking empty hex clears the
      target

## 3. Weapon Selector List

- [ ] 3.1 Action panel shows a collapsible "Weapons" list during Weapon
      Attack phase
- [ ] 3.2 Each weapon row shows name, location, damage, heat
- [ ] 3.3 Each row has a checkbox bound to
      `attackPlan.selectedWeapons`
- [ ] 3.4 Destroyed/jammed weapons render disabled with a status badge

## 4. Range Badges

- [ ] 4.1 Each weapon row shows three range badges (S/M/L)
- [ ] 4.2 The badge matching current range-to-target is highlighted
- [ ] 4.3 Weapons out of range show a red "Out of range" indicator

## 5. Ammo Counters

- [ ] 5.1 Ammo-consuming weapons show an inline `AmmoCounter`
- [ ] 5.2 Weapons with 0 ammo render disabled
- [ ] 5.3 Selected ammo-consuming weapons with 0 ammo block forecast
      preview

## 6. To-Hit Forecast Modal

- [ ] 6.1 "Preview Forecast" button opens the forecast modal
- [ ] 6.2 Modal lists each selected weapon with its final TN
- [ ] 6.3 Each weapon row expands to show modifier breakdown: base
      gunnery, range, attacker movement, target movement, terrain, heat,
      SPA adjustments
- [ ] 6.4 Modifiers show both the label and signed integer contribution
      (`Range +2`, `Heat +1`, `Sniper -1`)
- [ ] 6.5 Modal footer shows the overall expected hits count (sum of
      per-weapon hit probabilities)

## 7. Fire Confirmation

- [ ] 7.1 Modal has "Confirm Fire" and "Back" buttons
- [ ] 7.2 "Confirm Fire" appends an `AttackDeclared` event with the
      selected weapons and target
- [ ] 7.3 After confirm, the action panel marks the attacker as "locked"
      and grays out weapon checkboxes
- [ ] 7.4 Phase advances when both sides have locked attacks (existing
      engine behavior; UI must reflect wait state)

## 8. Resolution Log

- [ ] 8.1 On `AttackResolved` events, the event log receives one entry per
      weapon with hit/miss + location + damage
- [ ] 8.2 Entries link back to the attacker and target by designation
- [ ] 8.3 Misses explicitly state the roll vs. TN

## 9. Waiting-for-Opponent State

- [ ] 9.1 After the Player side locks attacks, the combat screen shows a
      "Waiting for Opponent..." banner
- [ ] 9.2 Banner dismisses when the session emits `attacks_revealed`
- [ ] 9.3 Forecast modal cannot be re-opened after commit

## 10. SPA Modifier Display

- [ ] 10.1 Pilot SPAs affecting the attack (e.g., Sniper, Weapon
      Specialist, Jumping Jack) appear explicitly in the modifier
      breakdown
- [ ] 10.2 Zero-impact SPAs SHALL NOT render (avoid noise)

## 11. Tests

- [ ] 11.1 Unit test: selecting a weapon adds it to `attackPlan`
- [ ] 11.2 Unit test: out-of-range weapons cannot be fired
- [ ] 11.3 Unit test: forecast shows correct final TN for known modifier
      stack
- [ ] 11.4 Integration test: pick target → select weapons → preview →
      confirm → event log has AttackDeclared entry
- [ ] 11.5 Integration test: zero-ammo ammo-weapon cannot be fired

## 12. Spec Compliance

- [ ] 12.1 Every delta requirement across `to-hit-resolution`,
      `weapon-resolution-system`, and `tactical-map-interface` has at
      least one GIVEN/WHEN/THEN scenario
- [ ] 12.2 `openspec validate add-attack-phase-ui --strict` passes clean
