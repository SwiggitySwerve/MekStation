# acquisition-supply-chain Specification Delta

## ADDED Requirements

### Requirement: Repair Tickets Declare Part Requirements

> DEFERRED field-name alignment to Wave 5: this wave ships `partId`
> (not `partName`) and `kind` (not `workType`) on the ticket and the
> requirement payload. Semantics are identical — `partId` is the
> component's catalog identifier and serves as both lookup key and
> human-readable name today. Wave 5 review-ui adds `partName`
> separately if the surface needs a localized display label.
> Implementation: `src/types/campaign/RepairTicket.ts:55-70` and
> `src/lib/campaign/repair/repairQueueBuilder.ts:163-232`.

Every `IRepairTicket` with `workType = "component"` or `workType = "armor"` SHALL declare a `partsRequired` list so the acquisition system can surface unmet demand.

#### Scenario: Component ticket declares part

- **GIVEN** a component ticket to reinstall a Medium Laser
- **WHEN** the ticket is built
- **THEN** `partsRequired` SHALL contain
  `{ partName: "Medium Laser", quantity: 1, matched: false }`

#### Scenario: Armor ticket declares armor tonnage

- **GIVEN** an armor ticket for 10 points of standard IS armor
- **WHEN** the ticket is built
- **THEN** `partsRequired` SHALL contain
  `{ partName: "Armor (Standard IS)", quantity: 10, matched: false }`

### Requirement: Inventory Matching Prioritizes Salvage

> DEFERRED to Wave 5: a unified `IInventoryPool` (salvage + purchased +
> faction-stocked) does not yet exist on `ICampaign`. This wave matches
> against the salvage pool only (Sub-Branch 3a output) — see
> `matchPartsAgainstSalvage` at
> `src/lib/campaign/repair/repairQueueBuilder.ts:282-318`. Salvage
> prioritization is naturally satisfied because salvage is the ONLY
> source consulted today; the "salvage first" ordering becomes
> meaningful once Wave 5 introduces the general inventory pool.

The queue builder SHALL attempt to satisfy each `partsRequired` entry from
campaign inventory, prioritizing items tagged `source: "salvage"` before
general inventory.

#### Scenario: Salvage item satisfies requirement first

- **GIVEN** a repair ticket requiring 1 Medium Laser and an inventory
  containing 1 salvaged Medium Laser and 1 purchased Medium Laser
- **WHEN** `matchPartsRequired(tickets, inventory)` runs
- **THEN** the ticket SHALL be matched against the salvaged Medium Laser
  first
- **AND** `matchedFromInventoryId` SHALL reference the salvaged item
- **AND** the purchased Medium Laser SHALL remain in inventory

#### Scenario: Unmatched requirement surfaces to acquisition

- **GIVEN** a ticket requiring a part with no matching inventory entry
- **WHEN** `matchPartsRequired` runs
- **THEN** the ticket's `partsRequired` entry SHALL retain
  `matched = false`
- **AND** the acquisition system SHALL be able to enumerate all
  unmatched requirements across all open tickets for procurement
  planning

### Requirement: Matched Parts Consumed On Repair Start

> DEFERRED to Wave 4 / 5: inventory reservation is owned by the
> (forthcoming) `maintenanceProcessor` that ticks tickets from `queued`
> to `in-progress`. This wave's responsibility ends at marking parts
> matched (`partsRequired[i].matched = true` and the
> `matchedFromInventoryId` reference). Reservation semantics are
> orthogonal to ticket creation and ship with the maintenance
> processor in Wave 4.

Matched inventory items SHALL be reserved (and unavailable to other tickets) when a repair ticket with fully-matched `partsRequired` begins work.

#### Scenario: Reserved part is not reusable

- **GIVEN** a ticket with a matched Medium Laser reserved from inventory
- **WHEN** another ticket's `matchPartsRequired` pass runs
- **THEN** the reserved Medium Laser SHALL NOT be available for matching
- **AND** the other ticket SHALL show the unmatched Medium Laser
  requirement until additional inventory arrives
