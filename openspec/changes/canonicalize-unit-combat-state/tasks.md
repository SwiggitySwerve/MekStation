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

- [ ] 5.1 Grep `src/` for consumers of `IRecordMissionOutcomeInput.unitUpdates` (open question #3 from design.md).
  - If zero non-test consumers: delete the field entirely in PR-C.
  - If one or more consumers: replace with `Readonly<Record<string, Partial<IUnitCombatState>>>` shape per design.md decision.
  - Acceptance: decision documented inline; PR-C task plan updated.

### 6. Author IRosterUnitProjection type

- [ ] 6.1 Create `src/types/campaign/RosterUnitProjection.ts` exporting `IRosterUnitProjection` interface and `deriveRosterReadiness(state: IUnitCombatState | undefined)` helper per design.md shape.
  - Field set: `unitId`, `unitName`, `pilotId?`, `chassisVariant`, `readiness`.
  - Add `IUnitMaxState` lookup helper if not already exported.
  - Acceptance: typecheck clean; new exports importable from `@/types/campaign`.
  - QA: `npx tsc --noEmit --skipLibCheck`.

### 7. Migrate useCampaignRosterStore

- [ ] 7.1 Change `useCampaignRosterStore` state from `units: ICampaignUnitState[]` to `units: IRosterUnitProjection[]` in `src/stores/campaign/useCampaignRosterStore.ts:68`.
  - Update `addUnit(unit: IRosterUnitProjection)` (line 88).
  - Update `getUnitsWithReadiness()` return type (line 107).
  - Update `getDeployableUnits()` return type (line 111).
  - Update `unitReadiness(unit: IRosterUnitProjection)` to derive from canonical state via `deriveRosterReadiness`.
  - Acceptance: typecheck clean within store; downstream callers temporarily broken (fixed in tasks 8-9).

- [ ] 7.2 Migrate `applyDamageCarryForward` (line 316-318): instead of spreading `armorDamage`, `structureDamage`, `destroyedComponents` from `ICampaignUnitState`, the function should be deleted or repointed to write into `campaign.unitCombatStates[unitId]` directly.
  - This may move out of the roster store entirely (it's a damage-state operation, not a roster operation).
  - Decision: relocate to `useCampaignStore` or a new `useUnitCombatStateStore` helper.
  - Acceptance: damage carry-forward integration test still passes.
  - QA: `npx jest --testPathPattern='applyDamageCarryForward'`.

### 8. Migrate UI components

- [ ] 8.1 Migrate `src/components/campaign/RosterStateDisplay.tsx` to consume `IRosterUnitProjection`.
  - Change prop type `units: readonly ICampaignUnitState[]` to `units: readonly IRosterUnitProjection[]`.
  - Update `unit.status` reads (lines 47-48, 148) to `unit.readiness`.
  - Acceptance: component renders; storybook story still works.
  - QA: `npx jest src/components/campaign/__tests__/RosterStateDisplay.test.tsx` (if exists); manual storybook check.

- [ ] 8.2 Migrate `src/components/campaign/RosterStateCards.tsx` damage bar to read `currentArmorPerLocation` from canonical state.
  - Add `useShallow` selector per design.md (selector memoization).
  - Subscribe to `useCampaignStore((s) => s.campaign.unitCombatStates[unit.unitId])`.
  - Compute `armorRatio` against `IUnitMaxState.maxArmorPerLocation`.
  - Drop reads of `unit.armorDamage`, `unit.structureDamage`, `unit.destroyedComponents` from projection.
  - Acceptance: damage bar renders correctly at 100%, 50%, 0% for each location; no excess re-renders on unrelated store writes.
  - QA: render-counter test per design.md test strategy; manual visual check.

- [ ] 8.3 Migrate `src/components/gameplay/pages/campaigns/create/CreateCampaignPage.tsx` construct site (lines 14, 135-147) to build `IRosterUnitProjection` instead of full `ICampaignUnitState`.
  - Combat state initialization moves to deploy flow (not campaign-creation flow).
  - Acceptance: campaign-creation flow still produces a valid campaign that can deploy units.
  - QA: `npx jest --testPathPattern='CreateCampaignPage'`.

### 9. Migrate test fixtures

- [ ] 9.1 Update `src/types/campaign/__tests__/CampaignInterfaces.test.ts` `makeUnitState` factory to build `IRosterUnitProjection` (line 11, 36-37).
  - Acceptance: tests pass.
  - QA: `npx jest src/types/campaign/__tests__/CampaignInterfaces.test.ts`.

- [ ] 9.2 Audit any other test fixture files using `ICampaignUnitState` (grep `src/__tests__/` and `src/**/__tests__/` for the type name).
  - Migrate each to `IRosterUnitProjection` or canonical `IUnitCombatState` as appropriate.
  - Acceptance: full test suite passes.
  - QA: `npx jest`.

### 10. PR-B verification

- [ ] 10.1 `npx tsc --noEmit --skipLibCheck` exit 0.
- [ ] 10.2 Full test suite passes (~22.5k tests).
- [ ] 10.3 Storybook builds without errors (`npm run build-storybook`).
- [ ] 10.4 Selector memoization render-counter test passes (no excess re-renders on unrelated store writes).
- [ ] 10.5 `npx oxfmt --check` clean on all changed files.
- [ ] 10.6 PR opened, CI green, merged to main.

---

## PR-C — Delete ICampaignUnitState

### 11. Pre-deletion grep

- [ ] 11.1 `grep -rn "ICampaignUnitState" src/` — record count.
  - Expected: only the type definition site + dead references (if any).
  - Acceptance: count is documented in PR description.

- [ ] 11.2 Re-grep after each task in this PR section.

### 12. Delete the type

- [ ] 12.1 Delete `ICampaignUnitState` interface from `src/types/campaign/CampaignInterfaces.types.ts:113-136`.
  - Acceptance: typecheck clean (any remaining references will surface).
  - QA: `npx tsc --noEmit --skipLibCheck`.

- [ ] 12.2 Delete `ICampaignRoster.units` field from `CampaignInterfaces.types.ts:147` if unused after PR-B.
  - Verify with grep first.
  - Acceptance: typecheck clean.

- [ ] 12.3 Address `IRecordMissionOutcomeInput.unitUpdates` field per task 5.1 decision:
  - If unused: delete the field.
  - If used: replace `Partial<ICampaignUnitState>[]` with `Readonly<Record<string, Partial<IUnitCombatState>>>`.
  - Acceptance: typecheck clean; consumers migrated.

- [ ] 12.4 Delete `getOperationalUnits()` in `src/types/campaign/CampaignInterfaces.runtime.ts:5,162` if it returned the old shape and is unused after PR-B.
  - Verify with grep.
  - Acceptance: typecheck clean.

### 13. Final verification

- [ ] 13.1 `grep -rn "ICampaignUnitState" src/` returns ZERO hits.
- [ ] 13.2 `npx tsc --noEmit --skipLibCheck` exit 0.
- [ ] 13.3 Full test suite passes.
- [ ] 13.4 `npx oxfmt --check` clean.
- [ ] 13.5 PR opened, CI green, merged to main.

### 14. Spec sync

- [ ] 14.1 On change archive (post-merge of PR-C), the delta spec at `openspec/changes/canonicalize-unit-combat-state/specs/campaign-unit-combat-state/spec.md` syncs into `openspec/specs/campaign-unit-combat-state/spec.md`.
  - The source-of-truth spec already exists (authored alongside the council decision).
  - Sync should be a no-op or near-no-op.
  - Acceptance: `openspec sync` reports no diff or expected diff only.

- [ ] 14.2 Archive change to `openspec/changes/archive/YYYY-MM-DD-canonicalize-unit-combat-state/`.
  - Acceptance: `openspec list` no longer shows this change as active.
