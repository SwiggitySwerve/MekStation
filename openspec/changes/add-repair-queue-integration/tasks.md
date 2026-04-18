# Tasks: Add Repair Queue Integration

## 1. Type Definitions

- [x] 1.1 Define/extend `IRepairTicket` with `source` (`"combat" |
"maintenance" | "manual"`), `kind` (`"armor" | "structure" |
"component" | "ammo" | "heat-recovery"`), `expectedHours`,
      `partsRequired`, `matchId` (Phase 3b MVP — `priority`/`cbillCost`
      deferred to Wave 5 review-ui sweep)
- [ ] 1.2 Define `RepairPriority` enum: `CRITICAL`, `HIGH`, `NORMAL`, `LOW`
      _(deferred — Wave 5 may layer priority on top of `kind` once
      `add-post-battle-review-ui` adopts the type)_
- [x] 1.3 Define `IRepairPartRequirement` with `partId`, `quantity`,
      `matched` (`boolean`), `matchedFromInventoryId`

## 2. Queue Builder Core

- [x] 2.1 Create `src/lib/campaign/repair/repairQueueBuilder.ts`
- [x] 2.2 Export `buildTicketsFromUnitState({ state, maxState, matchId,
      createdAt }): IRepairTicket[]`
- [ ] 2.3 Return tickets sorted by priority descending _(deferred with 1.2)_

## 3. Armor Ticket Generation

- [x] 3.1 For each location with `armor lost > 0`: create one
      `kind: "armor"` ticket per location
- [ ] 3.2 `cbillCost` = armor-lost × armor C-Bill cost per point _(deferred
      — needs cost tables; Wave 5 pricing pass)_
- [x] 3.3 `expectedHours` = armor-lost × hours-per-armor-point (0.1 h/pt)
- [ ] 3.4 Priority = `NORMAL` _(deferred with 1.2)_
- [x] 3.5 `partsRequired` = `[{ partId: "standard-armor-pt", quantity:
armor-lost, matched: false }]`

## 4. Structure Ticket Generation

- [x] 4.1 For each location with `structure lost > 0`: create one
      `kind: "structure"` ticket
- [ ] 4.2 `cbillCost` = structure-lost × structure C-Bill cost per point
      _(deferred with 3.2)_
- [x] 4.3 `expectedHours` = structure-lost × hours-per-structure-point
      (0.5 h/pt)
- [ ] 4.4 Priority = `CRITICAL` if location is CT, `HIGH` if side torso,
      else `NORMAL` _(deferred with 1.2)_

## 5. Destroyed Component Ticket Generation

- [x] 5.1 For each entry in `destroyedComponents`: create one
      `kind: "component"` ticket
- [ ] 5.2 `cbillCost` = component market value × discount _(deferred with
      3.2)_
- [x] 5.3 `expectedHours` = component install hours (4 h flat)
- [ ] 5.4 Priority by component type _(deferred with 1.2)_
- [x] 5.5 `partsRequired` = `[{ partId: component name, quantity: 1,
matched: false }]`

## 6. Ammo Ticket Generation

- [x] 6.1 For each ammo bin where `ammoRemaining < max`: create one
      `kind: "ammo"` ticket per bin
- [ ] 6.2 `cbillCost` = missing-rounds × market-price-per-round _(deferred
      with 3.2)_
- [x] 6.3 `expectedHours` = 0.5 h flat per bin restock
- [ ] 6.4 Priority = `LOW` _(deferred with 1.2)_

## 7. Parts Match Against Inventory

- [x] 7.1 `matchPartsAgainstSalvage(ticket, salvagePool)` — scans the
      ticket's `partsRequired`; if a salvage entry has matching `partId`
      and sufficient quantity, marks `matched = true` and records source
- [ ] 7.2 Salvage prioritization vs general inventory _(deferred — Sub-Branch
      3a salvage rules ship first; this branch matches against the salvage
      pool only when present, otherwise leaves parts unmatched for Wave 5)_
- [x] 7.3 Status flips `parts-needed → queued` when all requirements
      become matched

## 8. Repair Queue Builder Processor

- [x] 8.1 Create `src/lib/campaign/processors/repairQueueBuilderProcessor.ts`
- [ ] 8.2 Runs AFTER `salvageProcessor` _(Wave 5 reorders — current
      registration is `DayPhase.UNITS` with append-order; order is tolerant
      because parts matching is optional)_
- [ ] 8.3 Runs BEFORE `maintenanceProcessor` _(Wave 5 reorders)_
- [x] 8.4 For each unit on each pending outcome with both
      `IUnitCombatState` and `IUnitMaxState` available: call
      `buildTicketsFromUnitState`, then `matchPartsAgainstSalvage`, then
      enqueue into `campaign.repairQueue`
- [x] 8.5 Fire `repair-tickets-created` event with ticket count and
      match ID per outcome
- [x] 8.6 Idempotency: deterministic `ticketId` keyed off `(matchId,
      unitId, kind, discriminator)` — duplicates are filtered before
      append

## 9. Integration with Existing Repair System

- [ ] 9.1 Use existing repair ticket repository if present _(deferred —
      no typed `IRepairTicket` repository exists yet; existing UI uses
      ad-hoc shapes. This branch introduces the canonical type;
      `add-post-battle-review-ui` (Wave 4) adopts it)_
- [x] 9.2 Existing `IRepairTicket` did NOT exist as a typed interface —
      this branch is the source of truth
- [ ] 9.3 Existing `maintenance` day processor ticks down `expectedHours`
      _(deferred — maintenance processor currently consumes ad-hoc
      shapes; Wave 4 adopts the typed model)_

## 10. Tests

- [x] 10.1 Unit: 5 armor lost on LT → one armor ticket with hours = 0.5
- [x] 10.2 Unit: CT structure lost → structure ticket with hours per
      MekHQ-style estimate
- [x] 10.3 Unit: Destroyed component → component ticket with
      `partsRequired = [{ partId: <name>, quantity: 1 }]` and status
      `parts-needed`
- [x] 10.4 Unit: Ammo depletion → ammo ticket per bin
- [x] 10.5 Unit: Parts match against salvage inventory flips status
- [ ] 10.6 Integration: Full outcome → postBattle → salvage → repairQueue
      → matched tickets in queue _(deferred — depends on Wave 2 + 3a
      shipping; processor tests cover the repair-queue half)_
- [x] 10.7 Regression: Same outcome + same state → idempotent; second
      run adds no new tickets

## 11. Error Handling & Edge Cases

- [ ] 11.1 Unit with `finalStatus: DESTROYED` → NO tickets _(deferred —
      depends on Wave 1 outcome shape including finalStatus; today the
      builder skips units lacking unit-max state, which covers the
      written-off case if Wave 2 omits max state for destroyed units)_
- [ ] 11.2 Missing market price fallback _(deferred with 3.2)_
- [ ] 11.3 Extreme damage `writeOffRecommended` flag _(deferred — Wave 4
      review-ui surface)_
