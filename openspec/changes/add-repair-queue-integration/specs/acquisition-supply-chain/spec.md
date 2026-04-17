# acquisition-supply-chain Specification Delta

## ADDED Requirements

### Requirement: Repair Tickets Declare Part Requirements

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

Matched inventory items SHALL be reserved (and unavailable to other tickets) when a repair ticket with fully-matched `partsRequired` begins work.

#### Scenario: Reserved part is not reusable

- **GIVEN** a ticket with a matched Medium Laser reserved from inventory
- **WHEN** another ticket's `matchPartsRequired` pass runs
- **THEN** the reserved Medium Laser SHALL NOT be available for matching
- **AND** the other ticket SHALL show the unmatched Medium Laser
  requirement until additional inventory arrives
