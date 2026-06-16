# Tasks: Close the Campaign Economic Loop

## 1. Investigation and red-first evidence

- [ ] 1.1 Read the repair-queue ticket model end-to-end (`repairQueueBuilderProcessor.ts`,
  the `IRepairTicket`/`repairQueue` type, and `useRepairStore.advanceRepairs`) and
  document in the PR description: the ticket fields recording what armor/structure a
  ticket repairs, any tech-hour/tech-assignment field available, and why
  `advanceRepairs` has zero callers — resolves design Open Question 2 and decides
  whether `advanceRepairs` is deleted or demoted to an adapter.
- [ ] 1.2 Inventory every reader of `recentlyAppliedOutcomes` (grep `recentlyAppliedOutcomes`
  across `src/`); confirm only the morale signal consumes it, or list other consumers
  so D4's prune-vs-filter decision is evidence-based (design Risk 3).
- [ ] 1.3 Read `serializeCampaign`'s shared field-map constant and `deserializeCampaignBody`
  to confirm the exact mechanism (kind tags / field list) the four aftermath fields
  must join, and the type-level drift test that guards it.
- [ ] 1.4 Write red-first probes proving each leak is observable today:
  (a) a repair ticket created from a battle outcome stays `queued` with the unit's
  armor unchanged after N pipeline days; (b) `setSalvageItemStatus('accepted')` leaves
  roster and any inventory unchanged; (c) a delivered acquisition request increments no
  pool; (d) a campaign with outcomes spread over >1 month scores monotonically rising
  morale; (e) a serialize→deserialize round-trip drops a populated `repairQueue`;
  (f) green vs elite doctor heal-rate is identical; (g) `purchaseUnit` leaves balance
  and force unchanged.

## 2. Parts inventory (single warehouse pool)

- [ ] 2.1 Add a `partsInventory` field to `ICampaign` (the warehouse pool) and a typed
  accessor/mutator helper; add it to the campaign-creation default as empty.
- [ ] 2.2 Register `partsInventory` in the shared serialize field-map so it round-trips
  (joins task 5's work) and a pre-existing-field-less save deserializes to empty.

## 3. Repair ticket completion (C-4)

- [ ] 3.1 Add a `repairProgressProcessor` day-processor that consumes available
  tech-hours, promotes `queued → in-progress`, decrements remaining hours, and on a
  ticket reaching zero transitions it `completed`.
- [ ] 3.2 On ticket completion, restore the ticket's recorded armor/structure points on
  the unit (clamped to location max) and recompute `combatReady`; guard against
  re-application so a pipeline re-run is idempotent (design D3).
- [ ] 3.3 Have the parts-matching step read required parts from `partsInventory`
  (consuming them on completion); a ticket whose part is unavailable waits rather than
  completing.
- [ ] 3.4 Register the processor in the day pipeline after the builder; delete or demote
  `useRepairStore.advanceRepairs` per task 1.1's finding so there is one completion
  authority.
- [ ] 3.5 Update/add reachable repair tests: a multi-day pipeline run drives a ticket to
  `completed` and restores the unit; task 1.4(a) now passes.

## 4. Salvage and acquisition materialization (M-1, M-2)

- [ ] 4.1 In `setSalvageItemStatus`, when a candidate is accepted, materialize an awarded
  *unit* onto the roster/force and an awarded *part* into `partsInventory`; a declined
  candidate materializes nothing.
- [ ] 4.2 In `acquisitionProcessor.processDeliveries`, on a delivered request increment
  `partsInventory` by the delivered part(s) — the same pool salvage feeds and repair
  reads.
- [ ] 4.3 Tests: an accepted salvage unit appears on the roster and an accepted salvage
  part appears in the inventory (1.4(b)); a delivered acquisition increments the
  inventory and a subsequent repair can consume it (1.4(c)).

## 5. Battle-aftermath persistence (M-4)

- [ ] 5.1 Add `repairQueue`, `salvageAllocations` (+ reports), `pendingBattleOutcomes`,
  and `processedBattleIds` to the shared serialize field-map with correct kind tags, so
  both `serializeCampaign` and `deserializeCampaignBody` carry them.
- [ ] 5.2 Ensure `processedBattleIds` (Set/array dedup guard) serializes as an array and
  deserializes back to its runtime shape.
- [ ] 5.3 Tests: a fully-populated round-trip preserves all four fields (1.4(e) passes);
  the field-map drift type-test still guards them.

## 6. Campaign morale sliding window (M-3)

- [ ] 6.1 In `gatherMoraleSignals`, filter `recentlyAppliedOutcomes` to entries within one
  campaign-month of `currentDate` before counting victories/defeats (MHQMorale parity).
- [ ] 6.2 Prune `recentlyAppliedOutcomes` at the writer so it cannot grow unbounded
  (filter-only fallback if task 1.2 finds another consumer needs the full history).
- [ ] 6.3 Tests: outcomes spread across several months score within a bounded window and
  do not ratchet to Elite (1.4(d) passes).

## 7. Doctor medicine skill (M-5)

- [ ] 7.1 Add a `medicine` skill to the doctor roster-entry/pilot model with a typed
  default.
- [ ] 7.2 Source `getMedicineSkillValue` from the model (fallback to 7 only when unset);
  implement `getShorthandedModifier` from the doctor's patient-load vs capacity.
- [ ] 7.3 Tests: a green doctor and an elite doctor produce materially different heal
  outcomes on the same injury/seed (1.4(f) passes); an overloaded doctor incurs a TN
  penalty.

## 8. Economic mediums (salary rank, kill XP, activity-log id, unit market)

- [ ] 8.1 Add the rank pay multiplier (and secondary-role base) to `salaryService`
  per-person salary (`Person.java:4733`); leave `XP_SALARY_MULTIPLIER` unchanged.
- [ ] 8.2 Pass the actual kill count into `awardKillXP` at
  `postBattleProcessor.helpers.ts:114` instead of the literal `1`.
- [ ] 8.3 Replace `dayNumber ?? 0` activity-log id derivation
  (`useCampaignStore.ts:303`) with a collision-free day discriminator so each day's
  entries are unique and prior days are retained.
- [ ] 8.4 Implement `unitMarket.purchaseUnit` to validate funds, debit the cost, and add
  the unit to the force atomically; return `{success:false, reason}` on insufficient
  funds (honors markets-system "Purchase unit deducts cost").
- [ ] 8.5 Tests for each: senior personnel billed with rank multiplier; a 5-kill ace earns
  more XP than a 0-kill survivor; two days of activity log both retained;
  `purchaseUnit` debits balance and adds the unit (1.4(g) passes), and rejects on
  insufficient funds without mutation.

## 9. Verification and documentation

- [ ] 9.1 Full verification: `npx tsc --noEmit --skipLibCheck`, `oxlint`, `oxfmt --check`,
  and all affected Jest suites (`src/lib/campaign/**`, `src/lib/finances/**`,
  `src/stores/campaign/**`) green; confirm every red probe from task 1.4 now passes.
- [ ] 9.2 Run `npx openspec validate close-campaign-economic-loop --strict` and confirm it
  prints valid.
- [ ] 9.3 Update `docs/audits/2026-06-12-full-codebase-review.md` M-CAMP rows (C-4, M-1,
  M-2, M-3, M-4, M-5 + the four mediums) to reference this change as the remediation.
