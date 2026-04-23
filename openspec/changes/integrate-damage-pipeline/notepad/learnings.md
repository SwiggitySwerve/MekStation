## [2026-04-23 start] Orchestration kickoff

**Repository state**: Branch `feat/integrate-damage-pipeline` created off `origin/main` at `f433cdb5`. Worktree is clean.

**Truthful task audit** (vs tasks.md checkboxes):
- All Section 1–4, 6, 8–9, 11 boxes are ticked AND implementation matches code on main (PRs #302–#305 merged).
- Section 5 (head cap) is **fake-green**. `src/utils/gameplay/damage/resolve.ts` and `location.ts` do NOT cap head damage at 3. Tasks 5.1/5.2 ticked but not actually implemented.
- Section 10.5 (life-support 2-hit) is unticked. `sensorEffects.ts` increments `lifeSupport` counter but never emits destruction at hit 2.
- Section 10.10 (ammo explosion + CASE) is unticked. `equipmentEffects.ts` `applyAmmoHit` is a stub — no damage, no CASE. **User scope says do not touch anything in wire-ammo-consumption (#344)**. PR #344 touches `wireAmmoConsumption.smoke.test.ts` and `attackAI.test.ts` — NOT the crit path. So criticalHitResolution is safe to modify; but the ammo explosion damage path is large work that risks conflict with future ammo work.
- Test-only items unticked: 5.4, 12.3, 14.3, 14.5, 15.2.
- 0.1 is an external dependency (`fix-combat-rule-accuracy` merged to main) and out of our control.

**Decision**: Implement head cap (5.1/5.2 corrective + 5.3 cluster) and 10.5 life-support. Add tests for 5.4, 14.3/14.5, 12.3, 15.2. DEFER 10.10 with rationale (risk to ammo PR + scope creep).

**File layout confirmed**:
- `src/utils/gameplay/damage/resolve.ts` — orchestrator `resolveDamage`
- `src/utils/gameplay/damage/location.ts` — `applyDamageToLocation`, `applyDamageWithTransfer`
- `src/utils/gameplay/damage/pilot.ts` — pilot damage
- `src/utils/gameplay/criticalHitResolution/effects.ts` — dispatcher
- `src/utils/gameplay/criticalHitResolution/sensorEffects.ts` — sensors + life support
- `src/utils/gameplay/criticalHitResolution/types.ts` — `IComponentDamageState`

**Tooling**:
- `openspec validate integrate-damage-pipeline --strict` already passes.
- oxfmt config at `.oxfmtrc.json`; `.prettierignore` excludes `openspec/`.
- Windows + husky: commit with `--no-verify`, manually run `sh .husky/pre-commit`.
