# repair-maintenance Specification Delta

## ADDED Requirements

### Requirement: Post-Battle Ticket Source

The `IRepairTicket` model SHALL carry a `source` field distinguishing
`"post_battle"` tickets (created by the repair queue builder) from
`"maintenance"` tickets (periodic wear-and-tear) and `"manual"` tickets
(user-created).

#### Scenario: Post-battle tickets are tagged

- **GIVEN** a `repairQueueBuilderProcessor` run that creates tickets from
  an outcome
- **WHEN** the tickets are persisted
- **THEN** each ticket's `source` SHALL be `"post_battle"`
- **AND** each ticket's `sourceBattleId` SHALL equal the outcome's
  `matchId`

#### Scenario: Manual tickets are distinguishable

- **GIVEN** a ticket the user created via the manual-repair UI
- **WHEN** the ticket is persisted
- **THEN** `source` SHALL be `"manual"`
- **AND** `sourceBattleId` SHALL be `null`

### Requirement: Idempotent Queue Building Per Battle

The repair queue builder SHALL be idempotent per `{unitId, matchId}`.
Rerunning after the tickets have already been created SHALL NOT produce
duplicates.

#### Scenario: Same unit, same battle yields no duplicate tickets

- **GIVEN** a campaign where unit U has post-battle tickets from match M
  already enqueued
- **WHEN** `repairQueueBuilderProcessor` runs again for the same unit and
  match
- **THEN** no additional tickets SHALL be enqueued
- **AND** the processor SHALL skip unit U for match M

#### Scenario: Same unit, different battle yields new tickets

- **GIVEN** a unit with post-battle tickets from match M1
- **WHEN** the processor runs for a new match M2 on the same unit
- **THEN** tickets for M2 SHALL be created
- **AND** M1 tickets SHALL remain untouched

### Requirement: Ticket Hour Estimation

Each ticket SHALL include an `expectedHours` estimate computed from a
repair-hours table per damage type.

#### Scenario: Armor point hours

- **GIVEN** a ticket to replace 10 armor points
- **WHEN** the ticket is built
- **THEN** `expectedHours` SHALL equal `10 × ARMOR_HOURS_PER_POINT`
  from the repair-hours table

#### Scenario: Component hours

- **GIVEN** a ticket to reinstall a Medium Laser
- **WHEN** the ticket is built
- **THEN** `expectedHours` SHALL equal the Medium Laser's install-hours
  value from the repair-hours table (or its weight-tier default when a
  component-specific value is not defined)

### Requirement: Runs Between Salvage And Maintenance

The `repairQueueBuilderProcessor` SHALL run after the `salvageProcessor`
and before the existing `maintenanceProcessor` in the day pipeline.

#### Scenario: Ordering in day pipeline

- **GIVEN** a day advancement that includes `salvageProcessor`,
  `repairQueueBuilderProcessor`, and `maintenanceProcessor`
- **WHEN** the pipeline executes
- **THEN** the processors SHALL execute in the order
  salvage → repair queue builder → maintenance
- **AND** the ordering SHALL be documented in `dayPipeline.ts`
