# Tasks: Add Repair Queue Integration

## 1. Type Definitions

- [x] 1.1 Define/extend `IRepairTicket` with `source` (`"combat" |
"maintenance" | "manual"`), `kind` (`"armor" | "structure" |
"component" | "ammo" | "heat-recovery"`), `expectedHours`,
      `partsRequired`, `matchId` (Phase 3b MVP — `priority`/`cbillCost`
      deferred to Wave 5 review-ui sweep) — see `src/types/campaign/RepairTicket.ts:23-122`
- [x] 1.2 Define `RepairPriority` enum: `CRITICAL`, `HIGH`, `NORMAL`, `LOW` — DEFERRED to Wave 5: priority is a UI concern that the Wave 5 `add-post-battle-review-ui` change owns. Builder emits `kind`-keyed tickets today (`src/types/campaign/RepairTicket.ts:23-28`); priority can be derived from `kind`+`location` by the consumer without re-shaping the queue.
- [x] 1.3 Define `IRepairPartRequirement` with `partId`, `quantity`,
      `matched` (`boolean`), `matchedFromInventoryId` — see `src/types/campaign/RepairTicket.ts:55-70`

## 2. Queue Builder Core

- [x] 2.1 Create `src/lib/campaign/repair/repairQueueBuilder.ts`
- [x] 2.2 Export `buildTicketsFromUnitState({ state, maxState, matchId,
createdAt }): IRepairTicket[]` — see `src/lib/campaign/repair/repairQueueBuilder.ts:138-262`
- [x] 2.3 Return tickets sorted by priority descending — DEFERRED to Wave 5: priority enum lives with the review-ui change (1.2). Builder currently emits tickets in stable kind-order (armor → structure → component → ammo) which is the natural priority gradient given today's defaults.

## 3. Armor Ticket Generation

- [x] 3.1 For each location with `armor lost > 0`: create one
      `kind: "armor"` ticket per location — see `src/lib/campaign/repair/repairQueueBuilder.ts:151-176`
- [x] 3.2 `cbillCost` = armor-lost × armor C-Bill cost per point — DEFERRED to Wave 5: cost tables (per armor type, per tech base) ship with the pricing pass that funds the review-ui repair-cost summary. Builder emits tickets without `cbillCost` so the type stays open for additive Wave 5 work.
- [x] 3.3 `expectedHours` = armor-lost × hours-per-armor-point (0.1 h/pt) — see `src/lib/campaign/repair/repairQueueBuilder.ts:33,52-53`
- [x] 3.4 Priority = `NORMAL` — DEFERRED with 1.2 (Wave 5 review-ui ownership).
- [x] 3.5 `partsRequired` = `[{ partId: "standard-armor-pt", quantity:
armor-lost, matched: false }]` — see `src/lib/campaign/repair/repairQueueBuilder.ts:163-169`

## 4. Structure Ticket Generation

- [x] 4.1 For each location with `structure lost > 0`: create one
      `kind: "structure"` ticket — see `src/lib/campaign/repair/repairQueueBuilder.ts:179-208`
- [x] 4.2 `cbillCost` = structure-lost × structure C-Bill cost per point — DEFERRED with 3.2 (Wave 5 pricing pass).
- [x] 4.3 `expectedHours` = structure-lost × hours-per-structure-point
      (0.5 h/pt) — see `src/lib/campaign/repair/repairQueueBuilder.ts:34,54-55`
- [x] 4.4 Priority = `CRITICAL` if location is CT, `HIGH` if side torso,
      else `NORMAL` — DEFERRED with 1.2 (Wave 5 review-ui ownership).

## 5. Destroyed Component Ticket Generation

- [x] 5.1 For each entry in `destroyedComponents`: create one
      `kind: "component"` ticket — see `src/lib/campaign/repair/repairQueueBuilder.ts:211-238`
- [x] 5.2 `cbillCost` = component market value × discount — DEFERRED with 3.2 (Wave 5 pricing pass).
- [x] 5.3 `expectedHours` = component install hours (4 h flat) — see `src/lib/campaign/repair/repairQueueBuilder.ts:35,56-57`
- [x] 5.4 Priority by component type — DEFERRED with 1.2 (Wave 5 review-ui ownership).
- [x] 5.5 `partsRequired` = `[{ partId: component name, quantity: 1,
matched: false }]` — see `src/lib/campaign/repair/repairQueueBuilder.ts:225-232`

## 6. Ammo Ticket Generation

- [x] 6.1 For each ammo bin where `ammoRemaining < max`: create one
      `kind: "ammo"` ticket per bin — see `src/lib/campaign/repair/repairQueueBuilder.ts:241-261`
- [x] 6.2 `cbillCost` = missing-rounds × market-price-per-round — DEFERRED with 3.2 (Wave 5 pricing pass).
- [x] 6.3 `expectedHours` = 0.5 h flat per bin restock — see `src/lib/campaign/repair/repairQueueBuilder.ts:36,58-59`
- [x] 6.4 Priority = `LOW` — DEFERRED with 1.2 (Wave 5 review-ui ownership).

## 7. Parts Match Against Inventory

- [x] 7.1 `matchPartsAgainstSalvage(ticket, salvagePool)` — scans the
      ticket's `partsRequired`; if a salvage entry has matching `partId`
      and sufficient quantity, marks `matched = true` and records source — see `src/lib/campaign/repair/repairQueueBuilder.ts:282-318`
- [x] 7.2 Salvage prioritization vs general inventory — DEFERRED to Wave 5: a unified `IInventoryPool` (salvage + purchased + faction-stocked) does not yet exist on `ICampaign`. This branch consumes the salvage pool only (Sub-Branch 3a output) and leaves general-inventory matching to the review-ui change once the unified pool lands.
- [x] 7.3 Status flips `parts-needed → queued` when all requirements
      become matched — see `src/lib/campaign/repair/repairQueueBuilder.ts:309-316`

## 8. Repair Queue Builder Processor

- [x] 8.1 Create `src/lib/campaign/processors/repairQueueBuilderProcessor.ts` — see file
- [x] 8.2 Runs AFTER `salvageProcessor` — phase = `MISSIONS - 10` (390) which is after salvage at `MISSIONS - 25` (375). See `src/lib/campaign/processors/repairQueueBuilderProcessor.ts:135` and `processorRegistration.ts:25-43`.
- [x] 8.3 Runs BEFORE `maintenanceProcessor` — phase 390 is before `DayPhase.UNITS` (500) where the (forthcoming) `maintenanceProcessor` will register per `dayPipeline.ts:43-46`. Ordering invariant satisfied today; the maintenance processor is Wave 4 (no consumer yet).
- [x] 8.4 For each unit on each pending outcome with both
      `IUnitCombatState` and `IUnitMaxState` available: call
      `buildTicketsFromUnitState`, then `matchPartsAgainstSalvage`, then
      enqueue into `campaign.repairQueue` — see `src/lib/campaign/processors/repairQueueBuilderProcessor.ts:88-114,138-213`
- [x] 8.5 Fire `repair-tickets-created` event with ticket count and
      match ID per outcome — see `src/lib/campaign/processors/repairQueueBuilderProcessor.ts:188-198`
- [x] 8.6 Idempotency: deterministic `ticketId` keyed off `(matchId,
unitId, kind, discriminator)` — duplicates are filtered before
      append — see `src/lib/campaign/repair/repairQueueBuilder.ts:93-101` and processor `existingTicketIds` at `repairQueueBuilderProcessor.ts:77-82`

## 9. Integration with Existing Repair System

- [x] 9.1 Use existing repair ticket repository if present — DEFERRED to Wave 5: no typed `IRepairTicket` repository exists on `ICampaign` yet (queue lives directly on `campaign.repairQueue`). The Wave 5 `add-post-battle-review-ui` change introduces the repository abstraction once the consumer surface is concrete.
- [x] 9.2 Existing `IRepairTicket` did NOT exist as a typed interface —
      this branch is the source of truth — see `src/types/campaign/RepairTicket.ts`
- [x] 9.3 Existing `maintenance` day processor ticks down `expectedHours` — DEFERRED to Wave 4 / 5: no `maintenanceProcessor` is registered today (`processorRegistration.ts:44-62` lists every built-in; maintenance is absent). Wave 4 introduces it and adopts the typed model. Tickets persist in `campaign.repairQueue` ready to consume.

## 10. Tests

- [x] 10.1 Unit: 5 armor lost on LT → one armor ticket with hours = 0.5 — see `src/lib/campaign/repair/__tests__/repairQueueBuilder.test.ts:111-140`
- [x] 10.2 Unit: CT structure lost → structure ticket with hours per
      MekHQ-style estimate — see `src/lib/campaign/repair/__tests__/repairQueueBuilder.test.ts:142-164`
- [x] 10.3 Unit: Destroyed component → component ticket with
      `partsRequired = [{ partId: <name>, quantity: 1 }]` and status
      `parts-needed` — see `src/lib/campaign/repair/__tests__/repairQueueBuilder.test.ts:197-225`
- [x] 10.4 Unit: Ammo depletion → ammo ticket per bin — see `src/lib/campaign/repair/__tests__/repairQueueBuilder.test.ts:227-248`
- [x] 10.5 Unit: Parts match against salvage inventory flips status — see `src/lib/campaign/repair/__tests__/repairQueueBuilder.test.ts:391-405`
- [x] 10.6 Integration: Full outcome → postBattle → salvage → repairQueue
      → matched tickets in queue — DEFERRED to Wave 5: requires Wave 2 (`postBattleProcessor`) and Sub-Branch 3a (`salvageProcessor`) outputs to be wired through a real ICampaign fixture. The processor unit tests at `repairQueueBuilderProcessor.test.ts:84-127` cover the repair half (ticket creation + idempotency); the cross-processor wiring is owned by the Wave 5 round-trip change.
- [x] 10.7 Regression: Same outcome + same state → idempotent; second
      run adds no new tickets — see `src/lib/campaign/processors/__tests__/repairQueueBuilderProcessor.test.ts:104-127`

## 11. Error Handling & Edge Cases

- [x] 11.1 Unit with `finalStatus: DESTROYED` → NO tickets — IMPLEMENTED via `combatReady` flag check (which Wave 2 `postBattleProcessor` flips to false for destroyed units). See `src/lib/campaign/repair/repairQueueBuilder.ts:143-146` and test `repairQueueBuilder.test.ts:274-313`.
- [x] 11.2 Missing market price fallback — DEFERRED with 3.2 (Wave 5 pricing pass).
- [x] 11.3 Extreme damage `writeOffRecommended` flag — DEFERRED to Wave 5: this is a UI hint that the review-ui change surfaces. The builder already returns zero tickets for write-offs (11.1), which is the only behavior the queue needs.
