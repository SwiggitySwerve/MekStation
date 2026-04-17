# mission-contracts Specification Delta

## ADDED Requirements

### Requirement: Contract Mission Progression From Combat Outcome

The `PostBattleProcessor` SHALL update the referenced contract's mission progression (winner, end reason, scenario objective results) whenever an `ICombatOutcome` carries a `contractId`.

#### Scenario: Player win counts as mission success

- **GIVEN** an outcome with `winner = GameSide.Player`, `endReason = DESTRUCTION`,
  and all scenario objectives met
- **WHEN** `applyPostBattle(outcome, campaign)` is called
- **THEN** the contract's `lastMissionResult` SHALL be set to `SUCCESS`
- **AND** `scenariosPlayed` SHALL increment by 1
- **AND** `missionsSuccessful` SHALL increment by 1

#### Scenario: Player loss counts as mission failure

- **GIVEN** an outcome with `winner = GameSide.Opponent` or player conceded
- **WHEN** `applyPostBattle(outcome, campaign)` is called
- **THEN** the contract's `lastMissionResult` SHALL be set to `FAILURE`
- **AND** `scenariosPlayed` SHALL increment by 1
- **AND** `missionsFailed` SHALL increment by 1

#### Scenario: Turn-limit draw with partial objectives

- **GIVEN** an outcome with `endReason = TURN_LIMIT`, `winner = "draw"`,
  and some scenario objectives met
- **WHEN** `applyPostBattle(outcome, campaign)` is called
- **THEN** the contract's `lastMissionResult` SHALL be set to `PARTIAL`
- **AND** `scenariosPlayed` SHALL increment by 1

#### Scenario: Contract morale updates per AtB table

- **GIVEN** a contract with current morale `NORMAL` and a FAILURE result
- **WHEN** `applyPostBattle` is called
- **THEN** the contract's morale SHALL be reduced toward `BROKEN` or
  `WAVERING` per the AtB morale-update table for losses
- **AND** the processor SHALL call the existing morale-update helper, not
  re-implement the transition logic

### Requirement: Fulfilled Contract Flagging

The `PostBattleProcessor` SHALL flag a contract for final-payment processing by the existing `contractProcessor` once all scenarios required by the contract have been played.

#### Scenario: Final scenario fulfills contract

- **GIVEN** a contract requiring 5 scenarios with `scenariosPlayed = 4`
- **WHEN** `applyPostBattle(outcome, campaign)` runs and increments
  `scenariosPlayed` to 5
- **THEN** the contract SHALL be marked `fulfilled = true`
- **AND** the next `contractProcessor` run SHALL process final payment,
  salvage rights, and closure
