# combat-resolution Specification Delta

## ADDED Requirements

### Requirement: Terminal Outcome Derivation

Every completed combat session SHALL produce a single `ICombatOutcome` as
its terminal artifact. The session pipeline SHALL NOT be considered complete
until the outcome has been derived and made available to campaign consumers.

> PARTIALLY DEFERRED to Wave 5: derivation + `session.getOutcome()` /
> `CombatNotCompleteError` are wired in Wave 1 (see
> `src/engine/InteractiveSession.ts` and `src/engine/combatOutcomeBus.ts`).
> The session-event-stream `CombatOutcomeReady` entry (task 3.3) is
> deferred — the in-memory `combatOutcomeBus` already notifies local
> subscribers; the formal session-event entry lands when the persistence
> pipeline (Wave 4) introduces a cross-system subscriber that needs it.

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

> PARTIALLY DEFERRED to Wave 5: `contractId` and `scenarioId` are wired in
> Wave 1 via `IDeriveCombatOutcomeOptions` at
> `src/lib/combat/outcome/combatOutcome.ts:36-52` (the engine accepts them
> from the caller and they default to `null`). `encounterId` is not yet a
> field on `ICombatOutcome` — Wave 5 will add it alongside the encounter
> roster wiring. Standalone-skirmish "all linkage null" path is honored
> today via the option defaults.

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
