# after-combat-report Specification Delta

## ADDED Requirements

### Requirement: Post-Battle Report Schema

The after-combat report system SHALL define an `IPostBattleReport`
schema produced at the end of a tactical session, and `IUnitReport`
per-unit entries, so the UI and the match log store can render and
persist the outcome consistently. The schema SHALL carry an explicit
`version` field (literal `1` at introduction) so future phases
(especially Phase 3 campaign integration) can extend the report
structure without silently breaking readers of stored Phase 1 match
logs.

#### Scenario: Report contains required top-level fields

- **GIVEN** a session that has completed via `GameEnded`
- **WHEN** the report is derived
- **THEN** the report SHALL contain `version: 1`, `matchId`, `winner`,
  `reason`, `turnCount`, `units`, `mvpUnitId`, `log`
- **AND** `winner` SHALL be one of `GameSide.Player`, `GameSide.Opponent`,
  or `"draw"`
- **AND** `reason` SHALL be one of `"destruction"`, `"concede"`,
  `"turn_limit"`

#### Scenario: Unversioned report rejected on read

- **GIVEN** a stored match log whose JSON lacks a `version` field
- **WHEN** `GET /api/matches/[id]` is called
- **THEN** the endpoint SHALL respond 400 with body `{error:
"unversioned report"}`
- **AND** the UI SHALL NOT attempt to render it

#### Scenario: Unknown-version report rejected on read

- **GIVEN** a stored match log with `version: 99`
- **WHEN** `GET /api/matches/[id]` is called
- **THEN** the endpoint SHALL respond 400 with body `{error:
"unsupported report version 99, this build supports 1"}`

#### Scenario: Unit report contains damage and kill accounting

- **GIVEN** a unit that dealt 120 damage and took 80 damage and killed 1
  enemy
- **WHEN** the unit report is derived
- **THEN** the `IUnitReport` SHALL contain `{unitId, side, designation,
damageDealt: 120, damageReceived: 80, kills: 1, heatProblems,
physicalAttacks, xpPending: true}`

#### Scenario: XP always marked pending

- **GIVEN** any derived unit report
- **WHEN** inspecting its `xpPending` field
- **THEN** the field SHALL be `true`
- **AND** XP calculation SHALL NOT be performed in this change

### Requirement: MVP Determination

The after-combat report SHALL compute a single `mvpUnitId` selecting the
winner-side unit with the greatest `damageDealt`, tie-broken first by
lowest `damageReceived`, then by alphabetical designation.

#### Scenario: Clear MVP by damage dealt

- **GIVEN** winner side units with damage dealt {A: 200, B: 150, C: 100}
- **WHEN** MVP is determined
- **THEN** `mvpUnitId` SHALL equal unit A's id

#### Scenario: Tie broken by damage received

- **GIVEN** two units both dealt 200 damage; unit A took 50, unit B took
  100
- **WHEN** MVP is determined
- **THEN** `mvpUnitId` SHALL equal unit A's id

#### Scenario: No MVP for zero-damage winner

- **GIVEN** a winner whose units dealt 0 total damage (e.g., a
  turn-limit draw)
- **WHEN** MVP is determined
- **THEN** `mvpUnitId` SHALL be `null`

### Requirement: Report Derivation From Event Log

The after-combat report SHALL derive its fields purely from the session's
`IGameEvent[]` log, with no session state mutation, ensuring the same
log always produces the same report.

#### Scenario: Deterministic derivation

- **GIVEN** a fixed event log
- **WHEN** `derivePostBattleReport(log)` is called twice
- **THEN** both returned reports SHALL be deeply equal

#### Scenario: Derivation counts kills from unit_destroyed events

- **GIVEN** three `unit_destroyed` events in the log, each with
  `killerId` set
- **WHEN** the report is derived
- **THEN** each killer's `IUnitReport.kills` SHALL increment once per
  event where it is the killer
