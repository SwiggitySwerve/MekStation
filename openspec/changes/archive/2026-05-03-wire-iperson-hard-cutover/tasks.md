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

- [x] 2.4 **Progression + skills commit** (4 progression files + 3 skills files in `src/lib/campaign/`).
  - NPC behavior: SKIP (`pilot === null` early-return).
  - Use delta-return pattern per design.md decision.
  - Acceptance: progression + skills tests pass.
  - QA: `npx jest --testPathPattern='(progression|skills)'`.
  - **2.4a (skills only, SHIPPED)**: `skillHelpers.ts`, `skillCheck.ts`, `skillProgression.ts` + their 3 test files migrated and pushed to `chore/cluster-e-pr2-helper-migration`. 247/247 tests pass. Progression files (`src/lib/campaign/progression/`) remain for 2.4b.
  - **2.4b (progression, SHIPPED)**: `xpAwards.ts`, `aging.ts`, `skillCostTraits.ts`, `spaAcquisition.ts` + their 4 test files migrated to two-arg `(entry, pilot | null)` + delta-return pattern. `IAgingEvent` moved to `progressionTypes.ts`. 136/136 progression tests pass.

- [x] 2.5 **Awards commit** (2 files, ~18 checker functions in `src/lib/campaign/awards/`).
  - NPC behavior: SKIP all checker functions on `pilot === null`.
  - Acceptance: awards tests pass.
  - QA: `npx jest --testPathPattern='awards'`.
  - SHIPPED as `4551e3ad` on `chore/cluster-e-pr2-helper-migration`. 203 awards tests + 23,190 full suite pass. `getEligiblePersonnel` now returns `ReadonlyArray<{entry, pilot}>` instead of `IPerson[]`.

- [x] 2.6 **Ranks + maintenance + events commit** (mixed files in `src/lib/campaign/`).
  - NPC behavior per design.md NPC matrix.
  - Acceptance: ranks/maintenance/events tests pass.
  - QA: `npx jest --testPathPattern='(ranks|maintenance|events)'`.

- [x] 2.7 **Type-layer helpers commit** (4 helpers in `src/types/campaign/Campaign.ts:147,163,180,300`).
  - These are the cross-cutting type-guards / accessor helpers.
  - Acceptance: typecheck clean.
  - QA: `npx tsc --noEmit --skipLibCheck`.

### 3. PR2 verification

- [x] 3.1 `npx tsc --noEmit --skipLibCheck` exit 0. Verified at PR2 CI.
- [x] 3.2 Full test suite (~22.5k tests) passes. Verified at PR2 CI.
- [x] 3.3 Lint gate: grep `vault\.find\b` in `src/lib/campaign/` and `src/lib/finances/` → ZERO hits in non-test files (helpers must use pre-join template). Verified.
- [x] 3.4 `npx oxfmt --check` clean. Verified at PR2 CI.
- [x] 3.5 PR opened, CI green, merged. PR #496, merged at `4bfb6778` on 2026-05-02.

---

## PR3 — Atomic processor + dayAdvancement repointing

### 4. Open question #1 (PR3) verification

- [x] 4.1 Audit `dayAdvancement.ts:425-452` chain for implicit data dependency on `campaign.personnel` mid-chain.
  - Read each of the 6 processors: does processor N read what processor N-1 wrote into `personnel`?
  - Acceptance: dependency map documented inline as a comment in `dayAdvancement.ts`. If a true dependency exists, design.md needs revision.
  - SHIPPED in commit `5301d4e8`. Conclusion: no inter-processor `personnel` dependencies — safe to pre-build entries+pilots once at entry.

### 5. Atomic repointing

- [x] 5.1 Update `src/lib/campaign/dayAdvancement.ts` to:
  - Pre-build `pilotsByPilotId` map at entry.
  - Pass entries + pre-resolved pilots to each processor (NOT `campaign.personnel`).
  - Acceptance: typecheck clean; processors accept new input shape.

- [x] 5.2 Update each of the 6 processors to read from `(entry, pilot | null)` instead of `campaign.personnel`:
  - `src/lib/campaign/processors/healingProcessor.ts`
  - `src/lib/campaign/processors/autoAwardsProcessor.ts`
  - `src/lib/campaign/processors/vocationalTrainingProcessor.ts`
  - `src/lib/campaign/processors/turnoverProcessor.ts`
  - `src/lib/campaign/processors/randomEventsProcessor.ts`
  - `src/lib/campaign/processors/postBattleProcessor.ts`
  - All 6 processors now `useCampaignRosterStore.getState().pilots` first; fall back to `Array.from(campaign.personnel.values()).map(personToMinimalEntry)` when stores empty (transitional, deletable in PR4 when `campaign.personnel` field is removed).
  - Shared `personToMinimalEntry` extracted to `src/lib/campaign/utils/personToRosterEntry.ts`.

- [x] 5.3 Update 4 type-layer helpers in `src/types/campaign/Campaign.ts`.
  - PR2 commit 2.7 already deleted the 3 `IPerson`-returning helpers (`getActivePersonnel`, `getPersonnelByStatus`, `getPersonById`). `getTotalPersonnel` remains but has zero callers — left in place pending PR4 atomic field removal.

- [x] 5.4 Update 2 UI `.size` readers:
  - `src/pages/gameplay/campaigns/index.tsx:46` — now reads `useCampaignRosterStore((s) => s.pilots.length)` with legacy `campaign.personnel.size` fallback.
  - `src/components/gameplay/pages/campaigns/dashboard/CampaignDashboardPage.sections.tsx:161` — same migration.

- [x] 5.5 Audit `autoAwardEngine.ts` and `turnoverCheck.ts` for `campaign.personnel` readers.
  - autoAwardEngine: now reads from store + fallback (commit a50b10af block).
  - turnoverCheck: zero `campaign.personnel` references — clean.

### 6. PR3 verification

- [x] 6.1 `npx tsc --noEmit --skipLibCheck` exit 0.
- [x] 6.2 Integration round-trip tests pass: `phase3RoundTrip.test.ts`, `phase4CampaignRoundTrip.test.ts`.
- [x] 6.3 `dayAdvancement.test.ts` and `dayPipeline.test.ts` produce identical outputs vs pre-PR3 baseline.
- [x] 6.4 Bridge functions still alive (deletion is PR4's job).
- [x] 6.5 Production code grep: zero hits for `campaign.personnel` in `src/` outside `useCampaignStore.ts`, `rosterEntryToPerson.ts`, and the 6 processor + dayAdvancement transitional fallbacks (each tagged `PR3 transitional` / deletable in PR4).
- [x] 6.6 PR opened, CI green, merged. PR #497, merged at `ed067640` on 2026-05-03.

---

## PR4 — Map drop + lossy bug fix

### 7. Bridge function deletion

- [x] 7.1 Delete `derivePersonnelFromRoster` function from `src/stores/campaign/useCampaignStore.ts:311`.
  - Acceptance: typecheck surfaces any remaining callers.

- [x] 7.2 Delete `syncRosterFromPersonnel` function from `src/stores/campaign/useCampaignStore.ts:343-351`.
  - This is the lossy Critical→Wounded round-trip bug location.
  - Acceptance: typecheck clean.

- [x] 7.3 Delete legacy preservation merge at `src/stores/campaign/useCampaignStore.ts:743-750`.
  - Acceptance: typecheck clean.

### 8. ICampaign.personnel field removal

- [x] 8.1 Delete `personnel: Map<string, IPerson>` field from `ICampaign` interface.
  - Location: search `src/types/campaign/Campaign.ts` for the field.
  - Acceptance: typecheck surfaces all factories that initialize the field.

- [x] 8.2 Update all factories to drop `personnel: new Map()` initialization:
  - `src/stores/campaign/useCampaignStore.ts` (deserialize / loadCampaign / merge / createCampaign).
  - Any helper that constructs an `ICampaign` literal.
  - Acceptance: typecheck clean.

- [x] 8.3 Delete `personnel` check from `isCampaign()` type guard at `src/types/campaign/Campaign.ts:163`.
  - Acceptance: type guard still discriminates correctly via remaining fields.

### 9. Lossy bug regression test

- [x] 9.1 Add a regression test that confirms the Critical→Wounded round-trip is fixed.
  - Test: create a roster pilot with `CampaignPilotStatus.Critical`, save campaign, reload, confirm status is still `Critical`.
  - Acceptance: test passes (would have failed pre-PR4 with the bug).
  - QA: `npx jest --testPathPattern='criticalRoundTrip'` (new test file).

### 10. PR4 verification

- [x] 10.1 `npx tsc --noEmit --skipLibCheck` exit 0.
- [x] 10.2 Full test suite passes (~22.5k tests).
- [x] 10.3 Critical→Wounded regression test passes.
- [x] 10.4 Grep `derivePersonnelFromRoster|syncRosterFromPersonnel` in `src/` returns ZERO hits.
- [x] 10.5 Grep `\.personnel\b` in `src/types/campaign/Campaign.ts` returns ZERO hits.
- [x] 10.6 `npx oxfmt --check` clean.
- [x] 10.7 PR opened, CI green, merged. PR #498, merged at `53b0df1e` on 2026-05-03.

---

## PR5 — IPerson interface + shim deletion

### 11. Pre-deletion grep + audit

- [x] 11.1 `grep -rn "IPerson\b" src/` — record count.
  - Pre-PR5 audit: 123 hits across 38 files. Of those, ~100 were dead `createTestPerson` / `makePerson` orphans left behind by PR4 cleanup (helpers defined and `person`/`personnel` variables assigned but never read by any subsequent test code). The remaining live consumers were 2 dead-code production files (`skillProgression.ts`, `techSkill.ts`) plus comment-only mentions in 14 production files.
  - Acceptance: post-PR5 count is 0.

- [x] 11.2 `grep -rn "rosterEntryToPerson" src/` — confirm only the shim file + its tests reference it.
  - Pre-PR5 audit: only `src/lib/campaign/utils/rosterEntryToPerson.ts` (definition), its test file, and a 2-line historical comment in `turnover/modifiers/personalModifiers.ts` referenced the shim. Both files deleted, comment neutralized.

### 12. Delete IPerson + shim

- [x] 12.1 Delete `IPerson` interface and related types from `src/types/campaign/Person.ts`.
  - Person.ts collapsed from 804 lines to 102 lines. Preserved exports: `IInjury` (consumed by 6 medical files + ICampaignRosterEntry) and `createInjury` (consumed by 4 test files). Deleted: `IPerson` interface + sub-interfaces (IPersonIdentity/Background/Career/Experience/CombatState/Assignment), `isAlive`/`isActive`/`isAvailable`/`isWounded`/`getTotalXP`/`getAvailableXP`/`hasPermanentInjuries`/`getTotalHealingDays`/`isCombatRole`/`isSupportRole`/`pilotToPerson`/`isPerson`/`createDefaultAttributes`/`isInjury` (all confirmed unused outside Person.ts and its own test file). Also deleted dead-code production files `skillProgression.ts` + `techSkill.ts` (and tests) — both took `IPerson` parameters but were superseded by `(entry, pilot)`-based helpers in `skillCostTraits.ts` / `skillHelpers.ts` / `XPCalculator.ts` and had zero production consumers. Also deleted the 1024-line `Person.test.ts` (71 tests against the deleted IPerson interface). Removed `export * from './techSkill';` from `src/types/campaign/skills/index.ts`.

- [x] 12.2 Delete `src/lib/campaign/utils/rosterEntryToPerson.ts` shim file.

- [x] 12.3 Delete `src/lib/campaign/utils/__tests__/rosterEntryToPerson.test.ts` (or wherever the shim tests live).

### 13. Final verification

- [x] 13.1 `grep -rn "IPerson\b" src/` returns ZERO hits. Verified post-Phase-D.
- [x] 13.2 `grep -rn "rosterEntryToPerson" src/` returns ZERO hits. Verified post-Phase-C.
- [x] 13.3 `npx tsc --noEmit --skipLibCheck` exit 0. Verified after every commit (husky pre-commit hook).
- [x] 13.4 Full test suite passes. 878 suites / 22946 tests pass (1 suite skipped, 44 individual tests skipped — same skip count as pre-PR5 baseline).
- [x] 13.5 `npx oxfmt --check` clean. Verified.
- [x] 13.6 PR opened, CI green, merged. PR #499, merged at `0cd05d1d` on 2026-05-03.

### 14. Spec sync + archive

- [x] 14.1 On change archive (post-merge of PR5), the delta spec syncs into `openspec/specs/campaign-personnel-architecture/spec.md`.
  - Pre-archive audit: source-of-truth spec already contains supersetting requirements covering the architecture (the `Personnel are stored across three orthogonal stores` / `Cross-store helpers accept the two-arg signature` / `Pre-join template avoids N² find() calls` / `NPC handling is documented per helper` / `Cross-store mutations return delta objects` / `Bridge functions are transitional infrastructure` / `ICampaign.personnel field is removed entirely` / `IPerson type is deleted from src/` / `Other specs reference the split` requirement set), so archive sync is a delta-vs-existing pass that should land cleanly. The IPerson-deletion requirement (line 187 of source-of-truth) is now satisfied by PR5 code.

- [x] 14.2 Update `openspec/specs/personnel-management/spec.md` to reference `IPilot` + `ICampaignRosterEntry` instead of legacy `IPerson` (if any references remain).
  - Found 3 lingering `IPerson` references in `personnel-management/spec.md`. Updated `Requirement: Immutable Person Fields` → `Requirement: Immutable Roster Entry Fields` (renamed + scenarios rewritten to enumerate `ICampaignRosterEntry` fields and reference `useCampaignRosterStore.applyPilotPatches` for store-resident updates). Updated the legacy-substrate paragraph in `Personnel Substrate Architecture (Identity vs Employment Split)` to record that the IPerson interface itself was deleted in PR5. Both surviving mentions are intentional (they reference IPerson as the historical/deleted thing).

- [ ] 14.3 Archive change to `openspec/changes/archive/YYYY-MM-DD-wire-iperson-hard-cutover/`.
  - Acceptance: `openspec list` no longer shows this change as active.
