# Design: Close the Campaign Economic Loop

## Context

The campaign day-pipeline (`src/lib/campaign/processors/*`) and the campaign
store (`src/stores/campaign/*`) are individually clean, but six findings in the
2026-06-12 review's M-CAMP cluster prove the *economic loop is open*: every
combat consequence is computed and then discarded.

Verified at HEAD this session:

- `repairQueueBuilderProcessor.ts` ends at line 213 with
  `repairQueue: [...existingQueue, ...newTickets]` — append-only; nothing in the
  registered processor set advances a ticket (C-4).
- `acquisitionProcessor.ts:139` flips a request to `delivered` and pushes an
  event; no pool is touched (M-2).
- `campaignBayActions.ts:189` `setSalvageItemStatus` maps a candidate's `status`
  and nothing else (M-1).
- `gatherMoraleSignals.ts:48` reads `extended.recentlyAppliedOutcomes ?? []`
  whole and counts every entry as "recent" (M-3).
- `serializeCampaign.ts:120` returns an object literal that lists `forces`,
  `missions`, `finances`, `shoppingList`, … but no `repairQueue`,
  `salvageAllocations`, `pendingBattleOutcomes`, or `processedBattleIds` (M-4).
- `standardMedical.ts:47` `getMedicineSkillValue` returns a literal `7` with an
  `@stub Plan 7` comment; `getShorthandedModifier` returns 0 (M-5).
- `salaryService.ts` prices `XP_SALARY_MULTIPLIER` (line 152) with no rank term;
  `postBattleProcessor.helpers.ts:114` calls `awardKillXP(entry, pilot, 1, …)`
  with a literal `1`; `useCampaignStore.ts:303` derives
  `dayNumber = (postPipeline …).dayNumber ?? 0` then builds ids like
  `act-medical-${heal.personId}-${dayNumber}`; `unitMarket.ts:203` `purchaseUnit`
  returns `{ success: true }` after a find, mutating nothing.

The markets-system spec's "Market Purchase Functions" → "Purchase unit deducts
cost" scenario already *asserts* the correct behavior, so the unit-market stub is
a spec-vs-code contradiction, not a missing spec — this change makes the code
honor the existing contract and tightens it.

## Decisions

**D1 — One parts inventory field on `ICampaign`; two writers, one reader.**
Add a single `partsInventory` (warehouse) collection to `ICampaign`. Salvage
award (`setSalvageItemStatus` accept) and acquisition delivery
(`processDeliveries`) both *write* parts into it; the repair-progress processor's
parts-matching *reads* it. Rationale (simplest-solution + MekHQ parity): MekHQ has
exactly one `Warehouse`/`Quartermaster` pool that salvage and purchases both feed
and repairs draw from; modeling two separate destinations would re-create the
drift class the review flagged (a salvaged part and a bought part that the repair
matcher can't see as the same kind). Alternative considered — per-source pools
(`salvagePool` + `acquisitionPool`) — rejected: the reader would have to union
them and reconcile keys, exactly the multi-source-of-truth footgun.

**D2 — Repair completion is a registered day-processor consuming tech-hours,
not a UI action.** Add `repairProgressProcessor` to the day pipeline. Each day it
computes the work-team's available tech-hours, applies them to in-progress (and
newly-promoted queued) tickets, and on a ticket reaching zero remaining hours
transitions it `completed` and restores the ticket's covered armor/structure on
the unit, then recomputes `combatReady`. This mirrors `Campaign.fixPart`/
`Part.succeed` (work accrues against required time; success applies the fix).
Rationale: the append processor already runs in the pipeline, so completion
belongs in the same deterministic, replayable pipeline — not in
`useRepairStore.advanceRepairs`, which has zero callers and lives outside the
pipeline. `advanceRepairs` is either deleted or demoted to a thin store-facing
adapter the processor result feeds; it is NOT a second authority.

**D3 — Repair restoration is ticket-scoped, deterministic, and idempotent.**
A completed ticket restores exactly the armor/structure points it was created to
repair (recorded on the ticket at build time), clamped to the location's max. A
ticket is marked `completed` once and never re-applies on a re-run of the
pipeline (guarded by status), so replaying the day pipeline is idempotent. No
random rolls in the restoration step — maintenance/quality rolls remain owned by
`repair-maintenance`'s existing maintenance-check requirements.

**D4 — Campaign morale reads a bounded sliding window; the stored field is
pruned.** `gatherMoraleSignals` filters `recentlyAppliedOutcomes` to entries
whose date is within one campaign-month of `currentDate` before counting
victories/defeats (matching `MHQMorale.java:422`). Independently, the writer that
appends to `recentlyAppliedOutcomes` prunes entries older than the window so the
array cannot grow unbounded across a long campaign. Both halves are required:
filtering alone fixes the score but leaves an unbounded array; pruning alone
without a date filter would still over-count within the window. This is
campaign-layer prestige morale and is deliberately separate from the in-battle
`battleMorale` state owned by `combat-morale-and-withdrawal`'s existing
requirements — see Open Question 1 for the capability-home nuance.

**D5 — Aftermath fields join the shared serialize field-map, not an ad-hoc add.**
`campaign-persistence` already mandates a single shared field-map constant so
`serializeCampaign` and `deserializeCampaignBody` cannot drift (the spec's
"Field-map drift fails the build" scenario). The four aftermath fields are added
to that constant with their correct kind (plain JSON for `repairQueue`,
`pendingBattleOutcomes`, `processedBattleIds`; the existing serializer convention
for `salvageAllocations`), so both directions pick them up and the type-level
drift test continues to guard them. `processedBattleIds` serializes as an array
(it is a Set/array dedup guard) and deserializes back to its runtime shape.

**D6 — Doctor medicine skill is a roster-model field with a typed default.** Add a
`medicine` skill to the doctor roster-entry/pilot model.
`getMedicineSkillValue` reads it (falling back to the existing `7` only when a
roster entry genuinely has no medicine skill recorded, preserving current NPC
behavior). `getShorthandedModifier` returns a positive TN penalty derived from
the doctor's assigned patient count vs capacity (the capacity model already
exists under "Doctor Capacity Management"). This makes a green doctor (low skill)
and an elite doctor (high skill) heal at materially different rates, which is the
M-5 behavior gap.

**D7 — The four mediums are minimum-surface fixes against the MekHQ oracle.**
- Salary: multiply the per-person salary by the rank pay multiplier (and add the
  secondary-role base) so senior personnel are billed correctly
  (`Person.java:4733`). Existing `XP_SALARY_MULTIPLIER` is unchanged; the rank
  term is added.
- Kill XP: pass the person's actual kill count into `awardKillXP` instead of the
  literal `1` — a one-argument change at `postBattleProcessor.helpers.ts:114`,
  reading the per-person kill tally already present on the outcome delta.
- Activity-log id: derive a collision-free day discriminator (the campaign's
  absolute day index or the ISO date) instead of `dayNumber ?? 0`, so each day's
  entry has a unique id and the log retains every day, not just the latest.
- Unit market: `purchaseUnit` debits the offer's cost from finances and adds the
  unit to the force (honoring the existing markets-system "Purchase unit deducts
  cost" scenario); it returns `success:false` with a reason on insufficient funds
  rather than silently succeeding.

## Open Questions

1. **Capability home for campaign morale.** The `combat-morale-and-withdrawal`
   spec only defines *in-battle* `battleMorale`; campaign-layer morale is
   referenced there as a separate "Contract Morale Tracking" requirement that is
   not in that file. M-3 is squarely campaign-layer. Decision for this change:
   author the sliding-window requirement as an **ADDED** requirement under
   `combat-morale-and-withdrawal` (the capability slug the remediation plan
   assigned), explicitly scoped to campaign prestige morale and explicitly
   distinguished from `battleMorale`. If a follow-up reconciles the SoT it may
   relocate to a dedicated campaign-morale capability — resolved at SoT-reconcile
   time, not here. (No MODIFIED target exists for it in this file, so ADDED is the
   only validation-safe choice.)
2. **Tech-hour source for the repair processor.** Whether available daily
   tech-hours come from assigned tech personnel astech pools or a flat
   per-campaign constant for the first cut — resolved in task 1.1 by reading the
   existing repair-queue ticket model and any tech-assignment field; the spec
   requires *some* tech-hour budget is consumed and exhausting it stalls
   remaining tickets, leaving the exact source to implementation.

## Risks

- [Repair completion changes long-run campaign balance: units now actually
  heal, so attrition pressure drops] → Correct rules outcome; the restoration is
  ticket-scoped and rate-limited by tech-hours, matching MekHQ; balance tests
  re-baselined, not the behavior reverted.
- [`partsInventory` added to `ICampaign` is a new persisted field] → It rides D5's
  shared field-map so it serializes from day one; a campaign saved before the
  field exists deserializes to an empty inventory via the migration ladder's
  default (campaign-persistence "Schema Version and Migration Ladder").
- [Morale window pruning could drop an outcome another subsystem reads from
  `recentlyAppliedOutcomes`] → Audit readers of the field in task 1; if any
  non-morale consumer needs the full history, window only the morale *read* and
  leave the array intact (D4's filter-only half), accepting bounded growth and
  noting it in Risks rather than pruning blind.
- [Salary rank multiplier increases daily burn and may bankrupt existing test
  campaigns] → Finance tests assert the new arithmetic explicitly; widen any
  affected balance fixtures with an explanatory comment (perf/balance budget rule)
  rather than reverting the parity fix.
- [Unit-market buy now mutates finances + force: a partial failure could debit
  without adding] → Make `purchaseUnit` validate funds *before* any mutation and
  apply debit+add atomically in the store action, returning `success:false`
  untouched on insufficient funds.
