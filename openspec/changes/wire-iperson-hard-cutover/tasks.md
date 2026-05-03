# Tasks: Wire IPerson Hard-Cutover

> Council #2 ruling (2026-05-02): ship as 5 sequential PRs.
> Council #4 revision (2026-05-02): insert NEW **PR1.5** before PR2 because PR2 hephaestus surfaced 4 LIVE BUGS in `rosterEntryToPerson` bridge that block clean helper migration. See `openspec/council-decisions/2026-05-02-cluster-E-iperson-contract-revision.md`.
>
> **Revised sequencing**: PR1 (shipped) → **PR1.5 (NEW, schema extension + bridge data integrity)** → PR2 → PR3 → PR4 → PR5. Each PR blocks the next.
>
> **PR1 (already shipped as #486)**: Test fixture migration to `(entry, pilot) → rosterEntryToPerson()` bridge pattern. 33 sites across 6 files. Bridge functions stay alive (PR4 deletes them).
>
> **PR1.5 (NEW per Council #4)**: Fix 4 live bugs in bridge by adding 4 missing fields to `ICampaignRosterEntry` (`primaryRole` required, `traits?` optional, `rankIndex` required, `lastPromotionDate?` optional) + 2 additive Tier 2 fields (`isFounder?`, `isCommander?`). Bridge `rosterEntryToPerson.ts` forwards these instead of synthesizing defaults. Pre-flight commit `b323121b` (injuries field + buildPilotLookup helper) folds in here. ~2 hours.

---

## PR1.5 — Schema extension + bridge data integrity (NEW per Council #4)

### 0. Tier 1 — required field additions (live bug fixes)

- [x] 0.1 Add `primaryRole: CampaignPersonnelRole` (required) to `src/types/campaign/CampaignRosterEntry.ts`. Existing rows defaulted to `PILOT` in `useCampaignStore.deserializeCampaign` migration path.
  - Acceptance: typecheck clean; deserialize backward-compatible.
  - QA: `npx jest --testPathPattern='useCampaignStore'`.

- [x] 0.2 Add `traits?: IPersonTraits` (optional) to `ICampaignRosterEntry`. Import `IPersonTraits` from `src/types/campaign/Person.ts`.
  - Acceptance: typecheck clean.

- [x] 0.3 Add `rankIndex: number` (required) to `ICampaignRosterEntry`. Existing rows defaulted to `0` in deserialize migration.
  - Acceptance: typecheck clean; deserialize backward-compatible.

- [x] 0.4 Add `lastPromotionDate?: Date` (optional) to `ICampaignRosterEntry`.
  - Acceptance: typecheck clean.

### 0.5 Tier 2 — additive optional fields (no production write path today)

- [x] 0.5.1 Add `isFounder?: boolean` (optional) to `ICampaignRosterEntry`.
- [x] 0.5.2 Add `isCommander?: boolean` (optional) to `ICampaignRosterEntry`.

### 0.6 Bridge update — forward instead of synthesize

- [x] 0.6.1 Update `src/lib/campaign/utils/rosterEntryToPerson.ts:164` to forward `primaryRole: entry.primaryRole` (drop hardcoded `PILOT`).
- [x] 0.6.2 Update bridge to forward `traits: entry.traits ?? {}` (currently omitted).
- [x] 0.6.3 Update bridge line 168 to forward `rankIndex: entry.rankIndex` (drop hardcoded 0).
- [x] 0.6.4 Add `lastPromotionDate: entry.lastPromotionDate` to bridge return block (currently omitted).
- [x] 0.6.5 Add `isFounder: entry.isFounder` and `isCommander: entry.isCommander` to bridge return.
- [x] 0.6.6 Update bridge tests in `src/lib/campaign/utils/__tests__/rosterEntryToPerson.test.ts` to cover the new forward paths.

### 0.7 Regression verification (live bug fixes)

- [x] 0.7.1 Run `npx jest src/lib/finances/__tests__/salaryService.test.ts` — confirm non-PILOT fixtures (DOCTOR/TECH/MEK_TECH/SOLDIER/DEPENDENT at lines 340/349/358/367/454/657/666) now produce correct salary categorization.
- [x] 0.7.2 Run `npx jest src/lib/campaign/medical/__tests__/doctorCapacity.test.ts` — confirm `getBestAvailableDoctor` returns DOCTOR roster entries.
- [x] 0.7.3 Run `npx jest src/lib/campaign/ranks/__tests__/rankService.test.ts` — confirm promotion logic accepts non-zero rank inputs.
- [x] 0.7.4 Run `npx jest src/lib/campaign/__tests__/aging.test.ts` and `src/lib/campaign/processors/__tests__/vocationalTrainingProcessor.test.ts` — confirm trait accumulation persists across passes.

### 0.8 PR1.5 verification

- [x] 0.8.1 `npx tsc --noEmit --skipLibCheck` exit 0.
- [x] 0.8.2 Full test suite passes (~22.5k tests).
- [x] 0.8.3 `npx oxfmt --check` clean.
- [x] 0.8.4 PR opened, CI green, merged.
- [x] 0.8.5 Branch `chore/cluster-e-pr2-helper-signatures` (containing pre-flight commit `b323121b`: injuries field + buildPilotLookup) is folded into PR1.5 via cherry-pick or rebase.

---

## PR2 — Helper signature migration

> **REVISED PER COUNCIL #4**: PR1.5 ships first. Bridge now forwards correct values, so helpers can safely migrate without losing test scenario coverage. The 4 live bugs (primaryRole/traits/rankIndex/lastPromotionDate) are FIXED by PR1.5 — PR2 just continues the planned helper signature migration.

### 1. Pre-flight: open question #1 verification (subsumed by PR1.5)

- [x] 1.1 Verify `ICampaignRosterEntry.injuries` field existence (open question from Council #2).
  - If absent: add `readonly injuries?: readonly IInjury[]` to `ICampaignRosterEntry` in `src/types/campaign/CampaignRosterEntry.ts` BEFORE the medical commit.
  - Acceptance: typecheck clean; type imports resolve.
  - QA: `npx tsc --noEmit --skipLibCheck`.

- [x] 1.2 Verify pre-join template helpers exist or author them.
  - Helper: `buildPilotLookup(vault: IPilot[]): Map<string, IPilot>` in `src/lib/campaign/utils/pilotLookup.ts` (new file).
  - Acceptance: helper covered by unit test; importable from `@/lib/campaign/utils/pilotLookup`.

### 2. Per-domain commits (each commit independently buildable + tested)

- [x] 2.1 **Medical commit** (7 files in `src/lib/campaign/medical/`).
  - Migrate every helper signature from `(person: IPerson)` to `(entry: ICampaignRosterEntry, pilot: IPilot | null)`.
  - NPC behavior: PROCESS (NPCs heal too).
  - Update all callers in same commit.
  - Acceptance: all medical tests pass; NPC handling JSDoc added.
  - QA: `npx jest --testPathPattern='medical'`.

- [x] 2.2 **Turnover commit** (5 files in `src/lib/campaign/turnover/` + `ranks/rankService.isOfficer` cross-call).
  - Same signature migration.
  - NPC behavior: PROCESS for departure rolls; SKIP for officer status.
  - Acceptance: turnover tests pass.
  - QA: `npx jest --testPathPattern='turnover'`.

- [x] 2.3 **Finances commit** (`statusRules` + 3 finance services in `src/lib/finances/`: `salaryService`, `taxService`, `FinanceService`).
  - NPC behavior: PROCESS (salary/tax apply to all roster entries).
  - Acceptance: finances tests pass.
  - QA: `npx jest --testPathPattern='(finances|statusRules)'`.

- [ ] 2.4 **Progression + skills commit** (4 progression files + 3 skills files in `src/lib/campaign/`).
  - NPC behavior: SKIP (`pilot === null` early-return).
  - Use delta-return pattern per design.md decision.
  - Acceptance: progression + skills tests pass.
  - QA: `npx jest --testPathPattern='(progression|skills)'`.
  - **2.4a (skills only, SHIPPED)**: `skillHelpers.ts`, `skillCheck.ts`, `skillProgression.ts` + their 3 test files migrated and pushed to `chore/cluster-e-pr2-helper-migration`. 247/247 tests pass. Progression files (`src/lib/campaign/progression/`) remain for 2.4b.

- [ ] 2.5 **Awards commit** (2 files, ~18 checker functions in `src/lib/campaign/awards/`).
  - NPC behavior: SKIP all checker functions on `pilot === null`.
  - Acceptance: awards tests pass.
  - QA: `npx jest --testPathPattern='awards'`.

- [ ] 2.6 **Ranks + maintenance + events commit** (mixed files in `src/lib/campaign/`).
  - NPC behavior per design.md NPC matrix.
  - Acceptance: ranks/maintenance/events tests pass.
  - QA: `npx jest --testPathPattern='(ranks|maintenance|events)'`.

- [ ] 2.7 **Type-layer helpers commit** (4 helpers in `src/types/campaign/Campaign.ts:147,163,180,300`).
  - These are the cross-cutting type-guards / accessor helpers.
  - Acceptance: typecheck clean.
  - QA: `npx tsc --noEmit --skipLibCheck`.

### 3. PR2 verification

- [ ] 3.1 `npx tsc --noEmit --skipLibCheck` exit 0.
- [ ] 3.2 Full test suite (~22.5k tests) passes.
- [ ] 3.3 Lint gate: grep `vault\.find\b` in `src/lib/campaign/` and `src/lib/finances/` → ZERO hits in non-test files (helpers must use pre-join template).
- [ ] 3.4 `npx oxfmt --check` clean.
- [ ] 3.5 PR opened, CI green, merged.

---

## PR3 — Atomic processor + dayAdvancement repointing

### 4. Open question #1 (PR3) verification

- [ ] 4.1 Audit `dayAdvancement.ts:425-452` chain for implicit data dependency on `campaign.personnel` mid-chain.
  - Read each of the 6 processors: does processor N read what processor N-1 wrote into `personnel`?
  - Acceptance: dependency map documented inline as a comment in `dayAdvancement.ts`. If a true dependency exists, design.md needs revision.

### 5. Atomic repointing

- [ ] 5.1 Update `src/lib/campaign/dayAdvancement.ts` to:
  - Pre-build `pilotsByPilotId` map at entry.
  - Pass entries + pre-resolved pilots to each processor (NOT `campaign.personnel`).
  - Acceptance: typecheck clean; processors accept new input shape.

- [ ] 5.2 Update each of the 6 processors to read from `(entry, pilot | null)` instead of `campaign.personnel`:
  - `src/lib/campaign/processors/healingProcessor.ts`
  - `src/lib/campaign/processors/autoAwardsProcessor.ts`
  - `src/lib/campaign/processors/vocationalTrainingProcessor.ts`
  - `src/lib/campaign/processors/turnoverProcessor.ts`
  - `src/lib/campaign/processors/randomEventsProcessor.ts`
  - `src/lib/campaign/processors/postBattleProcessor.ts`
  - Each commit per processor (within ONE PR for atomicity per Council #2 ruling).
  - Acceptance: per-processor tests pass after each commit.
  - QA: `npx jest --testPathPattern='<processor>'`.

- [ ] 5.3 Update 4 type-layer helpers in `src/types/campaign/Campaign.ts` (lines 147, 163, 180, 300) to NOT read from `campaign.personnel`.
  - Acceptance: typecheck clean.

- [ ] 5.4 Update 2 UI `.size` readers:
  - `src/pages/campaigns/index.tsx:46` — replace `campaign.personnel.size` with `useCampaignRosterStore((s) => s.pilots.length)`.
  - `src/components/CampaignDashboardPage.sections.tsx:157` — same migration.
  - Acceptance: components render; counts match.
  - QA: storybook smoke test for both.

- [ ] 5.5 Audit `autoAwardEngine.ts:55` and `turnoverCheck.ts:257` (other `campaign.personnel` readers per Council #2 finding).
  - Migrate to read from stores.
  - Acceptance: tests pass.

### 6. PR3 verification

- [ ] 6.1 `npx tsc --noEmit --skipLibCheck` exit 0.
- [ ] 6.2 Integration round-trip tests pass: `phase3RoundTrip.test.ts`, `phase4CampaignRoundTrip.test.ts`.
- [ ] 6.3 `dayAdvancement.test.ts` and `dayPipeline.test.ts` produce identical outputs vs pre-PR3 baseline.
- [ ] 6.4 Bridge functions still alive (deletion is PR4's job).
- [ ] 6.5 Production code grep: zero hits for `campaign.personnel` in `src/` excluding `useCampaignStore.ts` (where bridge functions live).
- [ ] 6.6 PR opened, CI green, merged.

---

## PR4 — Map drop + lossy bug fix

### 7. Bridge function deletion

- [ ] 7.1 Delete `derivePersonnelFromRoster` function from `src/stores/campaign/useCampaignStore.ts:311`.
  - Acceptance: typecheck surfaces any remaining callers.

- [ ] 7.2 Delete `syncRosterFromPersonnel` function from `src/stores/campaign/useCampaignStore.ts:343-351`.
  - This is the lossy Critical→Wounded round-trip bug location.
  - Acceptance: typecheck clean.

- [ ] 7.3 Delete legacy preservation merge at `src/stores/campaign/useCampaignStore.ts:743-750`.
  - Acceptance: typecheck clean.

### 8. ICampaign.personnel field removal

- [ ] 8.1 Delete `personnel: Map<string, IPerson>` field from `ICampaign` interface.
  - Location: search `src/types/campaign/Campaign.ts` for the field.
  - Acceptance: typecheck surfaces all factories that initialize the field.

- [ ] 8.2 Update all factories to drop `personnel: new Map()` initialization:
  - `src/stores/campaign/useCampaignStore.ts` (deserialize / loadCampaign / merge / createCampaign).
  - Any helper that constructs an `ICampaign` literal.
  - Acceptance: typecheck clean.

- [ ] 8.3 Delete `personnel` check from `isCampaign()` type guard at `src/types/campaign/Campaign.ts:163`.
  - Acceptance: type guard still discriminates correctly via remaining fields.

### 9. Lossy bug regression test

- [ ] 9.1 Add a regression test that confirms the Critical→Wounded round-trip is fixed.
  - Test: create a roster pilot with `CampaignPilotStatus.Critical`, save campaign, reload, confirm status is still `Critical`.
  - Acceptance: test passes (would have failed pre-PR4 with the bug).
  - QA: `npx jest --testPathPattern='criticalRoundTrip'` (new test file).

### 10. PR4 verification

- [ ] 10.1 `npx tsc --noEmit --skipLibCheck` exit 0.
- [ ] 10.2 Full test suite passes (~22.5k tests).
- [ ] 10.3 Critical→Wounded regression test passes.
- [ ] 10.4 Grep `derivePersonnelFromRoster|syncRosterFromPersonnel` in `src/` returns ZERO hits.
- [ ] 10.5 Grep `\.personnel\b` in `src/types/campaign/Campaign.ts` returns ZERO hits.
- [ ] 10.6 `npx oxfmt --check` clean.
- [ ] 10.7 PR opened, CI green, merged.

---

## PR5 — IPerson interface + shim deletion

### 11. Pre-deletion grep + audit

- [ ] 11.1 `grep -rn "IPerson\b" src/` — record count.
  - Expected: only `src/types/campaign/Person.ts` (definition) + `src/lib/campaign/utils/rosterEntryToPerson.ts` (shim) + their tests.
  - Acceptance: count matches expectation.

- [ ] 11.2 `grep -rn "rosterEntryToPerson" src/` — confirm only the shim file + its tests reference it.

### 12. Delete IPerson + shim

- [ ] 12.1 Delete `IPerson` interface and related types from `src/types/campaign/Person.ts`.
  - May need to keep `IInjury` if referenced elsewhere — verify with grep.
  - Acceptance: typecheck clean.

- [ ] 12.2 Delete `src/lib/campaign/utils/rosterEntryToPerson.ts` shim file.
  - Acceptance: typecheck clean.

- [ ] 12.3 Delete `src/lib/campaign/utils/__tests__/rosterEntryToPerson.test.ts` (or wherever the shim tests live).
  - Acceptance: jest still discovers other tests.

### 13. Final verification

- [ ] 13.1 `grep -rn "IPerson\b" src/` returns ZERO hits.
- [ ] 13.2 `grep -rn "rosterEntryToPerson" src/` returns ZERO hits.
- [ ] 13.3 `npx tsc --noEmit --skipLibCheck` exit 0.
- [ ] 13.4 Full test suite passes.
- [ ] 13.5 `npx oxfmt --check` clean.
- [ ] 13.6 PR opened, CI green, merged.

### 14. Spec sync + archive

- [ ] 14.1 On change archive (post-merge of PR5), the delta spec syncs into `openspec/specs/campaign-personnel-architecture/spec.md`.
  - The source-of-truth spec already exists.
  - Sync should be a no-op or near-no-op.
  - Acceptance: `openspec sync` reports no diff or expected diff only.

- [ ] 14.2 Update `openspec/specs/personnel-management/spec.md` to reference `IPilot` + `ICampaignRosterEntry` instead of legacy `IPerson` (if any references remain).
  - Acceptance: personnel-management spec is internally consistent post-cutover.

- [ ] 14.3 Archive change to `openspec/changes/archive/YYYY-MM-DD-wire-iperson-hard-cutover/`.
  - Acceptance: `openspec list` no longer shows this change as active.
