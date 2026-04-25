# personnel-management Specification Delta

## ADDED Requirements

### Requirement: Post-Battle Pilot XP Application

The `PostBattleProcessor` SHALL award XP to each participating pilot based on the pilot's `IPilotOutcome` data and the campaign's configured XP thresholds when an `ICombatOutcome` is applied.

#### Scenario: Pilot receives scenario XP

- **GIVEN** a pilot that participated in a completed battle
- **WHEN** `applyPostBattle(outcome, campaign)` is called
- **THEN** `awardScenarioXP(pilot, options)` SHALL be invoked
- **AND** the resulting `IXPAwardEvent` SHALL be applied via
  `applyXPAward`
- **AND** the pilot's `xp` and `totalXpEarned` SHALL increase by
  `options.scenarioXP`

#### Scenario: Pilot receives kill XP above threshold

- **GIVEN** a pilot with 3 kills in `outcome` and a `killXP` threshold of 2
- **WHEN** `applyPostBattle(outcome, campaign)` is called
- **THEN** `awardKillXP(pilot, 3, options)` SHALL award
  `floor(3 / 2) * killXP` points
- **AND** the event SHALL be applied to the pilot

#### Scenario: Pilot receives mission XP based on winner side

- **GIVEN** a pilot on the winning side of a SUCCESS mission
- **WHEN** `applyPostBattle(outcome, campaign)` is called
- **THEN** `awardMissionXP(pilot, "SUCCESS", options)` SHALL be called with
  the mission-success XP amount
- **AND** for a losing pilot, `awardMissionXP(pilot, "FAILURE", options)`
  SHALL be called

### Requirement: Post-Battle Pilot Status Application

Each `IPilotOutcome.finalStatus` SHALL map to a deterministic personnel
status change applied by the `PostBattleProcessor`.

#### Scenario: Active pilot status unchanged

- **GIVEN** a pilot with `finalStatus = ACTIVE`
- **WHEN** `applyPostBattle` is called
- **THEN** the pilot's personnel status SHALL remain unchanged
- **AND** `medical.wounds` SHALL remain unchanged

#### Scenario: Wounded pilot enters medical queue

- **GIVEN** a pilot with `finalStatus = WOUNDED` and `woundsTaken = 2`
- **WHEN** `applyPostBattle` is called
- **THEN** `person.medical.wounds` SHALL increase by 2
- **AND** the pilot SHALL be enqueued in the medical/healing queue
- **AND** `person.personnelStatus` SHALL be set to `WOUNDED`

#### Scenario: Unconscious pilot flagged for medical observation

- **GIVEN** a pilot with `finalStatus = UNCONSCIOUS`
- **WHEN** `applyPostBattle` is called
- **THEN** `person.personnelStatus` SHALL be set to `WOUNDED`
- **AND** the medical queue entry SHALL be flagged for immediate attention

#### Scenario: KIA pilot removed from active roster

- **GIVEN** a pilot with `finalStatus = KIA`
- **WHEN** `applyPostBattle` is called
- **THEN** `person.personnelStatus` SHALL be set to `KIA`
- **AND** `person.dateOfDeath` SHALL be set to the campaign's current date
- **AND** the pilot SHALL be removed from any assigned unit
- **AND** a `PersonnelStatusChanged` campaign event SHALL fire

#### Scenario: MIA pilot marked missing

- **GIVEN** a pilot with `finalStatus = MIA`
- **WHEN** `applyPostBattle` is called
- **THEN** `person.personnelStatus` SHALL be set to `MIA`
- **AND** the pilot SHALL remain on the roster (unlike KIA) but be
  unassigned from active duty

#### Scenario: Captured pilot goes into prisoner pool

- **GIVEN** a pilot with `finalStatus = CAPTURED`
- **WHEN** `applyPostBattle` is called
- **THEN** `person.personnelStatus` SHALL be set to `CAPTURED`
- **AND** the pilot SHALL be moved to the captured-personnel pool for
  potential prisoner exchange or ransom handling

### Requirement: Idempotent Post-Battle Application

Applying the same `ICombatOutcome` twice SHALL produce no additional
personnel changes beyond those made on the first application.

#### Scenario: Re-application is a no-op

- **GIVEN** a campaign that has already processed `outcome` with
  `matchId = M`
- **WHEN** `applyPostBattle(outcome, campaign)` is called again with the
  same outcome
- **THEN** no XP SHALL be awarded a second time
- **AND** no personnel status changes SHALL occur a second time
- **AND** the processor SHALL return a result marking the outcome as
  already-processed
