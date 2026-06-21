# Design: Extend Projection/Engine Agreement to the To-Hit Side

## Context

`calculateToHit(attacker, target, rangeBracket, range, minRange?, weaponId?,
semiGuidedTagContext?)` (`src/utils/gameplay/toHit/calculate.ts:55-63`) is the
single shared to-hit kernel used by three callers:

1. **Engine commit** — `declareAttack` in `gameSessionCore.ts` builds the
   attacker/target state via `buildWeaponAttackAttackerToHitState` /
   `buildWeaponAttackTargetToHitState` (`stateHydration.ts:60`/`:97`), builds a
   `semiGuidedTagContext` (`gameSessionCore.ts:551`), and passes it (`:604`).
2. **Quick-Sim** — `weaponAttack.ts:921` builds an equivalent
   `semiGuidedTagContext` (including `targetEcmProtected`) and passes it (`:972`/`:981`).
3. **Projection** — `deriveToHitProjection` (`combatProjection.toHit.ts:97`) calls
   `calculateToHit` (`:242`, non-C3) / `calculateToHitWithC3` (`:225`, C3) and
   **omits** the seventh argument.

The semi-guided context, when present and the target is TAG-designated and not
ECM-protected, causes `calculate.ts:78-84` to push a negative modifier that
cancels the positive target-movement modifier (TMM), and `calculate.ts:169` to
apply indirect-fire relief. Dropping the context in the projection means a
semi-guided LRM at a TAG-designated *moving* target keeps a TMM the commit path
removes — the projection TN is too high. Per MegaMek
`ComputeTargetToHitMods.java:203`, semi-guided ammunition against a TAG target
zeroes the target-movement contribution; the engine path matches, the projection
does not.

`enrichAttackDeclaredEventFromProjection` (`InteractiveSession.actions.ts:927`)
then writes `toHitNumber: projection.toHitNumber` (`:960`) into the resolved
`AttackDeclared` payload. The recorded resolved TN is the projection's number, so
the projection's error is the resolved attack's error — and the agreement suite's
`expect(payload.toHitNumber).toBe(projection!.toHitNumber)` (`:1346`) can never
catch it because it compares the copy to its source.

`ToHitForecastModal` is fed by `CombatPlanningPanel.tsx`, whose `attackerState`
memo (`:223-231`) carries only `{gunnery, movementType, heat, damageModifiers:
[]}` and whose `targetState` memo (`:233-244`) hardcodes `immobile: false`,
`partialCover: false`. This lossy state flows through `buildToHitForecast`
(`forecast.ts:103`) → `calculateToHit` (`:121`), which also omits the
semi-guided context. The modal can therefore disagree with the commit even when
the kernel is correct.

## Decisions

### D1 — Thread `semiGuidedTagContext` into `deriveToHitProjection`, building it the same way the engine does

The projection SHALL construct a `semiGuidedTagContext` from the same inputs the
engine uses (semi-guided ammo/weapon detection on the primary weapon, the target
unit's `tagDesignated` flag, the target's ECM-protected status, and the
projection's indirect-fire determination) and pass it as the seventh argument to
both the `calculateToHitWithC3` branch and the `calculateToHit` branch inside
`deriveToHitProjection`. **Rationale:** the kernel already implements the rule;
the only divergence is the missing argument. Supplying it makes the projection
agree with `declareAttack`/Quick-Sim by construction, the minimum fix (no new
layer). The projection already has access to the primary weapon, the target unit,
and its indirect-fire result, so no new plumbing is required.

### D2 — Route `ToHitForecastModal` through the shared state builders, not hand-built state

`CombatPlanningPanel.tsx` SHALL build the forecast's attacker/target state via
`buildWeaponAttackAttackerToHitState` / `buildWeaponAttackTargetToHitState`
(the same builders `declareAttack` uses) and SHALL pass the same
`semiGuidedTagContext`. `buildToHitForecast` (`forecast.ts`) SHALL accept and
forward `semiGuidedTagContext`. **Rationale:** the hand-built state silently drops
wounds, sensor, actuator, SPAs, quirks, immobile, and partial cover — every one of
those is a real to-hit input the engine honors. Reusing the shared builders is the
uniform fix: one source of truth for "what state does the to-hit kernel see",
consumed by commit, Quick-Sim, and now the modal. The modal becomes a pure view
over the same derivation, so it cannot drift.

### D3 — Add an absolute anchor + a semi-guided-moving-target red case; do not delete the existing assertion

The agreement suite SHALL gain (a) a scenario: semi-guided LRM, TAG-designated
target that **moved** this turn, no ECM — asserting the resolved
`AttackDeclared.toHitNumber` equals an **independently-recomputed** engine TN (a
fresh `calculateToHit` with the engine's full context, NOT the enriched copy);
and (b) the same independent-anchor assertion retrofitted to the existing
represented cases so a future projection regression fails. The existing
`payload.toHitNumber === projection.toHitNumber` assertion MAY remain as a
"projection-is-authoritative-for-the-recorded-number" check, but it is no longer
the *only* anchor. **Rationale:** an agreement suite that compares a value to its
own copy proves nothing. The independent recomputation is the real oracle; the
semi-guided-moving case is the specific B-1 reproduction that must be red before
D1 and green after.

### D4 — Coordinate with `fix-tactical-projection-agreement-gaps`; no overlap

This change touches `combatProjection.toHit.ts`, `CombatPlanningPanel.tsx`
(to-hit `attackerState`/`targetState` memos and the forecast wiring only),
`forecast.ts`, and the attack-side agreement suite. The movement-side change owns
`reachable.ts`, `commitValidation.ts`, `validation.ts`, the
`CombatPlanningPanel.tsx` *range/bracket* display, and the movement agreement
suite. The two changes share the `CombatPlanningPanel.tsx` file but edit disjoint
regions (movement-range memo vs. to-hit-forecast memos). **Rationale:** the audit
explicitly scopes B-1 out of the movement change; keeping the to-hit axis in its
own change preserves trail integrity and avoids a merge of unrelated concerns.

## Open Questions

(none)

## Risks

- **Shared-file merge with the movement change.** Both changes edit
  `CombatPlanningPanel.tsx`. Mitigation: the edits are in disjoint memos
  (`rangeToTarget` / movement overlay vs. `attackerState` / `targetState` /
  `forecastWeapons`); land whichever merges first, then rebase the other. Tasks
  call out the specific memo names so the diffs stay small.
- **Builder coupling.** Routing the modal through `buildWeaponAttack*ToHitState`
  couples the UI to the engine state-hydration contract. Mitigation: that is the
  intended single source of truth (D2); a builder signature change would now break
  the modal at compile time, which is the desired drift alarm rather than a risk.
- **Hidden third caller drift.** If a future caller of `calculateToHit` is added
  without `semiGuidedTagContext`, the same class of bug recurs. Mitigation: the
  independent-anchor assertion (D3) covers the projection/commit pair; a
  follow-up could add a lint or a kernel-level required-context guard, but that is
  out of scope here.
- **ECM nullification edge.** The semi-guided benefit is ECM-nullified. The
  projection must read the same ECM-protected status the engine reads or it will
  over-cancel TMM under ECM. Mitigation: D1 builds the context from the target's
  ECM status exactly as `weaponAttack.ts:921` does (`targetEcmProtected`), and the
  test matrix includes an ECM-protected variant where the cancellation does NOT
  apply.
