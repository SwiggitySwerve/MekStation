# game-session-management Specification Delta

## ADDED Requirements

### Requirement: Pending Outcome Queue

The campaign state SHALL maintain a `pendingBattleOutcomes: ICombatOutcome[]`
queue. Completed sessions push their outcome onto this queue, and the
`PostBattleProcessor` drains it during the next day-advancement.

#### Scenario: Completed session pushes outcome to queue

- **GIVEN** a campaign with an active contract and a session that just
  emitted `GameEnded`
- **WHEN** the session's `CombatOutcomeReady` event fires
- **THEN** `outcome` SHALL be appended to `campaign.pendingBattleOutcomes`
- **AND** the session SHALL NOT modify any other campaign state directly

#### Scenario: Day advancement drains the queue

- **GIVEN** a campaign with `pendingBattleOutcomes = [O1, O2]`
- **WHEN** day advancement runs
- **THEN** the `PostBattleProcessor` SHALL call `applyPostBattle(O1)` and
  `applyPostBattle(O2)` in order
- **AND** on success, both outcomes SHALL be removed from the queue and
  added to `campaign.processedBattleIds`

#### Scenario: Failed application keeps outcome in queue

- **GIVEN** a campaign where `applyPostBattle(O1)` throws (e.g., corrupt
  outcome data)
- **WHEN** day advancement runs
- **THEN** `O1` SHALL remain on `pendingBattleOutcomes`
- **AND** a campaign-level error SHALL be recorded for surfacing in the UI
- **AND** later outcomes in the queue MAY still be processed

### Requirement: Processor Ordering In Day Pipeline

The `postBattleProcessor` SHALL run at a well-defined position in the day
pipeline so downstream processors see the updated state.

#### Scenario: Runs before contract and healing processors

- **GIVEN** a day advancement with pending outcomes, active contracts, and
  wounded pilots
- **WHEN** the pipeline executes
- **THEN** `postBattleProcessor` SHALL run before `contractProcessor`
- **AND** `postBattleProcessor` SHALL run before `healingProcessor`
- **AND** the ordering SHALL be documented in `dayPipeline.ts`

#### Scenario: Runs after income and acquisition processors

- **GIVEN** a day advancement with pending outcomes and scheduled income
- **WHEN** the pipeline executes
- **THEN** income/financial processors SHALL have already run before
  `postBattleProcessor` (battle results do not directly produce income)
