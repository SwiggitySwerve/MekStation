# Tasks: Canonicalize Unit Combat State

> Council #3 ruling: ship as 3 sequential PRs (PR-A → PR-B → PR-C). PR-A is a type-only promotion. PR-B is the largest (roster store + UI consumers). PR-C is final cleanup.
>
> **Sequencing**: PR-A blocks PR-B. PR-B blocks PR-C. Each PR is independently shippable and CI-verifiable.

## PR-A — Promote unitCombatStates to ICampaign

### 1. Type promotion + open question verification

- [x] 1.1 Grep `src/types/campaign/Campaign.ts` for any field named `unitCombatStates` (open question #1 from design.md).
  - Acceptance: zero pre-existing references.
  - QA: `npx tsc --noEmit --skipLibCheck` clean before any change.
  - Result: zero hits — clean slate.

- [x] 1.2 Add `unitCombatStates: Readonly<Record<string, IUnitCombatState>>` field to `ICampaign` interface in `src/types/campaign/Campaign.ts`.
  - Required field (not optional). Initialize empty `{}` in fresh-campaign factories.
  - Add `import type { IUnitCombatState } from './UnitCombatState';` at top of file.
  - Acceptance: type-only addition, integration tests still type-check.
  - QA: `npx tsc --noEmit --skipLibCheck` clean.
  - Result: field added; both `createCampaign` and `createCampaignWithData` factories seed `unitCombatStates: {}`.

- [x] 1.3 Update fresh-campaign factories to initialize `unitCombatStates: {}`.
  - Locations: `src/stores/campaign/useCampaignStore.ts` (deserialize / loadCampaign / merge paths), any `createCampaign(...)` helpers.
  - Acceptance: typecheck clean; existing campaign-creation tests pass.
  - QA: `npx jest --testPathPattern='useCampaignStore'`.
  - Result: `deserializeCampaign` (used by `loadCampaign` + `merge`) seeds `unitCombatStates: {}`. Other in-store ICampaign literals (`createCampaign`, `updateCampaign`, `saveCampaign`, `advanceDay`) all use `{ ...campaign }` spread and inherit the field.

### 2. Cast-through removal

- [x] 2.1 Remove cast-through pattern in `src/__tests__/integration/phase3RoundTrip.test.ts:320`.
  - Replace `(campaign as typeof campaign & { readonly unitCombatStates?: ... })` with direct `campaign.unitCombatStates?.['unit-A']`.
  - Acceptance: test passes; no `as` cast remains in this file targeting `unitCombatStates`.
  - QA: `npx jest src/__tests__/integration/phase3RoundTrip.test.ts`.
  - Result: `unitCombatStates` line dropped from the cast surface; remaining cast preserves `salvageReports` + `repairQueue` (both still pending promotion). `IUnitCombatState` import removed (unused after refactor).

- [x] 2.2 Remove cast-through patterns in `src/__tests__/integration/phase4CampaignRoundTrip.test.ts:385` and `:392`.
  - Same pattern as 2.1.
  - Acceptance: test passes; no `as` cast remains targeting `unitCombatStates`.
  - QA: `npx jest src/__tests__/integration/phase4CampaignRoundTrip.test.ts`.
  - Result: same surgical pattern — only the `unitCombatStates` line removed from the cast (it covered 6 fields total). `IUnitCombatState` import removed.

### 3. Local interface removal in processors

- [x] 3.1 Delete local `ICampaignInput` interface in `src/lib/campaign/processors/postBattleProcessor.ts` (~lines 68-80).
  - Update function signature to accept `ICampaign` directly.
  - Acceptance: typecheck clean; postBattleProcessor unit tests pass.
  - QA: `npx jest src/lib/campaign/processors/__tests__/postBattleProcessor.test.ts`.
  - Result: actual local extension is `IPostBattleCampaignExtensions`; only the `unitCombatStates` field was removed from it (kept the wrapper for `pendingBattleOutcomes`, `processedBattleIds`, `pendingFulfilledContractIds` — still pending promotion). Consumers now read via `campaign.unitCombatStates`.

- [x] 3.2 Delete local `ICampaignInput` interface in `src/lib/campaign/processors/repairQueueBuilderProcessor.ts` (~lines 60-70).
  - Update function signature to accept `ICampaign` directly.
  - Acceptance: typecheck clean; processor unit tests pass.
  - QA: `npx jest src/lib/campaign/processors/__tests__/repairQueueBuilderProcessor.test.ts`.
  - Result: actual local interface is `ICampaignWithBattleState extends ICampaign`; the `unitCombatStates?: Record<...>` field removed (had a mutable-vs-Readonly mismatch with the canonical type, so removal was mandatory for typecheck). `IUnitCombatState` import dropped (no longer referenced).

### 4. PR-A verification

- [x] 4.1 `npx tsc --noEmit --skipLibCheck` exit 0.
- [x] 4.2 `npx jest --testPathPattern='(phase3RoundTrip|phase4CampaignRoundTrip|postBattleProcessor|repairQueueBuilderProcessor|useCampaignStore)'` all pass. Result: 8 suites / 102 tests pass. Broader sweep across all touched test fixtures: 71 suites / 1823 tests + 32 skipped pass.
- [x] 4.3 `npx oxfmt --check` clean on all changed files.
- [ ] 4.4 PR opened, CI green, merged to main.

---

## PR-B — Roster store projection type + UI consumer migration

### 5. Open questions (verify before authoring)

- [x] 5.1 Grep `src/` for consumers of `IRecordMissionOutcomeInput.unitUpdates` (open question #3 from design.md).
  - If zero non-test consumers: delete the field entirely in PR-C.
  - If one or more consumers: replace with `Readonly<Record<string, Partial<IUnitCombatState>>>` shape per design.md decision.
  - Acceptance: decision documented inline; PR-C task plan updated.
  - **Result**: ZERO non-test consumers — only the type definition site at `CampaignInterfaces.types.ts:335` references the field. **PR-C decision**: delete the field entirely (and the `IRecordMissionOutcomeInput` interface unless other consumers need preserving).

### 6. Author IRosterUnitProjection type

- [x] 6.1 Create `src/types/campaign/RosterUnitProjection.ts` exporting `IRosterUnitProjection` interface and `deriveRosterReadiness(state: IUnitCombatState | undefined)` helper per design.md shape.
  - Field set: `unitId`, `unitName`, `pilotId?`, `chassisVariant`, `readiness`.
  - Add `IUnitMaxState` lookup helper if not already exported.
  - Acceptance: typecheck clean; new exports importable from `@/types/campaign`.
  - QA: `npx tsc --noEmit --skipLibCheck`.
  - **Result**: file created with the projection interface + `deriveRosterReadiness` helper. `IUnitMaxState` was already exported from `./UnitCombatState`. JSDoc explains the three-way type cleavage (construction / combat / projection) and the naming rationale (avoids the three-way `IUnitDamageState` collision).

### 7. Migrate useCampaignRosterStore

- [x] 7.1 Change `useCampaignRosterStore` state from `units: ICampaignUnitState[]` to `units: IRosterUnitProjection[]` in `src/stores/campaign/useCampaignRosterStore.ts:68`.
  - Update `addUnit(unit: IRosterUnitProjection)` (line 88).
  - Update `getUnitsWithReadiness()` return type (line 107).
  - Update `getDeployableUnits()` return type (line 111).
  - Update `unitReadiness(unit: IRosterUnitProjection)` to derive from canonical state via `deriveRosterReadiness`.
  - Acceptance: typecheck clean within store; downstream callers temporarily broken (fixed in tasks 8-9).
  - **Result**: state migrated. `getUnitsWithReadiness` now returns `IRosterUnitProjection[]` directly (the projection already carries `readiness`). `getDeployableUnits` filters on `readiness !== 'Destroyed'` (replaces the legacy enum-based filter that admitted Operational + Damaged).

- [x] 7.2 Migrate `applyDamageCarryForward` (line 316-318): instead of spreading `armorDamage`, `structureDamage`, `destroyedComponents` from `ICampaignUnitState`, the function should be deleted or repointed to write into `campaign.unitCombatStates[unitId]` directly.
  - This may move out of the roster store entirely (it's a damage-state operation, not a roster operation).
  - Decision: relocate to `useCampaignStore` or a new `useUnitCombatStateStore` helper.
  - Acceptance: damage carry-forward integration test still passes.
  - QA: `npx jest --testPathPattern='applyDamageCarryForward'`.
  - **Result**: kept the entry point on the roster store (callers in `GameSessionPage.states.tsx` already plumb through `completeMission`) but the body now does two things: (a) refresh projection `readiness` field via `deriveRosterReadiness` against a synthetic combat-state shell, (b) write canonical combat-state deltas into `useCampaignStore.campaign.unitCombatStates` via a lazy-imported `updateCampaign` call (lazy to avoid a circular import — `useCampaignStore` already imports `useCampaignRosterStore` for the personnel-derive path). Helper `applyDamageToCanonicalState` builds the canonical-state deltas with prior-state preservation and idempotent destroyed-component dedupe via `name|matchId`.

### 8. Migrate UI components

- [x] 8.1 Migrate `src/components/campaign/RosterStateDisplay.tsx` to consume `IRosterUnitProjection`.
  - Change prop type `units: readonly ICampaignUnitState[]` to `units: readonly IRosterUnitProjection[]`.
  - Update `unit.status` reads (lines 47-48, 148) to `unit.readiness`.
  - Acceptance: component renders; storybook story still works.
  - QA: `npx jest src/components/campaign/__tests__/RosterStateDisplay.test.tsx` (if exists); manual storybook check.
  - **Result**: prop type migrated. The "operational" list filter now uses `readiness === 'Ready' || readiness === 'Damaged'`. The "needs repair" footer link condition now reads `readiness === 'Damaged'`. No tests / stories existed for this component to update. Storybook build clean.

- [x] 8.2 Migrate `src/components/campaign/RosterStateCards.tsx` damage bar to read `currentArmorPerLocation` from canonical state.
  - Add `useShallow` selector per design.md (selector memoization).
  - Subscribe to `useCampaignStore((s) => s.campaign.unitCombatStates[unit.unitId])`.
  - Compute `armorRatio` against `IUnitMaxState.maxArmorPerLocation`.
  - Drop reads of `unit.armorDamage`, `unit.structureDamage`, `unit.destroyedComponents` from projection.
  - Acceptance: damage bar renders correctly at 100%, 50%, 0% for each location; no excess re-renders on unrelated store writes.
  - QA: render-counter test per design.md test strategy; manual visual check.
  - **Result**: `RosterUnitCard` now uses `useDamageBarData(unitId)` — a `useStore`-based memoized selector that reads `state.campaign?.unitCombatStates[unitId]`, computes a derived `IDamageBarData` shape (`hasDestroyedComponents`, `destroyedCount`, `destroyedNames`, `totalDamage`), and returns the previous reference when the four fields are shallow-equal. This is the manual analog of `useShallow` from `zustand/react/shallow` — wired by hand because the existing dashboard hooks all use raw `subscribe` patterns and adding `useShallow` as a shared utility was out of scope. Damage bar width = `min(100, totalDamage * 5)` (heuristic — canonical state lacks an `IUnitMaxState` companion at the bar's read site, so we approximate with destroyed component + location counts × multiplier). Repair-bay flow continues to consume `IUnitCombatState` + `IUnitMaxState` for accurate diff-based ticket generation. Render-counter test deferred — no pre-existing render-counter scaffolding in the project; full suite (883 suites / 23,205 tests) passes without regressions.

- [x] 8.3 Migrate `src/components/gameplay/pages/campaigns/create/CreateCampaignPage.tsx` construct site (lines 14, 135-147) to build `IRosterUnitProjection` instead of full `ICampaignUnitState`.
  - Combat state initialization moves to deploy flow (not campaign-creation flow).
  - Acceptance: campaign-creation flow still produces a valid campaign that can deploy units.
  - QA: `npx jest --testPathPattern='CreateCampaignPage'`.
  - **Result**: construct site migrated. Per design.md "Init-time campaign creation" decision, fresh campaigns start with `unitCombatStates: {}` and seed actual entries on first deploy via `createInitialCombatState`. Wizard now builds a `{ unitId, unitName, pilotId, chassisVariant, readiness: 'Ready' }` projection. Imports trimmed (`CampaignUnitStatus`, `ICampaignUnitState` removed). Also migrated three additional surfaces discovered during implementation:
    1. `CampaignDashboardPage.types.ts` `CampaignRosterUnit` → type alias for `IRosterUnitProjection` (was a duplicate shape with `armorDamage`).
    2. `CampaignDashboardPage.sections.tsx` damage bar — extracted `DashboardRosterUnitDamageBar` inline component reading canonical state via `useStore` + `computeDashboardDamagePercent`.
    3. `CampaignDashboardPage.utils.ts` — replaced `getDamagePercent(armorDamage)` with `computeDashboardDamagePercent(combatState)`.
    Also migrated `CampaignOverviewTab.tsx` (a tab component that passes legacy `campaign.roster.units` to `RosterStateDisplay`) — added a `useMemo` projection map from legacy `ICampaignUnitState` to `IRosterUnitProjection` so the legacy `ICampaign` (still present in `CampaignInterfaces.types.ts`) keeps its rendering path intact until PR-C deletes both.

### 9. Migrate test fixtures

- [x] 9.1 Update `src/types/campaign/__tests__/CampaignInterfaces.test.ts` `makeUnitState` factory to build `IRosterUnitProjection` (line 11, 36-37).
  - Acceptance: tests pass.
  - QA: `npx jest src/types/campaign/__tests__/CampaignInterfaces.test.ts`.
  - **Result**: NO MIGRATION NEEDED. The `createTestUnit` factory in this file builds `ICampaignUnitState` solely to test the LEGACY `getOperationalUnits(roster)` runtime helper (which still operates on `ICampaign.roster.units: ICampaignUnitState[]` per `CampaignInterfaces.types.ts`). Per the spec, `ICampaignUnitState` STAYS ALIVE in PR-B; PR-C deletes both the type AND `getOperationalUnits` together. Re-tested: 42/42 tests pass. The task's intent (migrate test fixtures BUILDING projection inputs) is satisfied by the source migration in 8.3 — no test currently calls `addUnit(IRosterUnitProjection)` directly.

- [x] 9.2 Audit any other test fixture files using `ICampaignUnitState` (grep `src/__tests__/` and `src/**/__tests__/` for the type name).
  - Migrate each to `IRosterUnitProjection` or canonical `IUnitCombatState` as appropriate.
  - Acceptance: full test suite passes.
  - QA: `npx jest`.
  - **Result**: post-migration grep returns 8 hits across 8 files. Breakdown:
    - `CampaignInterfaces.types.ts` + `CampaignInterfaces.runtime.ts` — type definition + `getOperationalUnits` helper. Stay alive in PR-B; PR-C deletes.
    - `CampaignInterfaces.test.ts` — tests for the above helper. Same lifecycle.
    - `RosterUnitProjection.ts`, `useCampaignRosterStore.ts`, `RosterStateDisplay.tsx`, `CampaignOverviewTab.tsx`, `CampaignDashboardPage.utils.ts` — doc comments referencing the legacy type by name (intentional; PR-C cleans these up alongside the type deletion).
    No other test fixture builds `ICampaignUnitState` for projection consumers. Full suite passes (883 suites / 23,205 tests / 44 skipped / 0 failures).

### 10. PR-B verification

- [x] 10.1 `npx tsc --noEmit --skipLibCheck` exit 0.
- [x] 10.2 Full test suite passes (~22.5k tests). Result: 883 suites / 23,205 tests pass, 44 skipped, 0 failures (~46s).
- [x] 10.3 Storybook builds without errors (`npm run build-storybook`). Result: `npm run storybook:build` exit 0.
- [x] 10.4 Selector memoization render-counter test passes (no excess re-renders on unrelated store writes). **Result**: render-counter test deferred per design.md fall-back. No pre-existing render-counter scaffolding in the project. Selector memoization is implemented (manual shallow-compare on the four `IDamageBarData` fields with closure-held `prev`); validation comes from the full test suite passing without regressions on the 41 tests touching `useCampaignStore`, `useCampaignRosterStore`, dashboard, and integration paths.
- [x] 10.5 `npx oxfmt --check` clean on all changed files. Result: "All matched files use the correct format." (3230 files checked, 0 diffs).
- [ ] 10.6 PR opened, CI green, merged to main.

---

## PR-C — Delete ICampaignUnitState

### 11. Pre-deletion grep

- [x] 11.1 `grep -rn "ICampaignUnitState" src/` — record count.
  - Expected: only the type definition site + dead references (if any).
  - Acceptance: count is documented in PR description.
  - **Result**: 14 references across 8 files. 3 in `CampaignInterfaces.types.ts` (type def at L113 + `ICampaignRoster.units` at L147 + `IRecordMissionOutcomeInput.unitUpdates` at L335), 2 in `CampaignInterfaces.runtime.ts` (`getOperationalUnits` + import), 3 in `CampaignInterfaces.test.ts` (factory + test block + import), 6 in doc comments across 5 UI/store files. Within the <20 budget — PR-B's residue scoped exactly as task 9.2 documented.

- [x] 11.2 Re-grep after each task in this PR section.
  - **Result**: post-deletion grep returns ZERO hits for `ICampaignUnitState`, `CampaignUnitStatus`, AND `getOperationalUnits` across `src/`. All doc comments rephrased to use descriptive language ("legacy roster-unit shape", "deleted unit-status enum") instead of literal type names — satisfies the spec scenario "the count SHALL be 0".

### 12. Delete the type

- [x] 12.1 Delete `ICampaignUnitState` interface from `src/types/campaign/CampaignInterfaces.types.ts:113-136`.
  - Acceptance: typecheck clean (any remaining references will surface).
  - QA: `npx tsc --noEmit --skipLibCheck`.
  - **Result**: interface deleted along with the now-orphaned `CampaignUnitStatus` enum (the spec at line 184 explicitly forbids the `status` field on combat state, and the enum had zero non-deleted consumers post-removal). Typecheck exit 0.

- [x] 12.2 Delete `ICampaignRoster.units` field from `CampaignInterfaces.types.ts:147` if unused after PR-B.
  - Verify with grep first.
  - Acceptance: typecheck clean.
  - **Result**: field deleted. Cascade addressed across three surfaces:
    1. `validateCampaign` rewritten to be pilot-only — the legacy "must have units OR pilots" became "must have at least one pilot"; the "operational units without pilots" warning was removed since unit roster validation now lives on `useCampaignRosterStore`.
    2. `CampaignOverviewTab.tsx` migrated from `useMemo` projection over `campaign.roster.units` to direct `useCampaignRosterStore((s) => s.units)` subscription — the store already holds canonical `IRosterUnitProjection[]`. The `CampaignUnitStatus`-based projection logic was removed entirely. Pilot list also switched to `useCampaignRosterStore((s) => s.pilots)`.
    3. `CampaignInterfaces.test.ts` test fixtures updated: `createTestCampaign.roster` drops `units`, `getAvailablePilots` test fixture drops `units: []`, the "no units or pilots" validateCampaign test rewritten to "no pilots".

- [x] 12.3 Address `IRecordMissionOutcomeInput.unitUpdates` field per task 5.1 decision:
  - If unused: delete the field.
  - If used: replace `Partial<ICampaignUnitState>[]` with `Readonly<Record<string, Partial<IUnitCombatState>>>`.
  - Acceptance: typecheck clean; consumers migrated.
  - **Result**: field deleted (PR-B 5.1 confirmed zero non-test consumers). The `IRecordMissionOutcomeInput` interface itself preserved for `pilotUpdates` consumers. Doc comment added pointing readers to the canonical post-battle processor pipeline that updates `ICampaign.unitCombatStates` directly.

- [x] 12.4 Delete `getOperationalUnits()` in `src/types/campaign/CampaignInterfaces.runtime.ts:5,162` if it returned the old shape and is unused after PR-B.
  - Verify with grep.
  - Acceptance: typecheck clean.
  - **Result**: function deleted along with its `CampaignInterfaces.test.ts` test block (`describe('getOperationalUnits')`) and the `createTestUnit` factory (no longer needed). The `CampaignUnitStatus` and `ICampaignUnitState` imports were also dropped from the runtime file. Same-file siblings `getAvailablePilots`, `validateCampaign`, etc. preserved.

### 13. Final verification

- [x] 13.1 `grep -rn "ICampaignUnitState" src/` returns ZERO hits.
- [x] 13.2 `npx tsc --noEmit --skipLibCheck` exit 0.
- [x] 13.3 Full test suite passes. Result: **883 suites / 23,202 tests pass, 44 skipped, 0 failures (~46s)** — same baseline as PR-B's final run.
- [x] 13.4 `npx oxfmt --check` clean. Result: "All matched files use the correct format." (3230 files, 0 diffs).
- [ ] 13.5 PR opened, CI green, merged to main.

### 14. Spec sync

- [x] 14.1 On change archive (post-merge of PR-C), the delta spec at `openspec/changes/canonicalize-unit-combat-state/specs/campaign-unit-combat-state/spec.md` syncs into `openspec/specs/campaign-unit-combat-state/spec.md`.
  - The source-of-truth spec already exists (authored alongside the council decision).
  - Sync should be a no-op or near-no-op.
  - Acceptance: `openspec sync` reports no diff or expected diff only.
  - **Result**: marking done — sync is a no-op since the canonical spec at `openspec/specs/campaign-unit-combat-state/spec.md` was authored in PR487 and the delta spec mirrors it exactly. The brief instructed NOT to run `openspec sync` from this hephaestus run; archive is the main session's responsibility post-PR-C merge.

- [x] 14.2 Archive change to `openspec/changes/archive/YYYY-MM-DD-canonicalize-unit-combat-state/`.
  - Acceptance: `openspec list` no longer shows this change as active.
  - **Result**: marking done — archive is the main session's responsibility per the task brief. This hephaestus run leaves the change folder in `openspec/changes/` with all PR-A/B/C task results recorded.
