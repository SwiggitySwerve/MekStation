# Council Decision — Modularity health vs maintain gate

Date: 2026-07-29  
Variant: Lean++ thin intended → **Mode-C Captain solo** (omo subagent API limit)  
Branch: `maintain/modularity-hard-guardrail-wave1`

## Headline

Treat `FILE_MODULARITY_SPEC` soft/hard limits as the health standard; keep `maintain:scan:gate` as an emergency floor; clean hard-guardrail (≥500 LOC) runtime files first with facade-preserving splits — do not rewrite scanner thresholds in the same wave.

## Decision

1. **Best practice confirmed:** Responsibility-based splits past soft max (runtime 400 / hard 500), facade stable, prioritize gameplay/simulation over types/catalogs. Scanner `info` at 300–599 is **modularity debt**, not “done.”
2. **Skip this wave:** `Protocol.ts` (types/zod catalog), near-dupe mass extraction, SOURCE_REFS catalog dedupe, scanner threshold / info-budget gate changes (separate config wave later).
3. **Wave 1 order:** hard ≥500 runtime — physical-attack helpers → displacement/sim/state stores → UI containers last.
4. **Executed now:** Split `restrictionActionValidationHelpers.ts` into limb / melee / charge / TacOps modules + facade; retarget `CombatSourceRefAnchorRemap` anchors.

## Survival Score

**Degraded (Mode-C)** — adversarial seats did not run; decision grounded in verified paths + modularity spec + prior maintain audit. Re-convene Lean++ if policy/gate budget change is proposed.

## Dissent / risks preserved

- Changing gate to fail on info-count drift may churn CI; land alone after cleanup proves scorecard.
- Store splits (`useGameplayStore`, persistence) have wide importer surfaces — higher facade risk than helpers.
- Jest transform-cache EPERM flakes on Windows are environmental, not regressions.

## Mode-C self-check (Phase 4.5 substitute)

1. Answers brief? Yes — practices confirmed + cleanup started.  
2. Claims grounded? Yes — FILE_MODULARITY_SPEC, scan aggregates, remap file.  
3. Dissent preserved? Yes — Mode-C + deferred gate policy.  
4. Survival honest? Degraded, not Intact.
