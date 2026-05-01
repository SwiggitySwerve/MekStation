# game-session-management Specification Delta

## ADDED Requirements

### Requirement: Session Carries Campaign Linkage

Every `IGameSession` launched from an encounter SHALL carry `encounterId`
on its configuration, and when the encounter is generated from a contract
the session SHALL additionally carry `contractId` and `scenarioId`.

#### Scenario: Contract-launched session has full linkage

- **GIVEN** a contract C with generated scenario S and encounter E
- **WHEN** `EncounterService.launchEncounter(E)` returns a session id G
- **THEN** session G's config SHALL include `encounterId = E.id`,
  `contractId = C.id`, `scenarioId = S.id`

#### Scenario: Standalone encounter has encounter id only

- **GIVEN** a standalone encounter without a contract
- **WHEN** `EncounterService.launchEncounter(E)` returns a session id G
- **THEN** session G's config SHALL include `encounterId = E.id`
- **AND** `contractId` and `scenarioId` SHALL be `null`

### Requirement: Session Publishes Outcome Ready Event

Upon session completion, the `InteractiveSession` SHALL publish a
`CombatOutcomeReady` event on the global event bus carrying the session
id, match id, and derived `ICombatOutcome`.

#### Scenario: Event published on completion

- **GIVEN** an active session that transitions to `Completed`
- **WHEN** the completion handler runs
- **THEN** `CombatOutcomeReady` SHALL be published on the session bus
- **AND** the event payload SHALL include the full `ICombatOutcome`
- **AND** the outcome SHALL also be POSTed to `/api/matches`

#### Scenario: Event idempotent per session

- **GIVEN** a session that has already published `CombatOutcomeReady`
  once
- **WHEN** any subsequent action on the session attempts another
  publication
- **THEN** no second `CombatOutcomeReady` SHALL be published for the
  same match id

### Requirement: Campaign Store Enqueues Outcomes

The campaign store SHALL subscribe to `CombatOutcomeReady` and append the
outcome to `campaign.pendingBattleOutcomes` when received, ignoring
duplicates by `matchId`.

#### Scenario: New outcome appended

- **GIVEN** a campaign with an empty `pendingBattleOutcomes` queue
- **WHEN** a `CombatOutcomeReady` event arrives carrying outcome O
- **THEN** `pendingBattleOutcomes` SHALL equal `[O]`

#### Scenario: Duplicate outcome ignored

- **GIVEN** a campaign with `pendingBattleOutcomes` already containing
  outcome O (by matchId)
- **WHEN** another `CombatOutcomeReady` arrives carrying the same matchId
- **THEN** the queue SHALL remain unchanged

### Requirement: Day Advancement Applies Pending Outcomes

When the player advances the day, the day pipeline SHALL drain
`campaign.pendingBattleOutcomes` through the `postBattleProcessor`,
`salvageProcessor`, and `repairQueueBuilderProcessor` in that order before
any other day processors run.

#### Scenario: Processors execute in required order

- **GIVEN** a campaign with `pendingBattleOutcomes = [O1]` at the start
  of day advancement
- **WHEN** the pipeline executes
- **THEN** `postBattleProcessor(O1)` SHALL run first
- **AND** `salvageProcessor(O1)` SHALL run second
- **AND** `repairQueueBuilderProcessor(O1)` SHALL run third
- **AND** all three SHALL complete before `contractProcessor`,
  `healingProcessor`, and `maintenanceProcessor` run

#### Scenario: Drained outcomes move to processedBattleIds

- **GIVEN** a successful run through the three battle-effects processors
  for outcome O1 with matchId M
- **WHEN** the pipeline finishes the battle-effects block
- **THEN** O1 SHALL be removed from `pendingBattleOutcomes`
- **AND** `M` SHALL be appended to `campaign.processedBattleIds`
