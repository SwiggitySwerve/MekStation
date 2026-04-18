# Phase 3 Execution Plan — Campaign ↔ Combat Integration

**Branch:** `feat/phase-3-campaign-combat-integration`
**Roadmap reference:** [docs/plans/2026-04-17-combat-and-multiplayer-roadmap.md](../../docs/plans/2026-04-17-combat-and-multiplayer-roadmap.md) §Phase 3 (lines 133-164)
**Phase 1 status:** ✅ COMPLETE (PRs #301-#320)
**Phase 2 status:** ✅ COMPLETE (PR #321)

---

## Context

Phase 3 closes the combat ↔ campaign loop. Today, fights launched from a
campaign produce a `gameSessionId` (PR #293) but **nothing listens for the
finished session to update campaign state** — XP, wounds, mech damage,
salvage, and contract progression are all dropped on the floor.

Phase 3 wires the round trip:
1. Battle ends → engine emits `ICombatOutcome`
2. Campaign store subscribes → enqueues outcomes
3. Day-advance day-pipeline runs 3 new processors in order:
   - `postBattleProcessor`: pilot XP, wounds, contract status
   - `salvageProcessor`: salvage rolls, contract splits, auctions
   - `repairQueueBuilderProcessor`: damage → repair tickets
4. Player sees `/games/[id]/review` page with casualties + XP + salvage + repair preview

| Change                                   | Roadmap PR | Surface              |
|------------------------------------------|------------|----------------------|
| `add-combat-outcome-model`               | #1 outcome shape | Engine + types     |
| `add-post-battle-processor`              | #2 processor     | Backend processor  |
| `add-salvage-rules-engine`               | #3 salvage       | Backend processor  |
| `add-repair-queue-integration`           | #4 repair queue  | Backend processor  |
| `add-post-battle-review-ui`              | #5 review page   | UI (Pages Router)  |
| `wire-encounter-to-campaign-round-trip`  | (integration glue) | Backend + UI integration |

Total scope: ~674 task checkboxes across 6 changes.

---

## Dependency graph (DAG)

```
                      ┌─────────────────────────────┐
                      │ Phase 1+2 (merged into main)│
                      │  - IPostBattleReport        │
                      │  - victory.tsx              │
                      │  - EncounterService         │
                      │  - useCampaignStore         │
                      │  - dayPipeline              │
                      │  - xpAwards                 │
                      └─────────────────────────────┘
                                   │
                                   ▼
                ╔══════════════════════════════════╗
       Wave 1   ║  1. add-combat-outcome-model     ║   (solo, blocks all)
                ╚══════════════════════════════════╝
                                   │
                                   ▼
                ╔══════════════════════════════════╗
       Wave 2   ║  2. add-post-battle-processor    ║   (solo, depends on 1)
                ╚══════════════════════════════════╝
                                   │
                ┌──────────────────┴──────────────────┐
                ▼                                     ▼
       ╔════════════════════╗            ╔════════════════════╗
Wave 3 ║ 3. salvage-rules   ║   PARALLEL ║ 4. repair-queue    ║
       ╚════════════════════╝            ╚════════════════════╝
                │                                     │
                └──────────────────┬──────────────────┘
                                   ▼
                ╔══════════════════════════════════╗
       Wave 4   ║  5. add-post-battle-review-ui    ║   (solo, depends on 2+3+4)
                ╚══════════════════════════════════╝
                                   │
                                   ▼
                ╔══════════════════════════════════╗
       Wave 5   ║  6. wire-encounter-to-campaign-  ║   (terminal — depends on all)
                ║     round-trip                   ║
                ╚══════════════════════════════════╝
```

**Critical path:** 1 → 2 → (3 ∥ 4) → 5 → 6.
**Maximum parallelism:** Wave 3 only (2 agents). Phase 3 is mostly serial.

---

## File-scope ownership matrix

| Change | Creates | Modifies |
|--------|---------|----------|
| **1. outcome-model** | `src/types/combat/CombatOutcome.ts`, `src/lib/combat/outcome/combatOutcome.ts` | `src/engine/InteractiveSession.ts` (add `getOutcome()`) |
| **2. post-battle-processor** | `src/types/campaign/UnitCombatState.ts`, `src/lib/campaign/processors/postBattleProcessor.ts` | `src/lib/campaign/dayPipeline.ts` (register processor), unit repository |
| **3. salvage** | `src/types/campaign/Salvage.ts`, `src/lib/campaign/salvage/salvageEngine.ts`, `src/lib/campaign/processors/salvageProcessor.ts` | `src/types/campaign/contracts/contractTypes.ts`† (add `salvageRights` if absent), `src/lib/campaign/dayPipeline.ts` |
| **4. repair-queue** | `src/types/campaign/RepairTicket.ts`‡, `src/lib/campaign/repair/repairQueueBuilder.ts`, `src/lib/campaign/processors/repairQueueBuilderProcessor.ts` | `src/lib/campaign/dayPipeline.ts` |
| **5. review-ui** | `src/pages/gameplay/games/[id]/review.tsx`§, `src/components/gameplay/post-battle/` (6 components) | `src/stores/useGameplayStore.ts` (add review-ready selector) |
| **6. round-trip** | (no new files; integration only) | `src/services/encounter/EncounterService.ts`, `src/engine/InteractiveSession.ts`, `src/stores/campaign/useCampaignStore.ts`, `src/lib/campaign/dayAdvancement.ts`, campaign dashboard page |

**† Audit correction**: `contractTypes.ts` lives at `src/types/campaign/contracts/contractTypes.ts` (not `contractMarket.ts` as the proposal says).

**‡ Audit correction**: No `IRepairTicket` type currently exists. The repair UI components at `src/components/gameplay/pages/repair/bay/` and `src/components/repair/` use ad-hoc shapes. Sub-Branch 4 must define `IRepairTicket` from scratch and align existing components to it (or just augment without breaking them — TBD by the agent).

**§ Audit correction**: project uses **Pages Router** (`src/pages/`), not App Router (`src/app/`). Review page must land at `src/pages/gameplay/games/[id]/review.tsx` next to existing `victory.tsx`. Audit's reference to `src/app/...` was wrong.

**¶ Audit correction**: `IPostBattleReport` DOES exist at `src/utils/gameplay/postBattleReport.ts` — Phase 1 shipped it. The outcome-model change should compose with / extend it, not "supersede" it.

**¶ Audit correction**: Campaign store is at `src/stores/campaign/useCampaignStore.ts`, not `src/stores/useCampaignStore.ts`.

**Conflict points:**
- `src/lib/campaign/dayPipeline.ts` — Sub-Branches 2, 3, 4, 6 all register processors. Last one in wins ordering; agent 6 owns final order (postBattle → salvage → repair).
- `src/engine/InteractiveSession.ts` — Sub-Branches 1 (`getOutcome()`) and 6 (bus event emission). Serial avoids conflict.
- `src/stores/campaign/useCampaignStore.ts` — Sub-Branches 5 and 6.

Serial waves mostly avoid conflicts; only Wave 3's two agents (3 + 4) can collide on `dayPipeline.ts`. Agent 4 should pull agent 3's processor registration if 3 lands first; otherwise textual merge.

---

## Sub-branch execution plan

| Wave | Sub-branch | Agent | Depends on |
|------|-----------|-------|------------|
| 1 | `feat/phase-3--outcome-model` | hephaestus #1 | Phase 1+2 (merged) |
| 2 | `feat/phase-3--post-battle-processor` | hephaestus #2 | Wave 1 |
| 3 | `feat/phase-3--salvage` ∥ `feat/phase-3--repair-queue` | hephaestus #3a + #3b | Wave 2 |
| 4 | `feat/phase-3--review-ui` | hephaestus #4 | Wave 3 (both) |
| 5 | `feat/phase-3--round-trip` | hephaestus #5 | Wave 4 |

Each wave merges into `feat/phase-3-campaign-combat-integration` before
the next wave spawns. Wave 3's two agents merge in any order.

---

## Reusable Phase 1 / Phase 2 / existing code (verified)

| Need | Path | Notes |
|------|------|-------|
| Post-battle report shape | `src/utils/gameplay/postBattleReport.ts` (`derivePostBattleReport`, `IPostBattleReport`) | Phase 1 shipped — compose, don't replace |
| Engine session | `src/engine/InteractiveSession.ts`, `src/engine/GameEngine.ts` | Phase 1+2 |
| XP awards | `src/lib/campaign/progression/xpAwards.ts` (`awardScenarioXP`, `awardKillXP`, `awardTaskXP`, `awardMissionXP`, `applyXPAward`) | Already exists — Phase 3 wires it in |
| Encounter service | `src/services/encounter/EncounterService.ts` (has `launchEncounter`) | Verified |
| Campaign store | `src/stores/campaign/useCampaignStore.ts` + `useCampaignRosterStore.ts` | Verified |
| Day pipeline | `src/lib/campaign/dayPipeline.ts` + `src/lib/campaign/dayAdvancement.ts` | Plugin registry pattern |
| Existing processors | `src/lib/campaign/processors/contractProcessor.ts`, `acquisitionProcessor.ts` | Reference patterns |
| Maintenance baseline | `src/lib/campaign/maintenance/maintenanceCheck.ts` | Existing |
| Repair UI | `src/components/gameplay/pages/repair/bay/`, `src/components/repair/` | UI exists; types ad-hoc |
| Contract types | `src/types/campaign/contracts/contractTypes.ts` | Verified path (NOT `contractMarket.ts`) |
| Victory page (template for review.tsx) | `src/pages/gameplay/games/[id]/victory.tsx` | Phase 1 shipped |

---

## Pre-execution issues to fix during agent briefing

1. **Path corrections for Sub-Branch 5** (review-ui): Pages Router only. Use `src/pages/gameplay/games/[id]/review.tsx`. NOT `src/app/...`.
2. **`IPostBattleReport` exists** — Sub-Branch 1 should compose with it, not call it Phase-1-pending.
3. **`IRepairTicket` does NOT exist** — Sub-Branch 4 must define it. Existing UI components use ad-hoc shapes; align them or augment without breaking.
4. **Campaign store path**: `src/stores/campaign/useCampaignStore.ts` (sub-folder).
5. **Contract types path**: `src/types/campaign/contracts/contractTypes.ts` for `salvageRights` field.
6. **Day-pipeline ordering**: Sub-Branch 6 owns the final order. Agents 2, 3, 4 register their processor; agent 6 verifies the chain runs as `postBattle → salvage → repair → contract` (or whatever the spec demands).

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
1. Open a campaign → accept a contract → launch encounter → fight a battle → end with victory or concede
2. Verify navigation to `/games/[id]/review` shows: casualty list, XP per pilot, salvage roll, repair ticket preview
3. Verify campaign dashboard shows banner: "X battles pending review"
4. Click "Apply outcome" → verify pilot XP increments, wounds appear on hurt pilots, damaged units show in repair bay, salvage flows to inventory
5. Advance one campaign day → verify processors run in correct order (postBattle → salvage → repair)
6. Verify contract status flips to `Completed` on win or `Failed` on loss

---

## Phase 3 done definition

- [ ] All 6 OpenSpec changes' tasks.md fully checked off
- [ ] One squashed PR `feat/phase-3-campaign-combat-integration` → `main` merged
- [ ] All 6 OpenSpec changes archived to `openspec/archive/`
- [ ] Roadmap doc Phase 3 section marked complete
- [ ] E2E test: accept contract → battle → outcome → next day → all deltas applied
- [ ] No regressions: existing 19,863 jest tests still passing

---

## Risk register

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `IRepairTicket` missing causes Sub-Branch 4 scope blowup | Medium | Brief agent to define it minimally (extend later) |
| Day-pipeline ordering conflicts in Wave 3 | Medium | Agent 6 owns final order; agents 2/3/4 just register |
| Engine `getOutcome()` API leaks Phase 1 internals | Low | Compose `derivePostBattleReport` rather than reimplement |
| Campaign store subscription pattern unfamiliar to agent | Low | Existing pattern in `useCampaignStore.ts`; brief explicitly |
| Pages Router vs App Router confusion | High (audit already wrong) | Brief Sub-Branch 5 explicitly: Pages Router |
| Salvage rules disagreement (TW vs Campaign Ops) | Medium | Cite source in spec: Total Warfare salvage table |

---

## Next step

After this outline is committed → spawn Wave 1 (Sub-Branch 1 / outcome-model) on isolated worktree. When it lands and merges, spawn Wave 2. And so on.

Maximum concurrency happens at Wave 3 (2 agents in parallel). The rest is mostly serial — Phase 3's nature is integration glue, not greenfield UI.
