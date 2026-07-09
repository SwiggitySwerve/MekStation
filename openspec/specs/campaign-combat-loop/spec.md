# campaign-combat-loop Specification

## Purpose

Defines Campaign Combat Loop requirements for Frozen Post-Battle Inventory Schema, Scenario-Event to Encounter Bridge, Scenario Bridge Idempotency, and Campaign-Linked Encounter Launch, preserving the source-of-truth scope introduced by archived change add-campaign-combat-loop.
## Requirements
### Requirement: Frozen Post-Battle Inventory Schema

The system SHALL define a frozen `ICampaignInventory` schema aggregating repair,
salvage, and medical state into one campaign-attached structure. Every field
MUST be read-only, and the schema MUST NOT be altered by consuming UI changes.

#### Scenario: Inventory carries the three bays and a summary

- **GIVEN** a campaign with post-battle repair, salvage, and medical state
- **WHEN** an `ICampaignInventory` is constructed
- **THEN** it SHALL carry `repairBay`, `salvageBay`, `medicalBay`, and `summary`
- **AND** each bay item type SHALL be read-only in every field

#### Scenario: Bay items project from existing engine types

- **GIVEN** an `IRepairTicket` and an `ISalvageCandidate` from the existing engines
- **WHEN** they are projected into `IRepairBayItem` and `ISalvageBayItem`
- **THEN** every `IRepairBayItem` field SHALL be derivable from `IRepairTicket`
- **AND** every `ISalvageBayItem` field SHALL be derivable from `ISalvageCandidate`

### Requirement: Scenario-Event to Encounter Bridge

The system SHALL consume `scenario_generated` day events and persist a
launchable `IEncounter` for each, carrying campaign linkage back to the
originating contract and scenario.

#### Scenario: A generated scenario becomes a launchable encounter

- **GIVEN** a day pipeline run that emits a `scenario_generated` event with `scenarioId` S and `contractId` C
- **WHEN** the scenario-encounter bridge processor runs
- **THEN** a launchable `IEncounter` SHALL be persisted through the encounter store
- **AND** the encounter SHALL carry `campaignMeta` with `campaignId`, `contractId` C, and `scenarioId` S

#### Scenario: Encounter is built from scenario data and the contract

- **GIVEN** a `scenario_generated` event carrying `opForBV`, `scenarioType`, and conditions
- **WHEN** `buildEncounterFromScenario` runs
- **THEN** the encounter's OpFor force SHALL be BV-matched to `opForBV`
- **AND** the encounter's victory conditions SHALL be derived from `scenarioType`
- **AND** the encounter's map config SHALL be derived from the scenario conditions

#### Scenario: Bridge runs after scenario generation

- **GIVEN** the day pipeline's phase ordering
- **WHEN** the day is processed
- **THEN** `scenarioGenerationProcessor` SHALL run before the scenario-encounter bridge processor

### Requirement: Scenario Bridge Idempotency

The system SHALL bridge each `scenario_generated` event to an encounter at most
once, keyed by `scenarioId`.

#### Scenario: A re-run does not duplicate the encounter

- **GIVEN** a scenario with id S already bridged to an encounter
- **WHEN** the bridge processor runs again on a day carrying the same `scenario_generated` event
- **THEN** no second encounter SHALL be created for scenario S
- **AND** `campaign.bridgedScenarioIds` SHALL still contain S exactly once

### Requirement: Campaign-Linked Encounter Launch

The system SHALL launch a campaign-generated encounter into a `GameSession`
stamped with campaign linkage. The launched encounter's player force SHALL contain every roster unit selected at mission launch — each with its canonical `unitRef` and its assigned pilot's `pilotRef` — and an opponent force sized to the player deployment. Roster units that cannot resolve to a canonical `unitRef` SHALL block launch with a per-unit reason; the system SHALL NOT substitute fallback units.

#### Scenario: Launching a generated encounter creates a linked session

- **GIVEN** a persisted campaign-generated encounter for campaign C, contract K, scenario S
- **WHEN** the player launches the encounter from the campaign
- **THEN** a `GameSession` SHALL be created from the encounter launch snapshot
- **AND** the session SHALL carry `campaignId` C, `contractId` K, and `scenarioId` S

#### Scenario: Full mission selection reaches the player force

- **GIVEN** a mission launch with four ready roster units, each with a canonical `unitRef` and an assigned pilot
- **WHEN** the encounter is materialized
- **THEN** the player force SHALL contain four assignments, one per selected unit, each carrying that unit's `unitRef` and its pilot's `pilotRef`
- **AND** the created session SHALL contain four player units whose pilots resolve to the assigned vault pilots (no "Unknown Pilot" for assigned crews)

#### Scenario: Opponent force is sized to the player deployment

- **WHEN** an encounter is materialized for a mission launch with N selected player units
- **THEN** the opponent force SHALL contain N units with canonical `unitRef`s selected deterministically for the encounter (repeat materializations of the same encounter yield the same opponent force)

#### Scenario: Unresolvable roster unit blocks launch

- **GIVEN** a selected roster unit with no resolvable canonical `unitRef`
- **WHEN** the player attempts to launch the mission
- **THEN** the launch SHALL be blocked and the readiness surface SHALL name the unit and the reason
- **AND** no encounter, force, or session SHALL be created with a substituted unit

### Requirement: Automatic Outcome Enqueue

The system SHALL automatically enqueue the combat outcome of a campaign-linked
session onto the originating campaign's `pendingBattleOutcomes`, while ignoring
sessions without campaign linkage.

#### Scenario: Campaign-linked completion enqueues the outcome

- **GIVEN** a campaign-linked session for campaign C that completes and publishes `CombatOutcomeReady`
- **WHEN** the campaign store handles the event
- **THEN** the outcome SHALL be appended to campaign C's `pendingBattleOutcomes`

#### Scenario: Standalone skirmish is ignored

- **GIVEN** a session without campaign linkage that completes and publishes `CombatOutcomeReady`
- **WHEN** the campaign store handles the event
- **THEN** no campaign's `pendingBattleOutcomes` SHALL change

#### Scenario: Duplicate outcome is dropped

- **GIVEN** a campaign-linked outcome with `matchId` M already enqueued
- **WHEN** a second `CombatOutcomeReady` carrying the same `matchId` M arrives
- **THEN** `pendingBattleOutcomes` SHALL remain unchanged

### Requirement: Post-Battle Inventory Projection

The system SHALL project an `ICampaignInventory` from the campaign's repair
tickets, salvage allocations, and roster pilot injury state, after the
battle-effects processor block has drained.

#### Scenario: Projection reflects post-battle state

- **GIVEN** a campaign whose battle-effects processors have produced repair tickets, salvage allocations, and pilot injuries
- **WHEN** the inventory projection runs
- **THEN** the resulting `ICampaignInventory` SHALL list every repair ticket as an `IRepairBayItem`
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

