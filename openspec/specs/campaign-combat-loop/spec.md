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
stamped with campaign linkage. The launched encounter's player force SHALL contain every roster unit selected at mission launch — each with its canonical `unitRef` and its assigned pilot's `pilotRef` — and an opponent force sized to the player deployment. Roster units that cannot resolve to a canonical `unitRef` SHALL block launch with a per-unit reason; the system SHALL NOT substitute fallback units. The materialization contract is transport-agnostic: the roster-parity, opponent-sizing, and unresolvable-unit-blocking guarantees SHALL hold identically whether the `/api/forces` and `/api/encounters` handlers are reached through a live browser fetch or through an in-process fetch implementation that invokes the same handler modules directly (the headless campaign fast-forward path).

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

#### Scenario: Materialization contract holds under an in-process fetch implementation

- **GIVEN** a headless fast-forward run materializing an encounter for N selected roster units through an injected in-process fetch implementation backed by the real `/api/forces` and `/api/encounters` handler modules
- **WHEN** the encounter is materialized
- **THEN** the player force SHALL carry N assignments with each unit's `unitRef` and its pilot's `pilotRef` preserved
- **AND** the opponent force SHALL be sized to N
- **AND** a roster unit with no resolvable canonical `unitRef` SHALL block materialization with a per-unit reason, identically to the live browser transport

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

### Requirement: Launched Campaign Sessions Start Battle-Ready

A campaign-launched interactive session SHALL start with every deployed unit carrying its full canonical armor and structure values, and advancing out of the Initiative phase SHALL NOT produce a terminal battle outcome unless combat or withdrawal events justify it.

#### Scenario: Fresh campaign battle survives the initiative roll

- **GIVEN** a freshly launched campaign mission with four player units and four opponent units
- **WHEN** the player activates the Initiative-phase progression control once
- **THEN** the session SHALL advance to the Movement phase with all eight units alive
- **AND** no terminal outcome (victory, defeat, or draw) SHALL be recorded
- **AND** every unit's armor and structure SHALL match its canonical record (no zero-HP units at battle start)

#### Scenario: Terminal outcomes require justifying events

- **WHEN** an interactive session records a terminal outcome
- **THEN** the session event log SHALL contain the combat, withdrawal, or concession events that produced that outcome (a terminal outcome with no preceding combat events is a defect)

### Requirement: Engine-Derived Outcome Pilot Attribution

Unit combat deltas derived from a completed session SHALL carry the unit's pilot linkage — the session unit's `pilotRef` — alongside the session-scoped unit id, and post-battle outcome application SHALL resolve campaign roster entries and vault pilots by that pilot linkage when present, falling back to the legacy unit-id key only when the linkage is absent (previously persisted outcomes and hand-built fixtures). Kill attribution SHALL continue to be looked up by the session unit id against the after-action report's per-unit rows. A delta whose pilot linkage resolves to no roster entry (opponent units, NPC or inline-statblock crews) SHALL skip pilot updates without failing the outcome application, exactly as an unresolvable unit id does today. Session unit ids are session-scoped composites (side–slot–unitRef) and SHALL NOT be treated as roster pilot ids; no test SHALL rig roster pilot ids to session-unit-id-shaped strings to force resolution.

#### Scenario: An engine-derived outcome grants XP to the assigned pilot

- **GIVEN** a completed campaign-linked session whose player units carry vault pilot ids in `pilotRef` and session-scoped composite unit ids
- **WHEN** the derived outcome is applied by post-battle processing
- **THEN** each assigned pilot's roster entry SHALL be resolved via the delta's pilot linkage
- **AND** SHALL receive its XP, mission-count, and kill updates

#### Scenario: Outcomes without pilot linkage keep the legacy resolution

- **GIVEN** a persisted or hand-built outcome whose unit deltas carry no pilot linkage
- **WHEN** the outcome is applied
- **THEN** roster resolution SHALL fall back to the delta's unit id, preserving pre-existing behavior

#### Scenario: Unresolvable pilot linkage skips without failing

- **GIVEN** an outcome delta whose pilot linkage matches no campaign roster entry
- **WHEN** the outcome is applied
- **THEN** pilot updates for that delta SHALL be skipped with a logged warning
- **AND** the remainder of the outcome SHALL apply normally

