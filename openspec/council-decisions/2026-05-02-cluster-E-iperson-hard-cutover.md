# Council #2 Decision — Cluster E: IPerson Hard-Cutover (Flagship)

**Date**: 2026-05-02
**Variant**: Lean++ thin (3 Phase-2 seats: Hephaestus + Explore-Deep + Momus)
**Verdict**: VERIFIED (after recount of test fixture site count to 69)
**Survival Score**: 7/10

## Question

This is the deferred Phase 8.2 of `migrate-personnel-to-roster-employment` (PRs #472/#473/#474). Under hard-cutover policy, the `IPerson` shim + 72 helper signatures must come down. Original brief asked 4 questions:

1. Wave structure (mega-PR vs N domain waves)?
2. Replacement signature (two-arg vs `IPersonnelView`)?
3. `ICampaign.personnel` field (drop entirely vs derived getter)?
4. Sequencing dependency on bridge functions?

## Decision

**STAGED CUTOVER — 5 sequential PRs. Bridge functions stay alive through PR1-PR2; Map drops in PR3.**

Both proposers and adversary converged on:
- Two-arg `(entry: ICampaignRosterEntry, pilot: IPilot | null)` signature (NOT `IPersonnelView` god-type rename)
- 5 sequential PRs (NOT 6 parallel domain waves — processor pipeline atomicity blocks parallelism)
- Drop `ICampaign.personnel` entirely (NOT derived getter — keeps `isCampaign()` coupled)
- Delete bridge functions (`derivePersonnelFromRoster`, `syncRosterFromPersonnel`) in PR4 — kills the lossy Critical→Wounded round-trip bug

## Critical findings

1. **Metis's "Map is dead" was WRONG**. Momus + Explore-Deep verified ~10+ production readers of `campaign.personnel`:
   - 5 processors (`healingProcessor`, `autoAwardsProcessor`, `vocationalTrainingProcessor`, `turnoverProcessor`, `randomEventsProcessor`, `postBattleProcessor`)
   - 3 finance services (`salaryService`, `taxService`, `FinanceService` in `src/lib/finances/`)
   - `dayAdvancement.ts:329,429`
   - `autoAwardEngine.ts:55`, `turnoverCheck.ts:257`
   - 4 type-layer helpers in `Campaign.ts:147,163,180,300`
   - 2 UI `.size` reads (`campaigns/index.tsx:46`, `CampaignDashboardPage.sections.tsx:157`)

2. **Test fixture surface ~69 sites** across 20+ test files (verified). NOT 2 (Metis's initial count). This drives PR1 sequencing.

3. **Processor pipeline is NOT splittable**. `dayAdvancement.ts:425-452` chains 6 processors via immutable `ICampaign` spreads. PR3 must repoint atomically.

4. **84 helper files in `src/lib/campaign/`** (not 61 — Metis Glob truncation).

## What ships

### PR1 — Test fixture migration (~69 sites)
Migrate `personnel: new Map([...])` test fixtures to `useCampaignRosterStore.setPilots([entry])` + `usePilotStore.addPilot(vaultPilot)`. Bridge layer untouched.

### PR2 — Helper signature migration (~72 helpers, 84 files, per-domain commits in ONE PR)
Two-arg signature `(entry, pilot | null)`. Per-domain commits:
1. medical (7 files)
2. turnover (5 files) + ranks/rankService.isOfficer cross-call
3. finances/statusRules + 3 finance services in `src/lib/finances/`
4. progression (4 files) + skills (3 files)
5. awards (2 files, ~18 checker functions)
6. ranks + maintenance + events
7. type-layer helpers in `Campaign.ts`

Pre-join template: `Map<pilotId, IPilot>` from vault to avoid N² `find()` calls.

### PR3 — Processor + dayAdvancement repointing (atomic)
Update `dayAdvancement.ts` + 6 processors + 4 `Campaign.ts` helpers + 2 UI `.size` readers. Bridge functions still alive but no production code reads `campaign.personnel`.

### PR4 — Map drop + lossy bug fix
Delete `ICampaign.personnel`, `derivePersonnelFromRoster`, `syncRosterFromPersonnel`, `isCampaign()` guard, legacy preservation merge at `useCampaignStore.ts:743-750`.

### PR5 — Cleanup
Delete `IPerson` interface, `rosterEntryToPerson.ts` shim + tests. Final grep: `IPerson` count = 0 in src/.

## Out of scope (REFUSED)

- `IPersonnelView` (renamed god type)
- 6 parallel domain waves (processor pipeline atomicity)
- Memoization (premature)
- `IAttributes` aspirational fields
- `PersonnelStatus` 37-value vs `CampaignPilotStatus` 5-value reconciliation
- Vault/roster store split architecture

## Open questions tracked

1. **`IInjury[]` migration**: lives on `IPerson.injuries`; verify `ICampaignRosterEntry.injuries` exists in PR2 medical commit; add if absent.
2. **NPC domain matrix**: turnover/vocational training/awards produce noise on NPC entries; PR2 helpers must document which domains skip NPCs explicitly.
3. **Delta-return contract for cross-store mutations**: PR2 progression returns delta objects; PR3 processors commit deltas to right store.

## Council seats

| Seat | Position | Survival | Model |
|---|---|---|---|
| Hephaestus | proposer (9 waves, 6 parallel domains) | 8/10 | opus |
| Explore-Deep | call-graph (84 files; 10+ Map readers) | n/a | sonnet |
| Momus | adversary (overruled Metis "Map is dead"; 69 test sites) | n/a | sonnet |
| Phase 4.5 verifier | VERIFIED after recount | n/a | haiku |

## Effort estimate

5 PRs over **3-4 weeks** of focused work. PR1 (test fixtures) and PR2 (helpers) are the bulk. PR3-PR5 are smaller but coupled.

## Phase 6 status

**Not started in this session.** Council #2 deliverable is the openspec change `wire-iperson-hard-cutover` (to be authored by Prometheus) and the 5 PRs that follow. Implementation is multi-week — picks up in subsequent sessions.
