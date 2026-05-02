# Council #4 Decision — Cluster E IPerson Contract Revision

**Date**: 2026-05-02
**Variant**: Lean+ collapsed to Phase 0 + 1 Phase-2 verifier (Metis reframe was decisive; Oracle deemed unnecessary)
**Verdict**: VERIFIED (Phase 4.5 Haiku — all 4 deciding facts confirmed)
**Survival Score**: 9/10
**Predecessor**: Council #2 (`2026-05-02-cluster-E-iperson-hard-cutover.md`) — 5-PR plan stands, but a precursor PR1.5 is inserted before PR2.

---

## Trigger

PR2 hephaestus stopped after Section 1 (pre-flight) with a STOP-and-Report citing 7 IPerson fields with no equivalent on `ICampaignRosterEntry` or `IPilot`. Bridge function `rosterEntryToPerson.ts` synthesizes defaults that hephaestus claimed would break test scenarios once helpers migrate to the `(entry, pilot)` contract.

## Question

Council #2 ruled that helpers in `src/lib/campaign/` and `src/lib/finances/` migrate to `(entry: ICampaignRosterEntry, pilot: IPilot | null)`. PR2 surfaced ~7 IPerson fields not on either store. How to resolve?

5 options under consideration: A (add all 7), B (accept defaults + delete usage), C (refactor helpers per-field), D (hybrid per-field), E (per-domain PRs with shims).

## Critical reframe (Phase 0 Metis + Phase 2 Explore-Deep)

**The 7 fields are NOT a uniform problem. They sort into 3 tiers, and 4 of them are LIVE BUGS in production today** (the bridge silently breaks behavior; PR2 doesn't introduce these — it exposes them).

### Tier 1 — LIVE BUGS that block PR2 and must be fixed first

| Field | Live bug evidence | Fix |
|---|---|---|
| `primaryRole` | Hardcoded PILOT in bridge ([rosterEntryToPerson.ts:164](src/lib/campaign/utils/rosterEntryToPerson.ts:164)) breaks `getBestAvailableDoctor` filter ([doctorCapacity.ts:120-124](src/lib/campaign/medical/doctorCapacity.ts:120)) and `salaryService` role-based pay ([salaryService.ts:283,431-434](src/lib/finances/salaryService.ts:283)). Doctors are invisible; non-PILOT roles paid as PILOT. | Add as **required** field on `ICampaignRosterEntry`. Bridge maps from roster entry. |
| `traits` | Bridge omits entirely ([rosterEntryToPerson.ts:151-195](src/lib/campaign/utils/rosterEntryToPerson.ts:151)). `aging.ts:449-470` and `vocationalTrainingProcessor.ts:141,164-166,173-175` read AND write `traits.glassJaw`, `traits.slowLearner`, `traits.vocationalXPTimer`. Every read is `undefined?.x`; every spread write discards prior flags. Glass Jaw / Slow Learner / vocational timer **silently lost on every processing pass**. | Add as **optional** field on `ICampaignRosterEntry`. Bridge forwards via `traits: entry.traits ?? {}`. |
| `rankIndex` | Hardcoded 0 in bridge ([rosterEntryToPerson.ts:168](src/lib/campaign/utils/rosterEntryToPerson.ts:168)). `rankService.ts:111,149,207,265` reads `person.rankIndex ?? 0`. **Promotion gate at line 208 (`newRankIndex <= currentRankIndex`) blocks all promotions** because current is always 0. | Add as **required** field on `ICampaignRosterEntry`. Bridge forwards. |
| `lastPromotionDate` | Bridge omits. `rankService.ts:369,373` reads `person.lastPromotionDate`; absent → `isRecentlyPromoted` always returns `false`. Promotion-recency turnover modifier never fires. | Add as **optional** field on `ICampaignRosterEntry`. Bridge forwards. |

**Verified via Phase 2 Explore-Deep** — all 4 claims VERIFIED with `path:line` evidence; Phase 4.5 Haiku VERIFIED the Tier classification.

### Tier 2 — Additive, low risk (handle inside PR2 medical/turnover commits)

| Field | Production write path | Disposition |
|---|---|---|
| `isFounder` | Zero hits in `src/stores/` or `src/components/` (only test fixtures) — verified | Add as **optional** boolean on `ICampaignRosterEntry`. Pure additive; no migration risk. |
| `isCommander` | Same as above — verified | Add as **optional** boolean on `ICampaignRosterEntry`. |

### Tier 3 — Already no-ops, do not block

| Field | Status |
|---|---|
| `serviceContractEndDate` | Explicit stub at `personalModifiers.ts:87` returns 0 unconditionally with FIXME comment. |
| `isImmortal` | 3 hits total in `src/`, all on `Person.ts` definition. Zero production reads. Dead field. |
| `skills.administration.level` | `getDoctorCapacity` reads with `?? 0` fallback. Defaults gracefully. |
| `attributes.BOD` | Bridge supplies `DEFAULT_ATTRIBUTES` (BOD=5). Same value as production has ever stored. Defensible default. |

## Decision

**HYBRID OPTION D — TIER-BASED PR1.5 INSERTION.**

The Council #2 5-PR plan stands. **Insert a new PR1.5 before PR2**:

### PR1.5 (NEW) — Schema extension + bridge data integrity (S, ~2 hours)

- Add 4 fields to `ICampaignRosterEntry`:
  - `primaryRole: CampaignPersonnelRole` (required; existing rows defaulted to PILOT in deserialize migration)
  - `traits?: IPersonTraits` (optional)
  - `rankIndex: number` (required; existing rows defaulted to 0 in deserialize migration)
  - `lastPromotionDate?: Date` (optional)
- Update `rosterEntryToPerson.ts` bridge to FORWARD these from the roster entry instead of synthesizing defaults
- Update bridge tests
- Add Tier 2 fields (`isFounder?`, `isCommander?`) as optional booleans (additive, pure)
- Verify regression: existing `salaryService.test.ts` non-PILOT fixtures (DOCTOR/TECH/MEK_TECH/SOLDIER/DEPENDENT) now produce correct salary categorization
- **No helper signature migration** — that stays in PR2

### PR2 (revised) — Helper signature migration

Same plan as Council #2 said, but now WITH data-integrity guaranteed by PR1.5. Bridge always forwards correct field values, so helpers can safely migrate without losing test scenario coverage.

### PR3-PR5 — Unchanged

- PR3: Atomic processor + dayAdvancement repointing
- PR4: Map drop + lossy Critical→Wounded bug fix (deletes bridge functions)
- PR5: IPerson + shim deletion

## What also ships from this council

- This decision document
- Update `openspec/changes/wire-iperson-hard-cutover/tasks.md` to insert PR1.5 section + revise PR2 contract notes
- Update `openspec/specs/campaign-personnel-architecture/spec.md` to add a Requirement codifying the Tier 1 fields' presence on roster entry
- Pre-flight commit `b323121b` (injuries field + buildPilotLookup) folds into PR1.5 since it already touches `ICampaignRosterEntry` schema

## Out of scope (explicitly REFUSED)

- Hephaestus's Option E (per-domain PRs with `*FromPerson` shims) — UNNECESSARY now that PR1.5 lands the substrate
- Refactoring helpers to not need the fields (Option C) — adds behavior change risk for no benefit
- Adding all 7 fields uniformly (Option A) — overshoots; Tier 3 fields don't need to ship
- `attributes` migration — defer until alternate medical system becomes a first-class feature

## Survival Score breakdown

- **Architectural soundness**: 9/10 — claims verified with line-numbered evidence
- **Scope clarity**: 9/10 — explicit Tier 1/2/3 split + concrete PR1.5 task list
- **Verification depth**: 9/10 — Phase 0 + Phase 2 (1 seat) + Phase 4.5 Haiku, all VERIFIED
- **Risk to existing plan**: 9/10 — Council #2's 5-PR plan stands, just adds PR1.5 precursor

**Overall: 9/10**.

## Council seats

| Seat | Position | Model |
|---|---|---|
| Phase 0 Metis | reframer (collapsed 5 options to Tier 1/2/3) | sonnet |
| Phase 2 Explore-Deep | call-graph verification (4 live bugs VERIFIED + Tier 2 no-write VERIFIED) | sonnet |
| Phase 4.5 Haiku verifier | VERIFIED (all 4 deciding facts confirmed) | haiku |
| Hephaestus | Phase 0 stop-and-report surfaced the issue (out of council per protocol — was the trigger, not a seat) | n/a |
| Oracle | NOT consulted (Metis explicit recommendation; question collapsed to scoping refinement, not strategic pivot) | n/a |

## Effort estimate

**PR1.5**: ~2 hours focused work (schema additions + bridge forwarding + bridge tests + regression check on salaryService).
**PR2 (revised)**: same as Council #2 estimated (~5-7 days), but with data integrity guaranteed.
**PR3-5**: unchanged.

Total wire-iperson-hard-cutover initiative: **3-4 weeks** (slight extension from Council #2's estimate due to PR1.5 insertion).

## Phase 6 status

**Skipped this session.** Per ULTRAWORK loop cap, Council #4 deliverable is decision doc + tasks.md update. PR1.5 → PR2 → PR3-5 implementation chain is deferred to follow-up sessions.
