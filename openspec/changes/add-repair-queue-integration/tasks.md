# Tasks: Add Repair Queue Integration

## 1. Type Definitions

- [ ] 1.1 Define/extend `IRepairTicket` with `source` (`"post_battle" |
"maintenance" | "manual"`), `workType` (`"armor" | "structure" |
"component" | "ammo"`), `expectedHours`, `priority`,
      `partsRequired`, `sourceBattleId`
- [ ] 1.2 Define `RepairPriority` enum: `CRITICAL`, `HIGH`, `NORMAL`, `LOW`
- [ ] 1.3 Define `IRepairPartRequirement` with `partName`, `quantity`,
      `matched` (`boolean`), `matchedFromInventoryId`

## 2. Queue Builder Core

- [ ] 2.1 Create `src/lib/campaign/repair/repairQueueBuilder.ts`
- [ ] 2.2 Export `buildTickets(unit, combatState, outcome): IRepairTicket[]`
- [ ] 2.3 Return tickets sorted by priority descending

## 3. Armor Ticket Generation

- [ ] 3.1 For each location with `armorLostPerLocation > 0`: create one
      `workType: "armor"` ticket per location
- [ ] 3.2 `cbillCost` = armor-lost × armor C-Bill cost per point (per tech
      rating + armor type)
- [ ] 3.3 `expectedHours` = armor-lost × hours-per-armor-point from repair
      table
- [ ] 3.4 Priority = `NORMAL`
- [ ] 3.5 `partsRequired` = `[{ partName: "Armor (<type>)", quantity:
armor-lost, matched: false }]`

## 4. Structure Ticket Generation

- [ ] 4.1 For each location with `structureLostPerLocation > 0`: create
      one `workType: "structure"` ticket
- [ ] 4.2 `cbillCost` = structure-lost × structure C-Bill cost per point
- [ ] 4.3 `expectedHours` = structure-lost × hours-per-structure-point
- [ ] 4.4 Priority = `CRITICAL` if location is CT, `HIGH` if side torso,
      else `NORMAL`

## 5. Destroyed Component Ticket Generation

- [ ] 5.1 For each entry in `destroyedComponents`: create one
      `workType: "component"` ticket
- [ ] 5.2 `cbillCost` = component market value × (0.5 for salvage-match
      discount, else 1.0)
- [ ] 5.3 `expectedHours` = component install hours from repair table
- [ ] 5.4 Priority = `CRITICAL` for engine/gyro/life support, `HIGH` for
      cockpit/sensors, `NORMAL` for weapons/heat sinks
- [ ] 5.5 `partsRequired` = `[{ partName: component name, quantity: 1,
matched: false }]`

## 6. Ammo Ticket Generation

- [ ] 6.1 For each ammo type with `ammoRemaining < construction max`:
      create one `workType: "ammo"` ticket per ammo type
- [ ] 6.2 `cbillCost` = missing-rounds × market-price-per-round
- [ ] 6.3 `expectedHours` = 1 hour per ton of ammo replaced (quick install)
- [ ] 6.4 Priority = `LOW` (mech can still deploy with partial ammo)

## 7. Parts Match Against Inventory

- [ ] 7.1 `matchPartsRequired(tickets, inventory)` — scan each ticket's
      `partsRequired`; if an inventory item with matching name and
      sufficient quantity exists, mark `matched = true` and record source
- [ ] 7.2 Salvage awards tagged `source: "salvage"` in inventory are
      prioritized for matching (consumes salvage first)
- [ ] 7.3 Return count of unmatched requirements per ticket

## 8. Repair Queue Builder Processor

- [ ] 8.1 Create `src/lib/campaign/processors/repairQueueBuilderProcessor.ts`
- [ ] 8.2 Runs AFTER `salvageProcessor` (so salvage inventory is populated
      before matching)
- [ ] 8.3 Runs BEFORE `maintenanceProcessor` (so new tickets can be ticked
      down on the same day)
- [ ] 8.4 For each unit on the player's roster with `IUnitCombatState`
      updated this turnover: call `buildTickets`, then `matchPartsRequired`,
      then enqueue into the existing repair queue
- [ ] 8.5 Fire `RepairTicketsCreated` event with ticket count and total
      cost per unit
- [ ] 8.6 Idempotency: compound key `{unitId, sourceBattleId}` — skip
      unit/battle combinations already processed

## 9. Integration with Existing Repair System

- [ ] 9.1 Use existing repair ticket repository if present — do NOT create
      a parallel store
- [ ] 9.2 If the existing `IRepairTicket` lacks any new fields (e.g.,
      `source`, `sourceBattleId`), extend the model and migrate existing
      tickets with default `source: "manual"`
- [ ] 9.3 Existing `maintenance` day processor ticks down `expectedHours`
      on all tickets regardless of source

## 10. Tests

- [ ] 10.1 Unit: 10 armor lost → one armor ticket with cost = 10 × rate,
      hours = 10 × hours-rate
- [ ] 10.2 Unit: CT structure lost → priority CRITICAL ticket
- [ ] 10.3 Unit: Destroyed engine → priority CRITICAL ticket, partsRequired
      = `[{ partName: "Engine", quantity: 1 }]`
- [ ] 10.4 Unit: Ammo depletion → LOW-priority ammo ticket per ammo type
- [ ] 10.5 Unit: Parts match against salvage inventory first, then general
      inventory
- [ ] 10.6 Integration: Full outcome → postBattle → salvage → repairQueue
      → matched tickets in queue
- [ ] 10.7 Regression: Same outcome + same state → idempotent; second run
      adds no new tickets

## 11. Error Handling & Edge Cases

- [ ] 11.1 Unit with `finalStatus: DESTROYED` → NO tickets (the unit is
      written off; no repair possible)
- [ ] 11.2 Missing market price for a salvageable part → fall back to
      book value from equipment database; log warning if that's also
      missing
- [ ] 11.3 Extremely damaged unit (all locations crippled) → generate
      tickets but flag the unit record with `writeOffRecommended: true`
      for UI surfacing
