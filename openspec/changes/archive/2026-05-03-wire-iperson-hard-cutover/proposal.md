# Wire IPerson Hard-Cutover

## Intent

The previous change `migrate-personnel-to-roster-employment` (archived 2026-05-01) split personnel data into vault (`usePilotStore`) + roster (`useCampaignRosterStore`) but intentionally preserved the legacy `IPerson` shim, the `ICampaign.personnel: Map<string, IPerson>` field, and 72 helper signatures accepting `IPerson`. Under the pre-release hard-cutover policy, that bridge must come down.

Council #2 (Lean++ thin variant, decision at `openspec/council-decisions/2026-05-02-cluster-E-iperson-hard-cutover.md`) ruled: STAGED CUTOVER across 5 sequential PRs. PR1 (test fixture migration) shipped 2026-05-02 as [#486](https://github.com/SwiggitySwerve/MekStation/pull/486). This change implements PR2-PR5: helper signature migration → atomic processor repointing → Map drop + lossy bug fix → IPerson deletion.

The new canonical spec at `openspec/specs/campaign-personnel-architecture/spec.md` (authored alongside this change) is the source-of-truth this change implements. PR4 fixes a known lossy bug in `syncRosterFromPersonnel` at `useCampaignStore.ts:343-351` (Critical → Wounded round-trip downgrade) by deleting the bridge function entirely.

## Scope

### In

- **PR2**: Migrate ~72 helper signatures across ~84 files in `src/lib/campaign/` and `src/lib/finances/` from `(person: IPerson)` to `(entry: ICampaignRosterEntry, pilot: IPilot | null)`. Per-domain commits in ONE PR (medical → turnover → finances → progression/skills → awards → ranks/maintenance/events → type-layer helpers in `Campaign.ts`). Use pre-join `Map<pilotId, IPilot>` template to avoid N² `vault.find()` calls.
- **PR3**: Atomic processor pipeline repointing. Update `dayAdvancement.ts` + 6 processors (`healingProcessor`, `autoAwardsProcessor`, `vocationalTrainingProcessor`, `turnoverProcessor`, `randomEventsProcessor`, `postBattleProcessor`) + 4 type-layer helpers in `Campaign.ts` + 2 UI `.size` readers (`campaigns/index.tsx:46`, `CampaignDashboardPage.sections.tsx:157`). Bridge functions stay alive but no production code reads `campaign.personnel`. Atomic because `dayAdvancement.ts:425-452` chains 6 processors via immutable `ICampaign` spreads.
- **PR4**: Delete `ICampaign.personnel` field. Delete `derivePersonnelFromRoster`, `syncRosterFromPersonnel`, the `isCampaign()` guard's personnel coupling, and the legacy preservation merge at `useCampaignStore.ts:743-750`. This kills the lossy Critical→Wounded round-trip bug.
- **PR5**: Delete `IPerson` interface from `src/types/campaign/Person.ts`. Delete `rosterEntryToPerson.ts` shim + its tests. Final grep: `IPerson` count = 0 in `src/`.

### Out

- **`IPersonnelView` god-type rename** — REFUSED by Council #2. Would re-conflate the layers we just split.
- **6 parallel domain waves** — REFUSED by Council #2. The `dayAdvancement` processor pipeline atomicity blocks parallelism.
- **`PersonnelStatus` (37 values) vs `CampaignPilotStatus` (5 values) reconciliation** — out of scope; separate future spec change. The two enums serve different audiences.
- **Memoization of derived views** — premature; current N² is acceptable for current campaign sizes.
- **`IAttributes` aspirational fields** on roster entry.
- **Pilot consciousness on `ICampaignRosterEntry`** — combat-resolution Wave 5 gate; tracked under `campaign-unit-combat-state` deferred extensions.
- **PR1 (test fixture migration)** — already shipped as PR #486.

## Approach

Domains touched:
- `personnel-management` (helper signatures, NPC handling contract, type-layer helpers in `Campaign.ts`).
- `personnel-progression` (skill progression delta-return contract).
- `personnel-status-roles` (statusRules + finance integration).
- `campaign-management` (`ICampaign.personnel` field deletion, `isCampaign()` decoupling).

Pattern: a clean three-store architecture (vault + roster + force assignment) with the two-arg `(entry, pilot | null)` helper signature replacing the `IPerson` god-type. Bridge functions exist only during cutover and are deleted in PR4. Mirrors the Council #2-validated path; honors the staged sequencing because the processor pipeline is not splittable.

PR sequencing (sequential, each blocks the next):
- **PR2** (L, ~5-7 days): Helper signature migration. Largest PR. Per-domain commits keep diff reviewable.
- **PR3** (M, ~2-3 days): Atomic processor repointing. Smaller code-wise but coupled — must land in one PR per Council #2 ruling.
- **PR4** (M, ~1-2 days): Map drop + bug fix. Touches `ICampaign` interface, all factories, and `useCampaignStore` migration paths.
- **PR5** (S, ~half day): Cleanup. Should be a clean grep-driven deletion after PR4.

Total: 3-4 weeks of focused work per Council #2 estimate.

## Test Strategy

- **PR2 verification**: Per-domain commit boundaries map to per-domain test suites. After each commit, run `npx jest --testPathPattern='<domain>'` (medical, turnover, finances, progression, awards, ranks). Full test suite at the end. Pre-join template performance verified by checking no helper internally calls `vault.find(...)` (lint/grep gate).
- **PR3 verification**: `dayPipeline.test.ts` and `dayAdvancement.test.ts` continue to pass. Integration round-trip tests (`phase3RoundTrip.test.ts`, `phase4CampaignRoundTrip.test.ts`) confirm processor pipeline produces identical outputs after repointing. UI `.size` readers verified via component snapshot tests.
- **PR4 verification**: `npx tsc --noEmit --skipLibCheck` exit 0 (the field deletion will surface any remaining `campaign.personnel` reads). Critical→Wounded round-trip regression test added to confirm the bug is fixed (input Critical → roster reload → still Critical).
- **PR5 verification**: `grep -rn "IPerson" src/` returns zero hits. Full test suite passes. Type-check clean.

## References

- Council #2 decision: `openspec/council-decisions/2026-05-02-cluster-E-iperson-hard-cutover.md`
- Canonical spec: `openspec/specs/campaign-personnel-architecture/spec.md`
- Prior change (PR1 already shipped): PR [#486](https://github.com/SwiggitySwerve/MekStation/pull/486) — test fixture migration
- Originating change (archived): `openspec/changes/archive/2026-05-01-migrate-personnel-to-roster-employment/`
- Lossy bug location: `src/stores/campaign/useCampaignStore.ts:343-351` (`syncRosterFromPersonnel`)
