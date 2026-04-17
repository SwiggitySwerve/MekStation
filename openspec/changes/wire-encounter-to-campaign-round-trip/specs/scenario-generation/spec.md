# scenario-generation Specification Delta

## ADDED Requirements

### Requirement: Contract-Generated Scenarios Preserve Linkage

Every encounter produced by `scenarioGenerationProcessor` from a contract SHALL be tagged with both `contractId` and `scenarioId` so the linkage flows through to the `IGameSession` launched by `EncounterService`.

#### Scenario: Encounter is tagged with contract id

- **GIVEN** a contract C with combat role `MANEUVER` and a scheduled
  weekly scenario
- **WHEN** `scenarioGenerationProcessor` runs on a Monday and generates
  scenario S and encounter E
- **THEN** the persisted encounter E SHALL have `contractId = C.id`
- **AND** E SHALL have `scenarioId = S.id`

#### Scenario: Standalone scenarios have null contract id

- **GIVEN** a manually-created scenario not attached to any contract
- **WHEN** an encounter is created from it
- **THEN** the encounter's `contractId` SHALL be `null`
- **AND** the encounter's `scenarioId` SHALL reference the scenario

### Requirement: Session Launch Forwards Linkage

`EncounterService.launchEncounter(E)` SHALL forward any `contractId` and
`scenarioId` on the encounter into the `IGameSession` config so the
session inherits full linkage.

#### Scenario: Launched session carries linkage

- **GIVEN** an encounter E with `contractId = C` and `scenarioId = S`
- **WHEN** `EncounterService.launchEncounter(E)` is called
- **THEN** the returned session's config SHALL contain `contractId = C`
- **AND** the session's config SHALL contain `scenarioId = S`

#### Scenario: No linkage does not fail launch

- **GIVEN** an encounter E with `contractId = null` and `scenarioId =
null`
- **WHEN** `EncounterService.launchEncounter(E)` is called
- **THEN** the session SHALL launch successfully
- **AND** the session's config SHALL carry `contractId = null` and
  `scenarioId = null`
