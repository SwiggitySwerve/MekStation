# Tasks: Add Attack Phase UI

## 1. Attack Phase State

- [x] 1.1 Extend `useGameplayStore` with `attackPlan: {attackerId,
targetId, selectedWeapons: Set<weaponId>}`
- [x] 1.2 Clear `attackPlan` on phase change away from Weapon Attack
- [x] 1.3 Selector `getAttackPlan(attackerId)` returns current plan

## 2. Target Lock Flow

- [x] 2.1 During Weapon Attack phase, clicking an enemy token while a
      friendly unit is selected locks that enemy as the target
- [x] 2.2 Target token receives a pulsing red target ring
- [x] 2.3 Clicking the target again or clicking empty hex clears the
      target

## 3. Weapon Selector List

- [x] 3.1 Action panel shows a collapsible "Weapons" list during Weapon
      Attack phase
- [x] 3.2 Each weapon row shows name, location, damage, heat
- [x] 3.3 Each row has a checkbox bound to
      `attackPlan.selectedWeapons`
- [x] 3.4 Destroyed/jammed weapons render disabled with a status badge

## 4. Range Badges

- [x] 4.1 Each weapon row shows three range badges (S/M/L)
- [x] 4.2 The badge matching current range-to-target is highlighted
- [x] 4.3 Weapons out of range show a red "Out of range" indicator

## 5. Ammo Counters

- [x] 5.1 Ammo-consuming weapons show an inline `AmmoCounter`
- [x] 5.2 Weapons with 0 ammo render disabled
- [x] 5.3 Selected ammo-consuming weapons with 0 ammo block forecast
      preview

## 6. To-Hit Forecast Modal

- [x] 6.1 "Preview Forecast" button opens the forecast modal
- [x] 6.2 Modal lists each selected weapon with its final TN
- [x] 6.3 Each weapon row expands to show modifier breakdown: base
      gunnery, range, attacker movement, target movement, terrain, heat,
      SPA adjustments
- [x] 6.4 Modifiers show both the label and signed integer contribution
      (`Range +2`, `Heat +1`, `Sniper -1`)
- [x] 6.5 Modal footer shows the overall expected hits count (sum of
      per-weapon hit probabilities)

## 7. Fire Confirmation

- [x] 7.1 Modal has "Confirm Fire" and "Back" buttons
- [x] 7.2 "Confirm Fire" appends an `AttackDeclared` event with the
      selected weapons and target
- [x] 7.3 After confirm, the action panel marks the attacker as "locked"
      and grays out weapon checkboxes
- [x] 7.4 Phase advances when both sides have locked attacks (existing
      engine behavior; UI must reflect wait state)

## 8. Resolution Log

- [x] 8.1 On `AttackResolved` events, the event log receives one entry per
      weapon with hit/miss + location + damage
- [x] 8.2 Entries link back to the attacker and target by designation
- [x] 8.3 Misses explicitly state the roll vs. TN

## 9. Waiting-for-Opponent State

- [x] 9.1 After the Player side locks attacks, the combat screen shows a
      "Waiting for Opponent..." banner
- [x] 9.2 Banner dismisses when the session emits `attacks_revealed`
- [x] 9.3 Forecast modal cannot be re-opened after commit

## 10. SPA Modifier Display

- [x] 10.1 Pilot SPAs affecting the attack (e.g., Sniper, Weapon
      Specialist, Jumping Jack) appear explicitly in the modifier
      breakdown
- [x] 10.2 Zero-impact SPAs SHALL NOT render (avoid noise)

## 11. Tests

- [x] 11.1 Unit test: selecting a weapon adds it to `attackPlan`
- [x] 11.2 Unit test: out-of-range weapons cannot be fired
- [x] 11.3 Unit test: forecast shows correct final TN for known modifier
      stack
- [x] 11.4 Integration test: pick target → select weapons → preview →
      confirm → event log has AttackDeclared entry
- [x] 11.5 Integration test: zero-ammo ammo-weapon cannot be fired

## 12. Spec Compliance

- [x] 12.1 Every delta requirement across `to-hit-resolution`,
      `weapon-resolution-system`, and `tactical-map-interface` has at
      least one GIVEN/WHEN/THEN scenario
- [x] 12.2 `openspec validate add-attack-phase-ui --strict` passes clean
