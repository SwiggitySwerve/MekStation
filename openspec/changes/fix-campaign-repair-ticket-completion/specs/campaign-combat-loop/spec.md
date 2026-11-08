## ADDED Requirements

### Requirement: Active Campaign Repair Projection
Campaign bay rows, repair summaries, dashboard depth and mission repair warnings SHALL count only active repair work. Completed, cancelled and projected done tickets SHALL NOT count as outstanding work. Canonical tickets SHALL override stale saved repair projections when present.

#### Scenario: Completed repairs disappear from outstanding work
- **GIVEN** a campaign containing both active and terminal tickets
- **WHEN** its bay, dashboard and readiness are projected
- **THEN** only active tickets SHALL contribute repair rows, hours, counts and warnings

#### Scenario: Old saved projection
- **GIVEN** canonical completed tickets and a stale cached repair projection
- **WHEN** the campaign bay selectors run
- **THEN** terminal tickets SHALL NOT reappear as outstanding work

## MODIFIED Requirements

### Requirement: Post-Battle Inventory Projection

The system SHALL project an `ICampaignInventory` from the campaign's repair
tickets, salvage allocations, and roster pilot injury state, after the
battle-effects processor block has drained.

#### Scenario: Projection reflects post-battle state

- **GIVEN** a campaign whose battle-effects processors have produced repair tickets, salvage allocations, and pilot injuries
- **WHEN** the inventory projection runs
- **THEN** the resulting `ICampaignInventory` SHALL list every active repair ticket as an `IRepairBayItem`, excluding completed and cancelled tickets
- **AND** every salvage candidate as an `ISalvageBayItem`
- **AND** every injured pilot as an `IMedicalBayItem`
- **AND** the `summary` SHALL carry accurate counts and totals

#### Scenario: Empty campaign yields an empty inventory

- **GIVEN** a campaign with no battles fought
- **WHEN** the inventory projection runs
- **THEN** all three bays SHALL be empty
- **AND** the `summary` counts and totals SHALL all be zero

#### Scenario: Projection runs after battle effects

- **GIVEN** the day pipeline's phase ordering
- **WHEN** a day with pending outcomes is processed
- **THEN** the inventory projection SHALL run strictly after `postBattleProcessor`, `salvageProcessor`, and `repairQueueBuilderProcessor`
