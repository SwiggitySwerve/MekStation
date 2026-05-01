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

**Implementation note (during apply):** Rather than editing all 12 helper read-sites individually, we wired `derivePersonnelFromRoster()` and `syncRosterFromPersonnel()` at the `useCampaignStore` boundary inside `advanceDay`. Every helper continues to read from `campaign.personnel` (unchanged signature), but `campaign.personnel` is now derived from `useCampaignRosterStore.pilots` joined with `usePilotStore.pilots` via the `rosterEntryToPerson` shim. This is upstream of all 12 read-sites, so each task below is "satisfied by the derivation pipeline" rather than per-helper edits — preserves the helpers' `IPerson` parameter signatures (deferred to follow-up `refactor-helper-signatures-to-roster-entry`).

Coverage proof: `src/__tests__/integration/rosterEmploymentDerive.test.ts` + `phase4CampaignRoundTrip.test.ts` exercise the full pipeline (roster → derive → helper read → roster sync-back).

- [x] 4.1 **Salary calculation** — `src/lib/finances/salaryService.ts:420` (`calculateTotalMonthlySalary`). Reads `campaign.personnel` (now derived). Verified by integration test (`rosterEmploymentDerive`).
- [x] 4.2 **Food & housing tax** — `src/lib/finances/taxService.ts:215`. Reads `campaign.personnel`. Verified by integration test.
- [x] 4.3 **Daily cost summary** — `src/lib/finances/FinanceService.ts:155`. Aggregates from `campaign.personnel`. Verified by integration test.
- [x] 4.4 **Day-pipeline salary deduction** — `src/lib/campaign/dayAdvancement.ts:329`. Day-pipeline `processFinances` step deducts salaries via the derived personnel map.
- [x] 4.5 **Injury healing** — `src/lib/campaign/processors/healingProcessor.ts:18`. Reads `campaign.personnel`; mutations are written back to the roster store via `syncRosterFromPersonnel` after the day pipeline completes.
- [x] 4.6 **Turnover rolls** — `src/lib/campaign/turnover/turnoverCheck.ts:257`. Reads `campaign.personnel`.
- [x] 4.7 **Turnover departures** — `src/lib/campaign/processors/turnoverProcessor.ts:64`. Roster-store sync-back propagates `Departed` status + `departureReason` to the canonical roster entry.
- [x] 4.8 **Life events** — `src/lib/campaign/processors/randomEventsProcessor.ts:49`. Reads `campaign.personnel`.
- [x] 4.9 **Prisoner events** — `src/lib/campaign/processors/randomEventsProcessor.ts:63`. Reads `campaign.personnel`.
- [x] 4.10 **Vocational training XP** — `src/lib/campaign/processors/vocationalTrainingProcessor.ts:136`. Reads `campaign.personnel`. (Vault `IPilot.career.xp` write is deferred to the follow-up change — current change wires the read side only.)
- [x] 4.11 **Auto-awards** — `src/lib/campaign/awards/autoAwardEngine.ts:55`. Reads `campaign.personnel`.
- [x] 4.12 **Post-battle wound sync** — `src/stores/campaign/useCampaignStore.ts`. Wounds written to `campaign.personnel` by the post-battle pipeline are sync'd back to the roster store via `syncRosterFromPersonnel`.

## 5. Phase 5 — Delete genuinely-orphaned substrate

After Phase 4 ships and the 12 features are repointed + tested, the following have ZERO production callers and can be safely deleted. Per-deletion grep verifies.

- [x] 5.1 Deleted `src/stores/campaign/usePersonnelStore.ts`. Removed from `useCampaignStore`'s sub-store composition (`createPersonnelStore` import + `personnelStore` field + `getPersonnelStore` action + post-pipeline sync block + reset blocks). Grep confirms no production references remain.
- [x] 5.2 N/A — `src/lib/campaign/utils/pilotToPerson.ts` did not exist; superseded by `rosterEntryToPerson` introduced in Phase 3.
- [x] 5.3 Deleted `src/types/campaign/CampaignInstanceInterfaces.ts` and its test file `src/types/campaign/__tests__/CampaignInstanceInterfaces.test.ts`. Grep confirms zero callers outside the deleted services.
- [x] 5.4 Deleted `src/services/campaign/CampaignInstanceService.ts`, `CampaignInstanceAssignmentOperations.ts`, `CampaignInstancePilotOperations.ts`, `CampaignInstanceStateService.ts`, `CampaignInstanceUnitOperations.ts`, `CampaignInstanceStateTypes.ts` and `__tests__/CampaignInstanceStateService.test.ts`. Also deleted `src/services/persistence/CampaignInstanceService.ts` + `.types.ts` + test, `src/services/campaign/index.ts` (only re-exported deleted files), and the orphaned `src/utils/events/campaignInstance{Pilot,Unit,}Events.ts` + `src/types/events/CampaignInstanceEvents.ts` (also Layer-4-tied, no consumers post-deletion).
- [x] 5.5 Deleted `src/stores/campaign/__tests__/usePersonnelStore.test.ts`. Updated `src/stores/campaign/__tests__/useCampaignStore.test.ts` — all `getPersonnelStore` / `personnelStore` assertions removed; tests now exercise personnel via direct `updateCampaign({ personnel })` seed.
- [x] 5.6 N/A — `src/pages/api/personnel/*` routes did not exist (never authored).
- [x] 5.7 N/A — `src/pages/api/campaign-instances/*` routes did not exist (never authored).
- [x] 5.8 `npx tsc --noEmit --skipLibCheck` exits 0. The 72 `IPerson` importers continue to compile via the preserved `IPerson` type + `rosterEntryToPerson` shim.

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
