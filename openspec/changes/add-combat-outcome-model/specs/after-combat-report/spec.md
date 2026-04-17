# after-combat-report Specification Delta

## ADDED Requirements

### Requirement: Combat Outcome Schema

The after-combat report system SHALL define an `ICombatOutcome` schema that
supersedes `IPostBattleReport` as the canonical serialized result of a
completed tactical session. `ICombatOutcome` SHALL carry every fact the
campaign consumes: winner, casualties per unit with location-level detail,
pilot outcomes with XP-eligible events and wounds, ammo consumption, heat
problems, and scenario/contract linkage.

#### Scenario: Outcome contains required top-level fields

- **GIVEN** a session that has completed via `GameEnded`
- **WHEN** `deriveCombatOutcome(session)` is called
- **THEN** the returned `ICombatOutcome` SHALL contain `version`, `matchId`,
  `sessionId`, `encounterId`, `contractId`, `scenarioId`, `winner`,
  `endReason`, `turnCount`, `startedAt`, `completedAt`, `units`, `pilots`,
  `events`
- **AND** `winner` SHALL be one of `GameSide.Player`, `GameSide.Opponent`,
  or `"draw"`
- **AND** `endReason` SHALL be one of `DESTRUCTION`, `CONCEDE`, `TURN_LIMIT`,
  `OBJECTIVE_MET`, `WITHDRAWAL`
- **AND** `version` SHALL equal the current `COMBAT_OUTCOME_VERSION`

#### Scenario: Unit casualty captures per-location damage

- **GIVEN** a unit that took 18 damage to the left torso (12 armor, 6
  structure) and 5 damage to the right arm (all armor)
- **WHEN** the unit casualty is derived
- **THEN** the `IUnitCasualty` SHALL include
  `armorLostPerLocation: { LT: 12, RA: 5 }`
- **AND** `structureLostPerLocation: { LT: 6 }`
- **AND** all other locations SHALL be absent or zero

#### Scenario: Unit casualty captures destroyed components

- **GIVEN** a unit whose Medium Laser in the right arm was destroyed by a
  critical hit during combat
- **WHEN** the unit casualty is derived
- **THEN** the `IUnitCasualty.destroyedComponents` SHALL contain an entry
  `{ location: RA, slot: <n>, componentType: "weapon", name: "Medium Laser" }`

#### Scenario: Unit casualty captures ammo consumption

- **GIVEN** a unit that fired 8 LRM-15 shots and 3 MG bursts
- **WHEN** the unit casualty is derived
- **THEN** the `IUnitCasualty.ammoConsumed` SHALL be
  `{ "LRM 15 Ammo": 8, "Machine Gun Ammo": 3 }`

#### Scenario: Pilot outcome captures XP-eligible events

- **GIVEN** a pilot whose unit destroyed two enemy units and completed one
  objective task
- **WHEN** the pilot outcome is derived
- **THEN** the `IPilotOutcome.kills` SHALL equal 2
- **AND** the `IPilotOutcome.tasksCompleted` SHALL equal 1
- **AND** the `IPilotOutcome.missionRole` SHALL be set (e.g., `LANCE_LEADER`)

#### Scenario: Pilot outcome captures wounds and consciousness

- **GIVEN** a pilot that took 2 head hits and failed one consciousness roll
- **WHEN** the pilot outcome is derived
- **THEN** the `IPilotOutcome.woundsTaken` SHALL equal 2
- **AND** the `IPilotOutcome.consciousnessRollsFailed` SHALL equal 1
- **AND** the `IPilotOutcome.finalStatus` SHALL be `UNCONSCIOUS` or higher

### Requirement: Deterministic Outcome Derivation

`ICombatOutcome` SHALL be derived purely from the session's event log and
initial configuration, with zero session-state mutation. The same inputs
SHALL always yield a deeply-equal outcome.

#### Scenario: Derivation is deterministic

- **GIVEN** a fixed `IGameSession` with event log L
- **WHEN** `deriveCombatOutcome(session)` is called twice
- **THEN** both returned outcomes SHALL be deeply equal

#### Scenario: Derivation does not mutate session

- **GIVEN** an `IGameSession` with status `Completed`
- **WHEN** `deriveCombatOutcome(session)` is called
- **THEN** no field of the session SHALL be modified
- **AND** the session event log SHALL remain byte-identical

### Requirement: Final Unit Status Classification

Each `IUnitCasualty.finalStatus` SHALL be computed from damage state using
deterministic rules.

#### Scenario: Intact unit

- **GIVEN** a unit that took zero damage to armor or structure
- **WHEN** final status is computed
- **THEN** `finalStatus` SHALL be `INTACT`

#### Scenario: Damaged unit

- **GIVEN** a unit with ≤50% structure lost across all locations and no
  location destroyed
- **WHEN** final status is computed
- **THEN** `finalStatus` SHALL be `DAMAGED`

#### Scenario: Crippled unit

- **GIVEN** a unit with either >50% structure lost or any non-CT location
  destroyed
- **WHEN** final status is computed
- **THEN** `finalStatus` SHALL be `CRIPPLED`

#### Scenario: Destroyed unit

- **GIVEN** a unit whose CT structure reached zero or whose engine took
  three critical hits
- **WHEN** final status is computed
- **THEN** `finalStatus` SHALL be `DESTROYED`

#### Scenario: Ejected unit

- **GIVEN** a unit whose pilot ejected before destruction
- **WHEN** final status is computed
- **THEN** `finalStatus` SHALL be `EJECTED`
- **AND** the unit SHALL NOT be classified as `DESTROYED`

### Requirement: Final Pilot Status Classification

Each `IPilotOutcome.finalStatus` SHALL be computed from pilot damage and
events using deterministic rules.

#### Scenario: Active pilot

- **GIVEN** a pilot that took zero hits and passed all consciousness rolls
- **WHEN** final status is computed
- **THEN** `finalStatus` SHALL be `ACTIVE`

#### Scenario: Wounded pilot

- **GIVEN** a pilot that took 1–5 hits but was conscious at end of battle
- **WHEN** final status is computed
- **THEN** `finalStatus` SHALL be `WOUNDED`

#### Scenario: KIA pilot

- **GIVEN** a pilot that took 6+ hits or whose unit was destroyed without
  successful ejection
- **WHEN** final status is computed
- **THEN** `finalStatus` SHALL be `KIA`

### Requirement: Schema Versioning

Every derived `ICombatOutcome` SHALL include a `version` field equal to
`COMBAT_OUTCOME_VERSION` so consumers can detect incompatible payloads.

#### Scenario: Current version stamped on derivation

- **GIVEN** a session being derived today
- **WHEN** `deriveCombatOutcome(session)` is called
- **THEN** `outcome.version` SHALL equal `COMBAT_OUTCOME_VERSION`

#### Scenario: Consumer rejects unknown version

- **GIVEN** a stored outcome with `version` greater than
  `COMBAT_OUTCOME_VERSION`
- **WHEN** a consumer calls `assertCombatOutcomeCurrent(outcome)`
- **THEN** the guard SHALL throw `UnsupportedCombatOutcomeVersionError`

## MODIFIED Requirements

### Requirement: Post-Battle Report Schema

The `IPostBattleReport` schema SHALL remain valid for UI backward
compatibility but SHALL now be derivable from `ICombatOutcome`.

#### Scenario: Adapter produces equivalent report

- **GIVEN** an `ICombatOutcome` derived from a session
- **WHEN** `fromCombatOutcome(outcome)` is called
- **THEN** the returned `IPostBattleReport` SHALL contain `matchId`,
  `winner`, `reason`, `turnCount`, `units`, `mvpUnitId`, `log`
- **AND** its field values SHALL agree with the outcome fields of the same
  name, with `reason` mapped from `outcome.endReason`
