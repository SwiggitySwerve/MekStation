# Tasks — Complete Partial-Cover Rules

## 1. Derive partial cover from the board

- [ ] 1.1 Add a board terrain-cover helper: given the encounter board and a hex,
  return whether that hex's terrain provides partial cover (level-1 hill,
  building, depth-1 water, rubble). Pure function, no dice.
- [ ] 1.2 In `weaponAttack.ts`, replace the hardcoded `partialCover: false` in
  the `ITargetState` build with the helper's result for the target's hex. When
  the runner has no board loaded, the helper returns `false`.
- [ ] 1.3 Unit-test the helper across each cover-providing terrain type and the
  no-board / open-terrain cases.

## 2. Leg-hit → miss conversion

- [ ] 2.1 In `weaponAttack.ts`, after the hit-location roll for a confirmed hit:
  when `partialCover` is true and the rolled location is `left_leg` or
  `right_leg`, resolve the weapon as a miss.
- [ ] 2.2 The converted miss emits `AttackResolved` with `hit: false` and no
  `hitLocation`; no `DamageApplied` event is emitted for that weapon.
- [ ] 2.3 Confirm the `AttackDeclared.length === AttackResolved.length`
  end-of-match invariant still holds.

## 3. Tests

- [ ] 3.1 Runner scenario test: target in a partial-cover hex, attacker scripted
  to roll a leg hit-location — assert `AttackResolved.hit === false` and no
  `DamageApplied` for that weapon.
- [ ] 3.2 Runner scenario test: target in a partial-cover hex, non-leg hit —
  assert the `+1` partial-cover modifier is present in `AttackDeclared` and
  damage still applies.
- [ ] 3.3 Enable the deferred `it.skip` case in
  `scenario-partial-cover-los.test.ts`.
- [ ] 3.4 Determinism check: a seeded encounter with partial-cover terrain
  produces byte-identical event logs across two runs.

## 4. Final Verification Wave

- [ ] 4.1 Merge the `to-hit-resolution` MODIFIED + ADDED deltas into the
  source-of-truth spec.
- [ ] 4.2 Archive this change.
