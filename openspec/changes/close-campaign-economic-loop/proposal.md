# Change: Close the Campaign Economic Loop

## Why

The campaign engine is well-built in isolation but its economic loop never closes:
combat consequences are computed and then dropped on the floor, so a player who
fights, takes damage, salvages, and buys parts ends up exactly where they
started. The 2026-06-12 full codebase review (`docs/audits/2026-06-12-full-codebase-review.md`,
cluster M-CAMP) confirmed six load-bearing gaps and four mediums against the
MekHQ Java oracle:

- **C-4 — Repair tickets never complete.** `repairQueueBuilderProcessor` only
  *appends* tickets (`src/lib/campaign/processors/repairQueueBuilderProcessor.ts:209`
  builds `repairQueue: [...existingQueue, ...newTickets]` and returns); no
  registered day-processor ever advances a ticket's status or restores
  armor/structure/`combatReady`. The parallel `useRepairStore.advanceRepairs`
  that *would* work them has zero production callers. Damaged units stay damaged
  forever. MekHQ closes the loop in `Part.succeed` / `Campaign.fixPart`.
- **M-1 — Salvage never becomes an asset.** `setSalvageItemStatus`
  (`src/stores/campaign/campaignBayActions.ts:189`) only flips a candidate's
  `status`; no unit enters the roster and no part enters any inventory, because
  no `partsInventory`/`warehouse` field exists on `ICampaign`. MekHQ materializes
  salvage in `ResolveScenarioTracker`.
- **M-2 — Acquired parts delivered into a void.** `processDeliveries`
  (`src/lib/campaign/processors/acquisitionProcessor.ts:139`) flips a request's
  status to `delivered` and emits an event but increments no pool — a purchased
  part costs C-bills and yields nothing usable. MekHQ routes deliveries into the
  warehouse via `Quartermaster.addPart`, the same pool repairs draw from.
- **M-3 — Morale ratchets monotonically.** `gatherMoraleSignals`
  (`src/lib/campaign/prestige/gatherMoraleSignals.ts:48`) reads the entire
  `recentlyAppliedOutcomes` lifetime array as "recent", so the morale score gains
  every prior victory every single day and pins to Elite. MekHQ uses a one-month
  sliding window (`MHQMorale.java:422`).
- **M-4 — Battle-aftermath state is not persisted.** `serializeCampaign`
  (`src/lib/campaign/persistence/serializeCampaign.ts:120`) omits `repairQueue`,
  `salvageAllocations`/reports, `pendingBattleOutcomes`, and `processedBattleIds`;
  created tickets and bay decisions vanish on a server-fetch reload (a parallel
  localStorage path masks this).
- **M-5 — Doctor Medicine skill hardcoded to 7.** `getMedicineSkillValue`
  (`src/lib/campaign/medical/standardMedical.ts:47`) returns a literal `7` and
  `getShorthandedModifier` always returns 0, so green and elite doctors heal
  identically. MekHQ reads the doctor's skill and applies a shorthanded penalty
  (`MedicalController.healPerson`).

Four mediums in the same cluster compound the leak: salary omits the rank pay
multiplier — the largest MekHQ salary driver (`src/lib/finances/salaryService.ts`
prices only `XP_SALARY_MULTIPLIER`; cf. `Person.java:4733`); kill XP is a flat `1`
regardless of actual kills (`src/lib/campaign/processors/postBattleProcessor.helpers.ts:114`);
activity-log per-day entry ids collide when `campaignDay` is `0`
(`src/stores/campaign/useCampaignStore.ts:303` derives `dayNumber ?? 0`, so every
day's `act-…-0` id overwrites the prior); and the unit-market buy path is a stub
(`src/lib/campaign/markets/unitMarket.ts:203` returns `{ success: true }` while
debiting nothing and adding no unit — directly contradicting the
markets-system spec's "Purchase unit deducts cost" scenario).

This change closes the loop so combat consequences become persistent assets and
costs. It is **integration and persistence**, not new feature breadth — the
MekHQ-style data model already exists; the wires between its halves do not.

## What Changes

- Add a daily **repair-progress processor** that consumes available tech-hours,
  transitions tickets `queued → in-progress → completed`, and on completion
  restores the unit's armor/structure and clears or recomputes `combatReady` —
  mirroring `Part.succeed`/`Campaign.fixPart`. Retire the orphaned
  `useRepairStore.advanceRepairs` path or wire it as the processor's store-facing
  adapter.
- Introduce a single **parts inventory** field on `ICampaign` (the warehouse).
  Salvage award and acquisition delivery both *materialize* into it; the repair
  processor's parts-matching *reads* it. One pool, two writers, one reader — no
  per-source side-channel.
- Materialize **awarded salvage units** onto the campaign roster/force and
  **awarded salvage parts** into the parts inventory when `setSalvageItemStatus`
  accepts a candidate.
- Replace the morale signal's lifetime read with a **sliding-window** read of
  `recentlyAppliedOutcomes` (one campaign-month, matching `MHQMorale`), and
  window/prune the stored field so it cannot grow unbounded.
- Add the four battle-aftermath fields (`repairQueue`, `salvageAllocations`/reports,
  `pendingBattleOutcomes`, `processedBattleIds`) to **both** `serializeCampaign`
  and `deserializeCampaignBody` so the aftermath round-trips on the server path.
- Add a **medicine skill** to the doctor roster model and source
  `getMedicineSkillValue` from it; implement a real `getShorthandedModifier`
  from the doctor's patient load.
- Fix the four mediums: rank pay multiplier in `salaryService`; actual kill count
  in `postBattleProcessor.helpers`; collision-free activity-log day ids; and a
  real unit-market `purchaseUnit` that debits C-bills and adds the unit.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `repair-maintenance`: gains a "Repair Ticket Completion" requirement (the daily
  progress processor consuming tech-hours and restoring armor/structure/`combatReady`).
- `markets-system`: tightens the existing "Market Purchase Functions" requirement
  so a unit purchase actually debits and adds the unit; gains a "Parts Inventory"
  requirement (the single warehouse pool fed by salvage and acquisition, read by
  repair).
- `campaign-finances`: tightens "Daily Cost Calculation" to include the rank pay
  multiplier; gains a "Parts Acquisition Delivery Destination" requirement (a
  delivered part increments the inventory, not a void).
- `medical-system`: tightens "Standard Medical System" so the Medicine skill and
  shorthanded modifier come from the doctor model, not a hardcoded constant.
- `campaign-persistence`: tightens "Campaign Serialization Round-Trip" so the
  battle-aftermath fields survive a serialize/deserialize round-trip.
- `combat-morale-and-withdrawal`: gains a "Campaign Morale Sliding Window"
  requirement (campaign-layer prestige morale reads a bounded recent window, not
  the lifetime outcome array).

## Impact

- `src/lib/campaign/processors/repairQueueBuilderProcessor.ts` (append site to
  re-baseline against the new completion processor) + a new
  `repairProgressProcessor` registered in the day pipeline; `useRepairStore`
  reconciliation.
- `src/stores/campaign/campaignBayActions.ts` (`setSalvageItemStatus`
  materialization), `src/lib/campaign/processors/acquisitionProcessor.ts`
  (`processDeliveries` inventory increment), and the `ICampaign` type +
  inventory accessor that both feed.
- `src/lib/campaign/prestige/gatherMoraleSignals.ts` (sliding window) + the field
  owner that prunes `recentlyAppliedOutcomes`.
- `src/lib/campaign/persistence/serializeCampaign.ts` + its `deserializeCampaignBody`
  sibling and the shared field-map constant.
- `src/lib/campaign/medical/standardMedical.ts` (`getMedicineSkillValue`,
  `getShorthandedModifier`) + the doctor roster-entry/pilot model carrying the
  medicine skill.
- `src/lib/finances/salaryService.ts` (rank multiplier),
  `src/lib/campaign/processors/postBattleProcessor.helpers.ts` (kill count),
  `src/stores/campaign/useCampaignStore.ts:303` (day-id collision),
  `src/lib/campaign/markets/unitMarket.ts:203` (`purchaseUnit`).
- New/extended Jest coverage under `src/lib/campaign/**/__tests__`,
  `src/lib/finances/__tests__`, `src/stores/campaign/__tests__`.
- No combat-resolution or engine delta — does not conflict with the active
  `add-battlemech-combat-validation-suite` or `fix-tactical-projection-agreement-gaps`
  changes.

## Non-goals

- No new economic subsystem or façade — one parts inventory field absorbs both
  the salvage and acquisition writers (simplest-solution rule); we do NOT add a
  warehouse service, a parts ledger micro-store, or per-source delivery queues.
- No part-condition / part-quality refit modeling beyond what already ships —
  delivered and salvaged parts enter the pool at their existing computed quality;
  the part-quality cascade is owned by `repair-maintenance` already.
- No MekHQ acquisition-roll, transit-time, or extra-parts-market rework — only
  the *destination* of an already-resolved delivery changes.
- No campaign-morale full prestige-rules rewrite — only the window the existing
  signal reads (M-3); the prestige scoring formula is unchanged.
- No multiplayer/co-op persistence work (owned by `reconcile-multiplayer-coop-reality`).
- No medical full daily-heal-rate rework (the binary heal model stands); only the
  doctor-skill source and shorthanded modifier change (M-5).
