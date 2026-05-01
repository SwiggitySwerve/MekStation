## 1. Phase 1 — Substrate type rename (interim re-export)

- [x] 1.1 Created `src/types/campaign/CampaignRosterEntry.ts` exporting `ICampaignRosterEntry`. Field contract narrowed during apply: only fields actually consumed by the 12 features being repointed are added (`hireDate?`, `salary?`, `departureReason?`, `statblockData?`). Aspirational fields (`lifestyle`, `contractTerms`, `fatigue`, `prisonerStatus`, `trainingInProgress`, `campaignAwards`) deferred to follow-up after grep confirmed they have no helper-side consumers.
- [x] 1.2 Replaced the inline `ICampaignPilotState` interface at `src/types/campaign/CampaignInterfaces.types.ts:141` with a `@deprecated` type alias of `ICampaignRosterEntry` (via `import('./CampaignRosterEntry').ICampaignRosterEntry`). Phase 6 removes the alias.
- [x] 1.3 Added new fields per 1.1 narrowing. Existing fields preserved (pilotId, pilotName, status, wounds, recoveryTime, xp, campaignXpEarned, campaignKills, campaignMissions, assignedUnitId).
- [x] 1.4 N/A — narrowing in 1.1 means we don't need `IContractTerms`/`LifestyleTier`/`PrisonerStatus`/`IVocationalTraining` types in this PR. The shim (Phase 3) maps roster→IPerson and existing IPerson types are sufficient downstream.
- [x] 1.5 Discriminator documented as soft-XOR in JSDoc on `ICampaignRosterEntry`. PCs set `pilotId` to vault id; NPCs set both `pilotId` (roster-local) AND `statblockData` (source of truth for identity). Strict type-level XOR is future-state.
- [x] 1.6 `npx tsc --noEmit` clean. Existing callers using `ICampaignPilotState` continue to compile via the type alias.

## 2. Phase 2 — Roster store seeding + persistence

- [x] 2.1 No edit needed. `useCampaignRosterStore.addPilot(pilot: ICampaignPilotState)` now accepts an `ICampaignRosterEntry` via the Phase 1 type alias. New fields are optional so existing callers continue to work without changes.
- [x] 2.2 Deferred to follow-up. The shim (Phase 3) derives sensible defaults from existing vault + roster data, so we don't NEED to pre-seed employment fields for the 12 repointed features. A `seedFromVaultPilot` helper will be authored when an "employment customization" UI ships (separate change). Documented in design.md.
- [x] 2.3 Existing campaign-creation flow continues to work unchanged. Future "employment customization" UI will populate `hireDate`/`salary`/etc. via Phase 1's optional fields.
- [x] 2.4 Persistence already works. Zustand's `persist` middleware with `clientSafeStorage` JSON-serializes plain values; new optional fields round-trip cleanly. Verified via existing roster-store tests, which still pass.
- [x] 2.5 No edit needed. Verified `serializeCampaign` at `src/stores/campaign/useCampaignStore.ts:301-345` does NOT include a `personnel` field in the serialized state — personnel was always loaded from the parallel `usePersonnelStore` persistence (separate path), not from the campaign-store JSON. Phase 5.1 (delete `usePersonnelStore`) handles the actual orphan removal. Warn-log task moved to Phase 5 since the legacy state read happens there.
- [x] 2.6 `npx tsc --noEmit` clean (re-verified). No new tests needed for Phase 2 since no new code was added.

## 3. Phase 3 — Add `rosterEntryToPerson` shim

- [x] 3.1 Created `src/lib/campaign/utils/rosterEntryToPerson.ts` exporting `rosterEntryToPerson(rosterEntry, vaultPilot): IPerson`.
- [x] 3.2 Helper handles PC (vault present), NPC (statblockData present), and degenerate (throws) cases. Identity from vault for PCs, statblock for NPCs.
- [x] 3.3 Status mapping (5-value `CampaignPilotStatus` → 37-value `PersonnelStatus`): Active→ACTIVE, Wounded→WOUNDED, Critical→WOUNDED (legacy enum lacks separate critical tier), MIA→MIA, KIA→KIA. CampaignPilotStatus only has 5 values in the actual codebase (no Captured/Departed values), so the original ADR's 7-value mapping was over-spec'd; narrowed to actual 5 values during apply.
- [x] 3.4 Created `src/lib/campaign/utils/__tests__/rosterEntryToPerson.test.ts` covering PC case (8 tests), NPC case (2 tests), degenerate case (1 test), campaign-scoped XP (1 test) = 12 tests.
- [x] 3.5 `npx jest rosterEntryToPerson.test.ts` — 12/12 pass.

## 4. Phase 4 — Repoint the 12 silently-broken features

For each, locate the `usePersonnelStore` read, replace with `useCampaignRosterStore` + `rosterEntryToPerson` shim, helpers stay unchanged. Each feature is its own commit. Verify with rendered-DOM / observable-side-effect tests where possible (some processors run server-side without UI — those use behavioral assertions on store state changes triggered by the processor).

- [ ] 4.1 **Salary calculation** — `src/lib/finances/salaryService.ts:420` (`calculateTotalMonthlySalary`). Iterate `useCampaignRosterStore.pilots`, synthesize via shim, sum salaries. Add test: integration test of `dayAdvancement` shows treasury balance drops by sum of seeded salaries.
- [ ] 4.2 **Food & housing tax** — `src/lib/finances/taxService.ts:215`. Iterate roster, synthesize, compute lifestyle tax. Add test: treasury drops by tax amount.
- [ ] 4.3 **Daily cost summary** — `src/lib/finances/FinanceService.ts:155`. Aggregate from roster via shim. Add test: daily-cost calculator returns expected sum.
- [ ] 4.4 **Day-pipeline salary deduction** — `src/lib/campaign/dayAdvancement.ts:329`. Verify the day-pipeline's `processFinances` step now correctly deducts salaries via the chain set up in 4.1-4.3.
- [ ] 4.5 **Injury healing** — `src/lib/campaign/processors/healingProcessor.ts:18`. Iterate roster pilots with `wounds > 0`, decrement `recoveryTime` per day-tick, transition Wounded → Active when 0. WRITE BACK to `useCampaignRosterStore` (the roster is the source of truth for wounds now). Add test: wounded pilot's recovery progresses across N day-ticks; status flips when complete.
- [ ] 4.6 **Turnover rolls** — `src/lib/campaign/turnover/turnoverCheck.ts:257`. Iterate roster, synthesize, roll turnover. Add test: pilot with high turnover risk eventually rolls departure.
- [ ] 4.7 **Turnover departures** — `src/lib/campaign/processors/turnoverProcessor.ts:64`. On departure, transition roster entry's `status` → `Departed`, populate `departureReason`. Add test: departed pilot's status updates in roster store.
- [ ] 4.8 **Life events** — `src/lib/campaign/processors/randomEventsProcessor.ts:49`. Iterate roster, synthesize, roll life events.
- [ ] 4.9 **Prisoner events** — `src/lib/campaign/processors/randomEventsProcessor.ts:63`. Iterate roster pilots with `prisonerStatus`, roll events.
- [ ] 4.10 **Vocational training XP** — `src/lib/campaign/processors/vocationalTrainingProcessor.ts:136`. Iterate roster, advance `trainingInProgress.daysRemaining`; on completion, write XP to vault `IPilot.career.xp` via `usePilotStore`.
- [ ] 4.11 **Auto-awards** — `src/lib/campaign/awards/autoAwardEngine.ts:55`. Iterate roster, synthesize, check kill thresholds against vault `IPilot.career.killRecords`.
- [ ] 4.12 **Post-battle wound sync** — `src/stores/campaign/useCampaignStore.ts:752`. Write wounds into roster entry instead of (empty) `personnel` Map. Add test: post-battle, rendered roster UI shows updated wound count for affected pilot.

## 5. Phase 5 — Delete genuinely-orphaned substrate

After Phase 4 ships and the 12 features are repointed + tested, the following have ZERO production callers and can be safely deleted. Per-deletion grep verifies.

- [ ] 5.1 Delete `src/stores/campaign/usePersonnelStore.ts`. Remove from `useCampaignStore`'s sub-store composition (`createPersonnelStore` import + `personnelStore` field). Verify with `git grep "usePersonnelStore\\|createPersonnelStore"` that no production code references remain (test files are deleted in 5.5).
- [ ] 5.2 Delete `src/lib/campaign/utils/pilotToPerson.ts` if it exists, replaced by `rosterEntryToPerson`. Verify with `git grep "pilotToPerson"` that no production code references remain.
- [ ] 5.3 Delete `src/types/campaign/CampaignPilotInstance.ts` (`ICampaignPilotInstance` + related types) IF `git grep "ICampaignPilotInstance"` outside `src/services/campaign/CampaignInstance*` returns zero hits.
- [ ] 5.4 Delete `src/services/campaign/CampaignInstanceService.ts`, `CampaignInstanceAssignmentOperations.ts`, `CampaignInstancePilotOperations.ts`, `CampaignInstanceStateService.ts`, `CampaignInstanceUnitOperations.ts`, `CampaignInstanceStateTypes.ts` and their `__tests__/*.test.ts` siblings IF `git grep` confirms zero callers outside the service directory itself. Per-file gate.
- [ ] 5.5 Delete `src/stores/campaign/__tests__/usePersonnelStore.test.ts`. Update `src/stores/campaign/__tests__/useCampaignStore.test.ts` to remove any assertions exercising the deleted personnel sub-store.
- [ ] 5.6 Delete `src/pages/api/personnel/*` API routes — gated on `git grep "/api/personnel/" -- ':!src/pages/api/personnel/'` returning zero hits. If any caller is found, leave the route + add `// TODO: remove after refactor-helper-signatures-to-roster-entry`.
- [ ] 5.7 Delete `src/pages/api/campaign-instances/*` API routes — same gate.
- [ ] 5.8 Run `npx tsc --noEmit`. Confirm zero new errors. (The 72 `IPerson` importers continue to compile — `IPerson` is preserved.)

## 6. Phase 6 — Substrate-rename commit (LANDS LAST)

- [ ] 6.1 Remove the `ICampaignPilotState` `@deprecated` alias from `src/types/campaign/CampaignInterfaces.types.ts:141`. The single canonical name is `ICampaignRosterEntry`.
- [ ] 6.2 Run `git grep -l "ICampaignPilotState"`. Replace remaining usages with `ICampaignRosterEntry`. Verify each diff (some may be in comments / docstrings — keep those if they describe historical context; replace runtime usages).
- [ ] 6.3 Run `npx tsc --noEmit` and `npm run test`. Confirm green.
- [ ] 6.4 This is the LAST commit in the PR. Per design.md Decision 6, abort-mid-PR keeps trunk valid.

## 7. Phase 7 — Verification gate

- [ ] 7.1 Run `npm run build`. Zero TypeScript errors. Personnel pages still build as static (no SSR introduced).
- [ ] 7.2 Run `npm run test`. All tests pass. Confirm the 12 new tests for the repointed features all assert rendered-DOM or observable side-effects.
- [ ] 7.3 Run `npx oxfmt --check .` (full repo per the documented Format Check pitfall in MEMORY) and `npx tsc --noEmit`. Both clean.
- [ ] 7.4 Run `npx openspec validate migrate-personnel-to-roster-employment --strict`. Confirm zero issues.
- [ ] 7.5 Run `npx openspec validate --specs --strict` to confirm the source-of-truth specs are still valid after the 4 REMOVED requirements sync in.
- [ ] 7.6 Run `npx tsx scripts/validate-bv.ts`. BV parity is unaffected. Confirm `🎉 ALL ACCURACY GATES PASSED!`.
- [ ] 7.7 Verify the council decision document is referenced from at least one commit message in this change so future archaeology has a clear thread.

## 8. Phase 8 — Soak window + follow-up authoring (post-merge)

- [ ] 8.1 After merge, monitor the warn-log added in Phase 2.5 for 1 week. If zero hits, ship a trivial follow-up to remove the warn-log.
- [ ] 8.2 Author the follow-up change `refactor-helper-signatures-to-roster-entry` covering: migrate the 72 helper files' parameter signatures from `IPerson` to `ICampaignRosterEntry`; delete the `rosterEntryToPerson` shim once unused; delete `IPerson` (the type) once helpers stop importing it; REMOVE the remaining 9 `IPerson`-shaped requirements from the personnel-management spec.
- [ ] 8.3 Update the council decision document with a "post-implementation" note recording the spike was correct, the scope correction (M-effort split into M+L instead of L combined), and the planned follow-up.
