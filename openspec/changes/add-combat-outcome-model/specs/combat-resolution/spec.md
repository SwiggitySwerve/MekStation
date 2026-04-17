# combat-resolution Specification Delta

## ADDED Requirements

### Requirement: Terminal Outcome Derivation

Every completed combat session SHALL produce a single `ICombatOutcome` as
its terminal artifact. The session pipeline SHALL NOT be considered complete
until the outcome has been derived and made available to campaign consumers.

#### Scenario: Completion triggers outcome derivation

- **GIVEN** an `InteractiveSession` that emits `GameEnded`
- **WHEN** the session status transitions to `Completed`
- **THEN** `ICombatOutcome` SHALL be derivable via `session.getOutcome()`
- **AND** a `CombatOutcomeReady` event SHALL be emitted to the session event
  stream

#### Scenario: Outcome unavailable before completion

- **GIVEN** an `InteractiveSession` with status `InProgress`
- **WHEN** `session.getOutcome()` is called
- **THEN** `CombatNotCompleteError` SHALL be thrown

### Requirement: Outcome Carries Scenario Linkage

`ICombatOutcome` SHALL carry `encounterId`, `contractId`, and `scenarioId`
fields populated from the session's configuration, enabling downstream
campaign processors to route effects back to the correct campaign entities.

#### Scenario: Encounter-launched session carries encounter id

- **GIVEN** a session launched by `EncounterService.launchEncounter`
- **WHEN** the session completes and outcome is derived
- **THEN** `outcome.encounterId` SHALL equal the source encounter's id
- **AND** `outcome.contractId` SHALL equal the encounter's contract id when
  the encounter was generated from a contract
- **AND** `outcome.scenarioId` SHALL equal the encounter's scenario id when
  the encounter was generated from a scenario template

#### Scenario: Standalone skirmish has null linkage

- **GIVEN** a session launched via the standalone skirmish setup (not from a
  campaign encounter)
- **WHEN** the outcome is derived
- **THEN** `outcome.encounterId`, `outcome.contractId`, and
  `outcome.scenarioId` SHALL be `null`
