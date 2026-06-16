# Tasks: Extend Projection/Engine Agreement to the To-Hit Side

## 1. Investigation and red-first evidence

- [ ] 1.1 Trace the semi-guided context flow end-to-end and document (in the PR
  description) the three call sites: `gameSessionCore.ts:551`/`:604` (engine
  commit), `simulation/runner/phases/weaponAttack.ts:921`/`:972`/`:981`
  (Quick-Sim), and `combatProjection.toHit.ts:242` (projection — the one that
  omits it). Confirm `calculateToHit`'s seventh parameter is `semiGuidedTagContext`
  (`toHit/calculate.ts:62`) and which modifiers it drives (`calculate.ts:78-84`
  TMM cancellation, `:169` indirect relief).
- [ ] 1.2 Write a red-first to-hit agreement probe in
  `InteractiveSession.attackProjectionAgreement.scenario.test.ts`: a semi-guided
  LRM attacker, a TAG-designated target that moved enough hexes to earn a positive
  TMM, no ECM. Assert the resolved `AttackDeclared.toHitNumber` equals an
  **independently recomputed** engine TN (a fresh `calculateToHit` built with the
  engine's full attacker/target state + the semi-guided context). Confirm it FAILS
  today — proving the projection drops the cancellation (finding B-1).
- [ ] 1.3 Document that the existing anchor
  `expect(payload.toHitNumber).toBe(projection!.toHitNumber)` (line ~1346) is
  tautological because `enrichAttackDeclaredEventFromProjection` copies
  `projection.toHitNumber` into the payload (`InteractiveSession.actions.ts:960`).

## 2. Thread semi-guided TAG context into the projection (B-1 fix)

- [ ] 2.1 In `deriveToHitProjection` (`combatProjection.toHit.ts`), build a
  `semiGuidedTagContext` from the primary weapon (semi-guided ammo/weapon
  detection), the target unit's `tagDesignated`, the target's ECM-protected
  status, and the projection's indirect-fire determination — mirroring
  `gameSessionCore.ts:551`.
- [ ] 2.2 Pass that context as the seventh argument to BOTH the
  `calculateToHitWithC3` branch (`combatProjection.toHit.ts:225`) and the
  `calculateToHit` branch (`:242`).
- [ ] 2.3 Verify a moving TAG-designated semi-guided target now projects with the
  TMM cancelled; verify a non-TAG target and an ECM-protected target are
  unaffected (no over-cancellation).

## 3. Route the forecast modal through shared state builders (B-1 modal arm)

- [ ] 3.1 In `CombatPlanningPanel.tsx`, replace the hand-built `attackerState`
  memo (`:223-231`, which drops wounds/sensor/actuator/SPAs/quirks) with
  `buildWeaponAttackAttackerToHitState` (`toHit/stateHydration.ts:60`).
- [ ] 3.2 Replace the hand-built `targetState` memo (`:233-244`, which hardcodes
  `immobile: false`/`partialCover: false`) with
  `buildWeaponAttackTargetToHitState` (`toHit/stateHydration.ts:97`), sourcing
  immobile and partial-cover from the same inputs the engine uses.
- [ ] 3.3 Extend `buildToHitForecast` (`toHit/forecast.ts:103`) to accept and
  forward a `semiGuidedTagContext` into its `calculateToHit` call (`:121`); pass
  the modal's context through from `CombatPlanningPanel.tsx`.
- [ ] 3.4 Add a `CombatPlanningPanel` test pinning a displayed forecast TN (for a
  target with wounds + partial cover + a semi-guided moving case) to the engine's
  recomputed TN, proving the modal no longer drops inputs.

## 4. De-tautologize the attack-side agreement suite

- [ ] 4.1 Retrofit the existing represented agreement cases in
  `InteractiveSession.attackProjectionAgreement.scenario.test.ts` with the
  independent-anchor assertion (resolved `toHitNumber` equals a fresh
  `calculateToHit` over the engine's full context), keeping the existing
  projection-copy assertion as a secondary check.
- [ ] 4.2 Promote task 1.2's red probe into the permanent suite; confirm it now
  PASSES after task 2. Add an ECM-protected variant where the semi-guided
  cancellation does NOT apply, and a non-TAG variant.
- [ ] 4.3 Add an explicit comment/assertion documenting that the suite's anchor is
  the independent recomputation, so a future contributor cannot silently revert to
  the copy-only check.

## 5. Verification and documentation

- [ ] 5.1 Full verification: `npx tsc --noEmit --skipLibCheck`, `oxlint`,
  `oxfmt --check`, the affected Jest suites (combat projection, forecast,
  `CombatPlanningPanel`, and the attack-side agreement suite) green; then
  `npx openspec validate extend-projection-agreement-tohit --strict`.
- [ ] 5.2 Update `docs/audits/2026-06-12-full-codebase-review.md` finding B-1 row:
  resolved by this change (semi-guided context threaded into the projection +
  forecast modal; agreement suite de-tautologized). Note the adjacency to
  `fix-tactical-projection-agreement-gaps` (movement axis) so the two B-cluster
  changes are cross-referenced.
