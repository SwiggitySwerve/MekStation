# combat-resolution Specification Delta

## ADDED Requirements

### Requirement: Tactical Resolution References Post-Battle Report Schema

The combat-resolution system SHALL, when invoked at the end of a tactical
(interactive) session, return the same `IPostBattleReport` schema
defined by `after-combat-report`, so the tactical and ACAR code paths
converge on one downstream shape.

#### Scenario: Tactical resolution returns IPostBattleReport

- **GIVEN** an `InteractiveSession` that has transitioned to
  `GameStatus.Completed`
- **WHEN** `combatResolution.finalize(session)` is called
- **THEN** the return value SHALL match the `IPostBattleReport` shape
- **AND** the `reason` SHALL reflect how the session ended

#### Scenario: ACAR resolution returns IPostBattleReport

- **GIVEN** an ACAR auto-resolve call
- **WHEN** the resolution completes
- **THEN** the return value SHALL also match the `IPostBattleReport`
  shape
- **AND** tactical and ACAR reports SHALL be interchangeable downstream

### Requirement: Post-Battle Report Persistence Is Optional For Quick Sims

The combat-resolution system SHALL accept a `persist: boolean` option on
`finalize`; when `persist = false`, the report SHALL NOT be written to
`/api/matches`, so Quick Sim (Phase 2) can run thousands of matches
without storage churn.

#### Scenario: Tactical finalize persists by default

- **GIVEN** `finalize(session)` called without an options argument
- **WHEN** the call completes
- **THEN** the derived report SHALL be POSTed to `/api/matches`

#### Scenario: Quick Sim finalize skips persistence

- **GIVEN** `finalize(session, {persist: false})`
- **WHEN** the call completes
- **THEN** no POST SHALL be made to `/api/matches`
- **AND** the report SHALL still be returned to the caller
