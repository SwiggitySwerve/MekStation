# Tasks: Restore MegaMek Parity in Damage and Critical-Hit Resolution

## 1. Investigation and red-first evidence

- [x] 1.1 Read `TWDamageManager` head-hit handling in `E:/Projects/megamek` and confirm the
  reference behavior: full damage to head armor then internal structure, exactly one crew wound,
  no damage cap. Record the Java method + line in the test as the oracle citation.
- [x] 1.2 Read `TWGameManager.java:21731` crit-slot selection and `TWDamageManager.java:1689`
  CASE venting; record the exact reference behavior cited by tasks 3 and 4.
- [x] 1.3 Read `Tank.java:2180` `engineHit()` and the MegaMek motive-damage roll-modifier table;
  record reference behavior cited by tasks 6 and 8.
- [x] 1.4 Write a red-first head-damage test: a 15-pt hit to the head on a unit with ≥4 head
  armor and 3 head IS currently leaves the head alive (cap discards overflow); assert today's
  capped result, then flip the assertion to the full-damage / head-destroyed expectation the fix
  must satisfy. Cover all four sites: `resolveDamage` (unit), `weaponAttackHitResolution`
  (sim), `physicalAttackDamage` (sim physical), `gameSessionAttackResolution` (interactive).
- [x] 1.5 Write a red-first crit-slot test: build a 12-slot location with 8 live slots and
  assert that `selectCriticalSlot` with a sweep of all d6 values 1..6 currently never returns a
  slot at index ≥ 6; the fix must make every live slot reachable.
- [x] 1.6 Write a red-first standard-CASE test: an ammo cook-off of >10 pts in excess of
  internal structure on a CASE'd side torso currently caps damage at 10; assert the current cap,
  then the vent-all-excess expectation.
- [x] 1.7 Write a red-first resolver-ammo-explosion test: the live resolver path that consumes
  `applyAmmoHit`'s ammo effect marker currently applies no IS/pilot damage; assert the no-op,
  then the explosion-applied expectation.

## 2. Head damage cap removal (C-1)

- [x] 2.1 In `src/utils/gameplay/damage/resolve.ts`, remove the `HEAD_DAMAGE_CAP_PER_HIT`
  constant and the `effectiveDamage` cap branch in `resolveDamage` (lines 205-208); pass full
  `damage` into `applyDamageWithTransfer`. Delete the fabricated "Total Warfare p.41" comment
  block (lines 27-34). Keep `applyHeadPilotDamage` (single pilot wound) intact.
- [x] 2.2 In `src/simulation/runner/phases/weaponAttackHitResolution.ts`, remove the
  `isHeadHit(location) && damage > HEAD_HIT_DAMAGE_CAP` cap (lines 372-375); pass full
  `weapon.damage`.
- [x] 2.3 In `src/simulation/runner/phases/physicalAttackDamage.ts`, remove
  `capPhysicalDamageForLocation` (lines 22-30) and its call site; pass full physical damage.
- [x] 2.4 In `src/utils/gameplay/gameSessionAttackResolution.ts`, remove the inline
  `if (isHeadHit(location) && damage > 3) { damage = 3; }` (lines 229-231).
- [x] 2.5 Remove the now-unused `HEAD_HIT_DAMAGE_CAP` export from
  `src/simulation/runner/SimulationRunnerConstants.ts:14` and any remaining importers.
- [x] 2.6 Confirm the roll-of-12 head-destruction crit path and the head pilot-wound path still
  fire; update head-damage unit tests to the full-damage expectation.

## 3. Crit-slot uniform selection (A-1)

- [x] 3.1 Rewrite `selectCriticalSlot` in `src/utils/gameplay/criticalHitResolution/selection.ts`
  to draw a uniform index across the full slot list and reject already-destroyed/empty slots
  (bounded re-draw via the injected `D6Roller`), returning `null` only when no live slot exists.
- [x] 3.2 Verify the `Multi-slot component receives one hit` and exhaustion behaviors are
  preserved; update selection unit tests so every live slot index is shown reachable.

## 4. Standard CASE vent-all-excess (A-2)

- [x] 4.1 In `src/utils/gameplay/ammoTracking/caseProtection.ts`
  `resolveCaseAdjustedAmmoExplosionDamage`, drop `STANDARD_CASE_DAMAGE_CAP` from the standard
  branch so `damageToApply = min(totalDamage, internalStructureRemaining)` (vent the rest, no
  parent transfer). Leave CASE II's 1-point cap untouched.
- [x] 4.2 Remove the unused `STANDARD_CASE_DAMAGE_CAP` constant if no other consumer remains.
- [x] 4.3 Update CASE unit tests to assert the location absorbs its full remaining internal
  structure, no `TransferDamage` to the parent, and destruction when IS is exhausted.

## 5. Resolver ammo-explosion routing (A-4)

- [x] 5.1 Rewire the live resolver consumers of `applyAmmoHit`'s ammo effect marker to invoke
  the ammo-explosion module (`resolveAmmoExplosion` +
  `resolveCaseAdjustedAmmoExplosionDamage`) for a loaded bin, producing IS damage,
  CASE/CASE-II handling (per task 4), pilot damage (per task 8), and the `AmmoExplosion` event;
  keep the empty-bin path as destroy-only.
- [x] 5.2 Verify the live `resolveAttack` path
  (`processTAC → resolveCriticalHits → applyAmmoHit` effect consumption) now applies the
  explosion; add a scenario test comparing resolver-path and runner-path explosion outcomes for
  identical bin state.

## 6. Simulation-runner TAC (medium)

- [x] 6.1 Add the roll-of-2 TAC branch to
  `src/simulation/runner/phases/weaponAttackHitResolution.ts` (around line 372): route to the
  attack-direction TAC location, roll critical hit determination regardless of armor, and apply
  resulting crits through `resolveCriticalHits`.
- [x] 6.2 Add a sim-runner test asserting a roll-of-2 produces a TAC crit and that interactive
  and sim paths agree on the roll-of-2 outcome for the same seed.

## 7. Motive-damage roll modifiers (medium)

- [x] 7.1 Replace `applyMotionTypeAggravation` in `src/utils/gameplay/motiveDamage.ts:115` with
  MegaMek's flat motive 2d6 roll-modifier-per-motion-type model (e.g. Hover +3, Wheeled +2,
  WiGE +4, Tracked +0…), feeding the motive-damage roll rather than escalating a `heavy` result
  to `immobilized`. Wire the modifier into the motive roll resolution.
- [x] 7.2 Update motive-damage unit tests to assert per-motion-type roll modifiers and that the
  resulting severity follows the modified roll, not a `heavy → immobilize` shortcut.

## 8. Vehicle crit corrections (A-3 + meds)

- [x] 8.1 In `src/utils/gameplay/vehicleCriticalHitResolution.ts` `applyEngineHit` (line 319),
  stop setting `destroyed: true`; set/keep `motive.immobilized = true` and zero effective MP,
  incrementing `engineHits`. Do not deterministically destroy on the second hit.
- [x] 8.2 Set `explosions.ts:25` `UNPROTECTED_EXPLOSION_PILOT_DAMAGE` from 1 to 2.
- [x] 8.3 Delegate `applyDriverHit` / `applyCommanderHit` (lines 288 / 303) to the faithful
  crew-crit escalation the production table layer uses, so crew-crit effects have a single
  source; preserve the commander-hit crew-stun side effect.
- [x] 8.4 Update vehicle-crit unit tests: engine-2nd-hit immobilizes (not destroyed),
  non-CASE explosion inflicts 2 pilot wounds, driver/commander helper matches the table layer.

## 9. Verification and documentation

- [x] 9.1 Confirm all red-first probes (group 1) now assert the corrected behavior and pass.
- [x] 9.2 Full verification: `npx tsc --noEmit --skipLibCheck`, `oxlint`, `oxfmt --check`, and
  the affected Jest suites (damage, criticalHitResolution, ammoTracking, vehicleCriticalHit,
  motiveDamage, simulation runner phases) green.
- [x] 9.3 Re-run any balance / statistical combat suites sensitive to head kills and crit-slot
  distribution; widen budgets only with an explanatory comment where the shift is the intended
  MegaMek-parity correction.
- [x] 9.4 Assert interactive-engine and simulation-runner agreement on head damage, TAC, and
  ammo-explosion for fixed seeds (prevent fixing one path and leaving the other).
- [x] 9.5 Run `npx openspec validate fix-combat-damage-crit-parity --strict` and confirm valid.
