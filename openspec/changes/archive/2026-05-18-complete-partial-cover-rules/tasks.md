# Tasks — Complete Partial-Cover Rules

## 1. Derive partial cover from terrain

- [x] 1.1 Add `hexProvidesPartialCover(hex)` — a pure helper that reads the
  canonical `TERRAIN_PROPERTIES` cover mapping and returns whether a hex's
  terrain grants partial cover (`CoverLevel.Partial`). `src/utils/gameplay/terrainCover.ts`.
- [x] 1.2 In `weaponAttack.ts`, replace the hardcoded `partialCover: false` in
  the `ITargetState` build with `hexProvidesPartialCover` applied to the target
  hex. The hex grid is threaded into `runAttackPhase` (optional — when absent
  the helper yields `false`, so no board means no partial cover).
- [x] 1.3 Unit-test the helper across partial-cover terrain, open terrain,
  full-cover terrain, unrecognised terrain, and the undefined-hex case.

## 2. Leg-hit → miss conversion

- [x] 2.1 In `resolveWeaponHit` (where the hit-location roll is consumed): when
  `partialCover` is true and the rolled location is a leg, resolve the weapon
  as a miss. `partialCover` is threaded from `weaponAttack.ts`.
- [x] 2.2 The converted miss emits `AttackResolved` with `hit: false` and no
  `location`; no `DamageApplied` event is emitted for that weapon.
- [x] 2.3 Confirmed the `AttackDeclared`/`AttackResolved` count invariant holds —
  the conversion still emits exactly one `AttackResolved`.

## 3. Tests

- [x] 3.1 `resolveWeaponHit` test with a scripted hit-location roll: target in
  partial cover + leg location → `AttackResolved.hit === false`, no
  `DamageApplied`, target armor untouched.
- [x] 3.2 Control tests: same leg roll without cover → normal hit + damage;
  non-leg roll with cover → normal hit + damage.
- [x] 3.3 Replaced the deferred `it.skip` placeholder in
  `scenario-partial-cover-los.test.ts` with a "SHIPPED" block pointing at the
  new deterministic coverage. (A full runner-level scenario is not asserted —
  the runner builds an all-clear grid with no varied terrain.)
- [x] 3.4 Determinism unaffected: the runner's all-clear grid yields
  `partialCover: false` everywhere, so no behaviour changes and the
  replay-determinism integration suite stays green.

## 4. Final Verification Wave

- [x] 4.1 Merge the `to-hit-resolution` MODIFIED + ADDED deltas into the
  source-of-truth spec.
- [x] 4.2 Archive this change.
