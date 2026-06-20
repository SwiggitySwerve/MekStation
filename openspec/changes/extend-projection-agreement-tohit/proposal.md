# Change: Extend Projection/Engine Agreement to the To-Hit Side

## Why

The 2026-06-09 remediation (PRs #801/#802) unified the combat projection with the
engine commit path and added an attack-side agreement suite, and the active
`fix-tactical-projection-agreement-gaps` change closes the *movement*-side
divergence (turning MP, jump candidate gates, panel range display). Neither
covers the **to-hit** projection/engine agreement gaps that the 2026-06-12 full
codebase review confirmed as finding **B-1** (Cluster B — To-hit & movement
projection agreement, parity lens, high severity). B-1 is explicitly called out
in the audit as "All out of scope of the active projection change."

The to-hit projection is **not** in agreement with the commit/resolve path on
semi-guided TAG attacks against a moving target:

- `deriveToHitProjection` calls `calculateToHit` WITHOUT a
  `semiGuidedTagContext` argument (`src/utils/gameplay/combatProjection.toHit.ts:242`;
  the seventh parameter is omitted at both the C3 and non-C3 call sites). The
  engine commit path `declareAttack` DOES build and pass one
  (`src/utils/gameplay/gameSessionCore.ts:551` builds it, `:604` passes it), and
  the Quick-Sim weapon-attack phase does too
  (`src/simulation/runner/phases/weaponAttack.ts:921`/`:972`/`:981`).
  `calculateToHit`'s signature accepts it as `semiGuidedTagContext`
  (`src/utils/gameplay/toHit/calculate.ts:62`), and it drives
  `calculateSemiGuidedTagTargetMovementModifier` — which cancels positive
  target-movement to-hit (`calculate.ts:78-84`) — and
  `calculateSemiGuidedTagIndirectFireModifier` (`calculate.ts:169`). Because the
  projection drops this context, a semi-guided LRM fired at a TAG-designated
  *moving* target projects a **too-high TN** (it keeps the TMM the engine
  cancels), diverging from MegaMek `ComputeTargetToHitMods.java:203`.

- `enrichAttackDeclaredEventFromProjection`
  (`src/engine/InteractiveSession.actions.ts:927`) stamps the projection's number
  onto the resolved `AttackDeclared` payload —
  `toHitNumber: projection.toHitNumber` (`:960`). So the player commits an attack
  whose recorded TN is the projection's number, **not** an independently-computed
  engine number. The projection error therefore propagates straight into the
  resolved attack.

- `ToHitForecastModal` (rendered from `CombatPlanningPanel.tsx`) feeds a thin,
  hand-built attacker/target state into the forecast: the attacker state carries
  only `{gunnery, movementType, heat, damageModifiers: []}`
  (`CombatPlanningPanel.tsx:223-231` — pilot wounds, sensor hits, actuator
  damage, SPAs, and quirks are all dropped), and the target state hardcodes
  `immobile: false` and `partialCover: false`
  (`CombatPlanningPanel.tsx:233-244`). That state flows through
  `buildToHitForecast` → `calculateToHit` (`src/utils/gameplay/toHit/forecast.ts:103`/`:121`),
  which also omits `semiGuidedTagContext`. The modal's TNs can therefore
  disagree with what resolves even when the underlying derivation is correct,
  because the inputs are lossy. Meanwhile the engine commit path builds its
  attacker/target state from the **shared** hydration builders
  `buildWeaponAttackAttackerToHitState` / `buildWeaponAttackTargetToHitState`
  (`src/utils/gameplay/toHit/stateHydration.ts:60`/`:97`).

- The attack-side agreement suite's anchor assertion is **tautological**:
  `expect(payload.toHitNumber).toBe(projection!.toHitNumber)`
  (`src/engine/__tests__/InteractiveSession.attackProjectionAgreement.scenario.test.ts:1346`).
  Because `enrichAttackDeclaredEventFromProjection` copies the projection number
  into the payload, this assertion passes regardless of whether the projection
  agrees with an independent engine TN. The suite contains **no semi-guided TAG
  case**, and its lone partial-cover case uses a **stationary** target, so the
  exact B-1 divergence (semi-guided + moving target) is unobserved.

This is the same gap class the movement-side change repairs — a preview/commit
agreement that is asserted only by a copy, not by an absolute anchor — but on
the to-hit axis.

## What Changes

- Thread `semiGuidedTagContext` into `deriveToHitProjection` so the projection's
  `calculateToHit` call (both the C3 and non-C3 branches in
  `combatProjection.toHit.ts`) prices semi-guided TAG target-movement
  cancellation and indirect-fire relief identically to `declareAttack` and
  Quick-Sim — closing the moving-TAG-target TN divergence (B-1).
- Route `ToHitForecastModal`'s attacker/target state through the shared
  `buildWeaponAttack*ToHitState` builders instead of the lossy hand-built state
  in `CombatPlanningPanel.tsx`, so wounds, sensor hits, actuator damage, SPAs,
  quirks, immobile, and partial-cover all reach the forecast, and the forecast's
  `calculateToHit` receives the same `semiGuidedTagContext`.
- Add **absolute-anchor** to-hit agreement assertions: the attack-side agreement
  suite SHALL assert the resolved `AttackDeclared.toHitNumber` equals an
  independently-recomputed engine TN (not the enriched copy), AND add a
  semi-guided-TAG-against-a-moving-target scenario that fails today
  (de-tautologizing the suite).
- Coordinate with the adjacent active change
  `fix-tactical-projection-agreement-gaps` (movement-side) — do **not** duplicate
  its movement reachability / jump / panel-range work; this change owns only the
  to-hit axis.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `to-hit-resolution`: "To-Hit Forecast Projection" gains a requirement that the
  projection be computed with the same semi-guided TAG context the engine commit
  and Quick-Sim paths pass.
- `weapon-resolution-system`: "TAG Designation for Semi-Guided To-Hit" gains a
  scenario pinning the *resolved* (committed) to-hit number for a semi-guided
  attack on a moving TAG-designated target to an independently-recomputed engine
  TN — closing the tautological-anchor gap.
- `tactical-map-interface`: "To-Hit Forecast Modal" gains a requirement that the
  modal source attacker/target to-hit state from the shared engine state builders
  rather than a hand-built lossy projection.

## Impact

- `src/utils/gameplay/combatProjection.toHit.ts` — build + thread
  `semiGuidedTagContext` into the `calculateToHit` (and `calculateToHitWithC3`)
  call(s) inside `deriveToHitProjection`.
- `src/components/gameplay/CombatPlanningPanel.tsx` — replace the hand-built
  `attackerState`/`targetState` memos with the shared
  `buildWeaponAttackAttackerToHitState` / `buildWeaponAttackTargetToHitState`
  builders; pass `semiGuidedTagContext` into the forecast.
- `src/utils/gameplay/toHit/forecast.ts` — accept and forward
  `semiGuidedTagContext` through `buildToHitForecast` to `calculateToHit`.
- `src/utils/gameplay/toHit/stateHydration.ts` — shared builders consumed by the
  modal (read-only reference; no contract change expected).
- `src/engine/__tests__/InteractiveSession.attackProjectionAgreement.scenario.test.ts`
  — add the semi-guided-moving-target scenario and the absolute-anchor assertion;
  de-tautologize the existing `payload.toHitNumber === projection.toHitNumber`
  anchor.
- No combat-resolution delta — does not change the archived
  `add-battlemech-combat-validation-suite` baseline. No movement-system delta — that
  axis is owned by `fix-tactical-projection-agreement-gaps`.

## Non-goals

- No movement-side projection work (turning MP, jump candidate gate, panel range
  consolidation) — owned by the active `fix-tactical-projection-agreement-gaps`
  change; cited here only as the adjacent precedent.
- No new projection layer or façade — PRs #801/#802 already routed the projection
  through `calculateToHit`; this change supplies the missing argument and the
  shared state builders, and de-tautologizes the anchor.
- No change to the semi-guided TAG *rule* itself (cancel positive TMM + indirect
  relief, ECM-nullified) — that behavior already exists in `calculateToHit`; this
  change only makes the projection and the forecast modal *use* it.
- No expansion of the combat-validation catalog (tracked by the archived
  `add-battlemech-combat-validation-suite` baseline and current validation scripts) and no
  damage/crit parity work (Cluster A).
