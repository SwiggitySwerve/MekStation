# repair-maintenance Delta — close-campaign-economic-loop

## ADDED Requirements

### Requirement: Repair Ticket Completion

The system SHALL advance repair tickets to completion through a registered daily
day-processor that consumes available tech-hours, and on a ticket reaching zero
remaining hours SHALL transition the ticket `completed`, restore the
armor/structure points the ticket was created to repair, and recompute the
unit's `combatReady` state. Ticket advancement SHALL be deterministic and
idempotent: a completed ticket SHALL NOT re-apply its restoration when the day
pipeline is re-run. There SHALL be exactly one completion authority — the
`useRepairStore.advanceRepairs` path SHALL NOT be a second, parallel authority.

#### Scenario: Tech-hours advance a queued ticket to completion

- **GIVEN** a campaign with a `queued` repair ticket recording armor/structure to restore
- **WHEN** the daily repair-progress processor runs on enough successive days to
  consume the ticket's required tech-hours
- **THEN** the ticket SHALL transition `queued → in-progress → completed`
- **AND** on completion the unit's repaired armor/structure SHALL be restored to the
  recorded points clamped to each location's maximum
- **AND** the unit's `combatReady` state SHALL be recomputed.

#### Scenario: Completion is idempotent across pipeline re-runs

- **GIVEN** a repair ticket already marked `completed` with its restoration applied
- **WHEN** the day pipeline is re-run over the same day
- **THEN** the ticket SHALL remain `completed`
- **AND** the unit's armor/structure SHALL NOT be restored a second time.

#### Scenario: A ticket whose required part is unavailable waits

- **GIVEN** a repair ticket requiring a part not present in the campaign parts inventory
- **WHEN** the repair-progress processor runs
- **THEN** the ticket SHALL NOT transition to `completed`
- **AND** it SHALL wait until the required part becomes available in the inventory.

#### Scenario: Tech-hour budget is exhausted across competing tickets

- **GIVEN** two in-progress tickets whose combined required hours exceed the day's
  available tech-hours
- **WHEN** the repair-progress processor runs for one day
- **THEN** the processor SHALL consume the available tech-hours and advance tickets up
  to that budget
- **AND** the remaining unfunded ticket SHALL stay short of completion until a later day.
