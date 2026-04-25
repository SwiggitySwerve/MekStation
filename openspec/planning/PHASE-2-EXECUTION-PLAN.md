# Phase 2 Execution Plan — Quick Simulation Mode

**Branch:** `feat/phase-2-quick-simulation`
**Roadmap reference:** [docs/plans/2026-04-17-combat-and-multiplayer-roadmap.md](../../docs/plans/2026-04-17-combat-and-multiplayer-roadmap.md) §Phase 2 (lines 110-129)
**Phase 1 status:** ✅ COMPLETE (PRs #301-#320 merged into `main`)

---

## Context

Phase 2 delivers **decision-support tooling** for campaign players — they
can evaluate encounters before committing to a full visual fight, and
inspect probabilistic weapon outcomes during interactive combat. Four
OpenSpec changes cover the roadmap's 4 PR slots:

| Change                            | Roadmap PR                         | Surface            |
| --------------------------------- | ---------------------------------- | ------------------ |
| `add-quick-resolve-monte-carlo`   | #1 batch runner + #2 stats helpers | Engine + UI button |
| `add-quick-sim-result-display`    | #3 result display                  | UI                 |
| `add-what-if-to-hit-preview`      | #4 What-if calculator              | Engine util + UI   |
| `add-pre-battle-force-comparison` | (Phase 2 deliverable)              | Engine util + UI   |

Total scope: ~483 task checkboxes across 4 changes.

---

## Dependency graph

```
                            ┌─────────────────────────────────┐
                            │ Phase 1 (merged into main)      │
                            │  - GameEngine.runToCompletion() │
                            │  - SeededRandom                 │
                            │  - ToHitForecastModal (PR #320) │
                            │  - WeaponSelector  (PR #320)    │
                            │  - to-hit forecast utils        │
                            │  - postBattleReport             │
                            │  - pre-battle.tsx page          │
                            └─────────────────────────────────┘
                                   │
                ┌──────────────────┼──────────────────────┬──────────────────┐
                │                  │                      │                  │
                ▼                  ▼                      ▼                  ▼
        ┌──────────────┐    ┌──────────────┐      ┌──────────────┐   ┌──────────────┐
        │ Sub-Branch A │    │ Sub-Branch C │      │ Sub-Branch D │   │              │
        │ monte-carlo  │    │ what-if      │      │ pre-battle   │   │              │
        └──────┬───────┘    └──────────────┘      └──────────────┘   │              │
               │                                                      │              │
               ▼                                                      │              │
        ┌──────────────┐                                              │              │
        │ Sub-Branch B │                                              │              │
        │ result-display │                                            │              │
        └──────────────┘                                              │              │
        SERIAL after A                                                │              │
```

**Critical path:** A → B (monte-carlo blocks result-display because B
consumes A's `IBatchResult` shape).

**Parallelism:** A, C, D start simultaneously. B waits for A.

---

## File-scope ownership matrix

| Change                | Creates                                                                                                                                                                                                | Modifies                                                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| **A. monte-carlo**    | `src/simulation/QuickResolveService.ts`, `src/simulation/aggregateBatchOutcomes.ts`, `src/hooks/useQuickResolve.ts`                                                                                    | `src/pages/gameplay/encounters/[id].tsx`†                                                                                          |
| **B. result-display** | `src/components/gameplay/QuickSimResultPanel.tsx`, `src/components/gameplay/QuickSimResultSummary.tsx`, `src/components/gameplay/TurnCountHistogram.tsx`, `src/pages/gameplay/encounters/[id]/sim.tsx` | `src/pages/gameplay/encounters/[id].tsx`†, `src/components/gameplay/index.ts`                                                      |
| **C. what-if**        | `src/utils/gameplay/toHit/preview.ts`, `src/utils/gameplay/damage/expectedDamage.ts`                                                                                                                   | `src/components/gameplay/WeaponSelector.tsx`‡, `src/components/gameplay/ToHitForecastModal.tsx`‡, `src/stores/useGameplayStore.ts` |
| **D. pre-battle**     | `src/utils/gameplay/forceSummary.ts`, `src/utils/gameplay/forceComparison.ts`, `src/components/gameplay/ForceComparisonPanel.tsx`                                                                      | `src/pages/gameplay/encounters/[id]/pre-battle.tsx`, `src/components/gameplay/index.ts`                                            |

**† Audit correction**: encounter detail page is `src/pages/gameplay/encounters/[id].tsx` (single file), not `[id]/index.tsx` as the original proposals stated. A and B both modify it — minor merge resolution required (B serial after A makes this trivial).

**‡ Audit correction**: original `add-what-if-to-hit-preview` proposal references `WeaponPicker.tsx`. Phase 1 named it `WeaponSelector.tsx`. Sub-Branch C must update the proposal references during execution.

**Conflict points:**

- `src/components/gameplay/index.ts` — exports list, both B and D add lines (always trivial merge, same pattern as Phase 1 final sweep)
- `src/pages/gameplay/encounters/[id].tsx` — A adds Quick Resolve button, B adds result summary row. B serial after A so single resolution.

No cross-engine/util file conflicts.

---

## Sub-branch execution plan

Each sub-branch off `feat/phase-2-quick-simulation`:

| Sub-branch                     | Agent         | Start                | Depends on       |
| ------------------------------ | ------------- | -------------------- | ---------------- |
| `feat/phase-2--monte-carlo`    | hephaestus #1 | T+0                  | Phase 1 (merged) |
| `feat/phase-2--what-if`        | hephaestus #2 | T+0                  | Phase 1 (merged) |
| `feat/phase-2--pre-battle`     | hephaestus #3 | T+0                  | Phase 1 (merged) |
| `feat/phase-2--result-display` | hephaestus #4 | T+1 (after A merges) | Sub-Branch A     |

**Wave 1 (parallel): A + C + D**

- 3 hephaestus agents on isolated worktrees
- Non-overlapping file scopes (only `index.ts` collisions)
- Each runs full verification chain (tsc, jest, oxlint, oxfmt, next build) before pushing

**Wave 2 (serial): B**

- Spawned after A merges into `feat/phase-2-quick-simulation`
- Pulls A's `IBatchResult` shape from utils
- Adds result-display surface

**Final integration:**

- All 4 sub-branches merged into `feat/phase-2-quick-simulation`
- One PR to `main`, monitored serially per CI-budget directive

---

## Reusable Phase 1 / existing code to leverage

| Need                             | Existing code (verified)                      | Path                                                |
| -------------------------------- | --------------------------------------------- | --------------------------------------------------- |
| Run engine to completion N times | `GameEngine.runToCompletion()`                | `src/engine/GameEngine.ts:67`                       |
| Deterministic RNG                | `SeededRandom`                                | `src/simulation/core/SeededRandom.ts`               |
| Post-battle report shape         | `derivePostBattleReport`, `IPostBattleReport` | `src/utils/gameplay/postBattleReport.ts`            |
| To-hit forecast                  | `forecastToHit`, `hitProbability`             | `src/utils/gameplay/toHit/forecast.ts`              |
| Weapon-attack UI                 | `WeaponSelector`, `ToHitForecastModal`        | `src/components/gameplay/`                          |
| Pre-battle page                  | `PreBattlePage.sections`, `pre-battle.tsx`    | `src/pages/gameplay/encounters/[id]/pre-battle.tsx` |
| Encounter detail page            | `[id].tsx` (single file)                      | `src/pages/gameplay/encounters/[id].tsx`            |
| Skirmish setup builder           | `preBattleSessionBuilder`, `computeBvTotals`  | `src/utils/gameplay/preBattleSessionBuilder.ts`     |
| Damage system constants          | tables, cluster hits                          | `src/utils/gameplay/damage/`                        |

**Do not duplicate** — the audit confirmed each utility above already
exists. New work should compose, not reimplement.

---

## Pre-execution issues to fix during agent briefing

1. **Filename correction (Sub-Branch C)**: proposal says `WeaponPicker.tsx`; actual file is `WeaponSelector.tsx`. Update proposal during work, or just route the agent to the correct file in the briefing.
2. **Page path correction (Sub-Branch A & B)**: proposal references `src/pages/gameplay/encounters/[id]/index.tsx`; actual file is `src/pages/gameplay/encounters/[id].tsx`. Brief the agent.
3. **Determinism contract (Sub-Branch A)**: this is the same trap that bit Phase 1's `selectTarget`. The Monte Carlo wrapper must consume PRNG at constant rates — spawning N seeds, never short-circuiting. Brief explicitly.

---

## Verification chain (per sub-branch and at final integration)

```bash
npx tsc --noEmit                                      # 0 errors required
npx jest --testPathIgnorePatterns=e2e --silent       # 100% pass required
npx oxlint .                                          # 0 errors (warnings ok)
npx oxfmt --check .                                   # clean required
npx next build                                        # build success required
```

**End-to-end smoke (final integration):**

1. Open an encounter detail page → click "Quick Resolve" → see progress → see win-probability bar + histogram
2. Navigate to /gameplay/encounters/[id]/sim → see deep-linkable result panel
3. Open pre-battle page → see force comparison panel with BV/tonnage/skill deltas
4. In an interactive game session → toggle "What if" preview in weapon picker → see expected damage column appear without committing an attack
5. Run a 100-sim Monte Carlo on a tiny mech vs giant mech matchup → verify win probability is intuitively skewed
6. Repeat the same sim with the same seed list → verify identical aggregate (determinism)

---

## Phase 2 done definition

- [ ] All 4 OpenSpec changes' tasks.md fully checked off
- [ ] One squashed PR `feat/phase-2-quick-simulation` → `main` merged
- [ ] All 4 OpenSpec changes archived (moved to `openspec/changes/archive/`)
- [ ] Roadmap doc Phase 2 section marked complete
- [ ] CHANGELOG entry (if convention exists)
- [ ] Determinism: same seed list → same `IBatchResult` aggregate (regression test)

---

## Risk register

| Risk                                               | Likelihood | Mitigation                                                                                |
| -------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------- |
| Determinism break in Monte Carlo                   | Medium     | Capstone E2E test; explicit PRNG-rate contract in agent brief                             |
| Performance: 100 sims × turn-rich battles too slow | Low–Medium | Roadmap target "few seconds for 100 sims"; profile before optimizing                      |
| `index.ts` export conflicts at integration         | Low        | Same pattern as Phase 1 final sweep — trivial textual merge                               |
| Sub-Branch B blocked by A's instability            | Low        | A's `IBatchResult` shape stable from spec; B can proto against the spec while A finalizes |
| What-if preview accidentally fires events          | Medium     | Pure utility computation, never call `applyAction`; verify in tests                       |

---

## Next step

After this outline is approved → spawn 3 hephaestus agents on isolated
worktrees for Wave 1 (A + C + D) in parallel. When A merges, spawn B on
its own worktree.
