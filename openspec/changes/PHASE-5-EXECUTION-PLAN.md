# Phase 5 Execution Plan — Pilot SPA UI

**Branch:** `feat/phase-5-pilot-spa-ui`
**Roadmap reference:** [docs/plans/2026-04-17-combat-and-multiplayer-roadmap.md](../../docs/plans/2026-04-17-combat-and-multiplayer-roadmap.md) §Phase 5 (lines 206-220)
**Phase 1-4 status:** ✅ COMPLETE (PRs #301-#323)

---

## Context

The 91-entry SPA catalog is already shipped at `src/lib/spa/`. Combat
modifiers are bridged. What's missing is the player-facing chrome: a picker,
an editor button on the pilot detail page, designation prompts for SPAs that
need them, and SPA display on the unit card + pilot sheet + printed record.

| Change                                       | Roadmap PR        | Surface                        |
| -------------------------------------------- | ----------------- | ------------------------------ |
| `add-spa-picker-component`                   | #1 picker         | Reusable `<SPAPicker>`         |
| `add-pilot-spa-editor-integration`           | #2 editor wiring  | Pilot detail page              |
| `add-spa-designation-persistence`            | #3 designations   | Pilot record contract          |
| `add-spa-display-on-pilot-sheet-and-unit-card` | #4 + #5 display + PDF | Card / sheet / record export |

Total scope: ~401 task checkboxes across 4 changes.

---

## Dependency graph

```
Wave 1: add-spa-picker-component (solo, blocks all)
        │
        ├─► Wave 2a: add-pilot-spa-editor-integration  (parallel)
        │
        └─► Wave 2b: add-spa-designation-persistence    (parallel)
                          │
                          ▼
Wave 3: add-spa-display-on-pilot-sheet-and-unit-card (solo, terminal)
```

**Critical path:** 1 → (2a ∥ 2b) → 3.
**Maximum parallelism:** Wave 2 (2 agents). Both depend on Wave 1's picker
but touch different files: 2a touches the pilot detail page + pilot service,
2b touches the pilot record types + designation contract + combat hand-off.

---

## Locked architectural decisions (avoid agent debate)

1. **Component location**: `src/components/spa/SPAPicker/` — proposal-aligned.
2. **Reuse existing AbilityPurchaseCard / Modal**: `src/components/pilots/AbilityPurchaseCard.tsx`
   and `AbilityPurchaseModal.tsx` already exist. Phase 5 either consumes them
   or replaces — **agents must inspect first** and adapt rather than parallel-build.
3. **Existing SPA data**: `src/lib/spa/index.ts` exposes the catalog. Use it.
4. **Pilot record path**: `src/types/pilot/PilotInterfaces.ts` (and
   `src/types/campaign/Person.ts` for the campaign equivalent — both have
   `specialAbilities` shape). Designation persistence extends both.
5. **Pages Router**: pilot detail at `src/pages/gameplay/pilots/[id].tsx`.
6. **Record sheet rendering**: `src/services/printing/RecordSheetService.ts` +
   `src/services/printing/recordsheet/`. SPA section on the printed sheet
   lives here.
7. **No new deps** — all SPA UI work uses existing React + project utility
   classes.

---

## File-scope ownership matrix

| Change         | Creates                                                                                                                    | Modifies                                                                                                       |
| -------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **1. picker**  | `src/components/spa/SPAPicker/{SPAPicker.tsx, CategoryTabs.tsx, SearchInput.tsx, SourceFilters.tsx, SPAItem.tsx}` + tests | (none — purely additive)                                                                                       |
| **2a. editor** | (none new — extends existing pilots components)                                                                            | `src/pages/gameplay/pilots/[id].tsx`, `src/components/pilots/AbilityPurchase*.tsx`, `src/services/pilots/...`  |
| **2b. designation** | `src/types/pilot/SPADesignation.ts`, `src/lib/spa/designation/applyDesignation.ts`                                    | `src/types/pilot/PilotInterfaces.ts`, `src/types/campaign/Person.ts`, `src/lib/spa/spaCombat...` (hand-off)    |
| **3. display** | `src/components/spa/SPABadge.tsx`, `src/components/spa/SPAList.tsx`, `src/components/spa/SPATooltip.tsx`                  | `src/components/pilot-mech-card/PilotSection.tsx`, `src/services/printing/recordsheet/...` (PDF section)      |

**Conflict points:**

- 2a and 2b both touch the pilot record. 2a calls `pilotService.addSpa`/`removeSpa`;
  2b extends the storage shape. Brief 2a to use a setter that takes the new
  designation shape from 2b's types (or stub the designation as `null` and let
  3 wire it through). **Strategy: 2b lands AFTER 2a's PR is up but they merge
  in any order if both branches stay on integration.**

Practical move: do them sequentially since both touch pilot types. Wave 2a
first, then Wave 2b. The plan's "parallel" was optimistic.

---

## Sub-branch execution plan

| Wave | Sub-branch                                    | Agent         | Depends on        |
| ---- | --------------------------------------------- | ------------- | ----------------- |
| 1    | `feat/phase-5--picker`                        | hephaestus #1 | main              |
| 2a   | `feat/phase-5--editor`                        | hephaestus #2 | Wave 1            |
| 2b   | `feat/phase-5--designation`                   | hephaestus #3 | Wave 2a (serial)  |
| 3    | `feat/phase-5--display`                       | hephaestus #4 | Wave 2b           |

All waves work directly on the integration branch (no isolated worktrees) since
Phase 5 has minimal cross-wave conflict potential.

---

## Verification (per wave + at final integration)

```bash
npx tsc --noEmit
npx jest --silent --testPathIgnorePatterns=e2e
npx oxlint .
npx oxfmt --check .
```

**End-to-end smoke (final integration):**

1. Open `/gameplay/pilots/[id]` for a test pilot
2. Click "Add Ability" → SPAPicker opens with all 91 SPAs grouped by category
3. Search "Weapon" → list filters; pick "Weapon Specialist" → designation modal
   asks for weapon type → confirm → XP deducted + ability added
4. Pilot card on the unit detail page shows SPA badge with category color
5. Hover the badge → tooltip shows full description + source
6. Print record sheet → "Special Abilities" section lists every SPA + designation

---

## Phase 5 done definition

- [ ] All 4 OpenSpec changes' tasks.md fully checked
- [ ] One squashed PR `feat/phase-5-pilot-spa-ui` → `main` merged
- [ ] All 4 changes archived under `openspec/changes/archive/`
- [ ] Roadmap doc Phase 5 section marked complete
- [ ] No regressions: existing jest tests still passing
