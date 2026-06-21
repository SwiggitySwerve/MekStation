# scenario-generation Specification

## Purpose

Defines Scenario Generation requirements for Scenario Template System, OpFor Generation, Battle Modifiers, and Terrain Selection, preserving the source-of-truth scope introduced by archived change add-scenario-generators.

## Requirements
### Requirement: Scenario Template System

The system SHALL support scenario templates that define battle objectives and conditions.

#### Scenario: Select scenario template

- **GIVEN** a user is creating an encounter
- **WHEN** they choose "Generate Scenario"
- **THEN** available scenario templates are displayed
- **AND** templates show name, description, and objective type

#### Scenario: Template properties

- **GIVEN** a scenario template
- **WHEN** accessing its properties
- **THEN** template MUST have: id, name, objectiveType, victoryConditions, deploymentZones
- **AND** template MAY have: turnLimit, specialRules, description

#### Scenario: Objective types

- **GIVEN** the scenario template system
- **WHEN** listing available objective types
- **THEN** types SHALL include: destroy, capture, defend, escort, recon, breakthrough

### Requirement: OpFor Generation

The system SHALL generate enemy forces scaled to player force strength with BV-based matching and random variation.

#### Scenario: OpFor BV calculation with variation

- **GIVEN** a player force with 10000 BV and difficulty multiplier 1.0
- **WHEN** generating OpFor
- **THEN** target BV = playerBV × difficulty × (75-125% random variation)
- **AND** variation is calculated as: 100 + ((rand(8) - 3) × 5) percent
- **AND** minimum variation is 75% (roll 0)
- **AND** maximum variation is 125% (roll 7)

#### Scenario: Lance size by faction

- **GIVEN** OpFor generation for a faction
- **WHEN** determining force size
- **THEN** Inner Sphere uses lance size 4
- **AND** Clan uses star size 5
- **AND** ComStar uses Level II size 6

#### Scenario: Generate OpFor with default settings

- **GIVEN** a player force with calculated BV
- **WHEN** generating OpFor with difficulty "Regular" (100%)
- **THEN** enemy force BV is within 75-125% of player BV (with random variation)
- **AND** enemy units are selected from appropriate faction RAT
- **AND** enemy skills match the difficulty level

#### Scenario: Generate OpFor with difficulty scaling

- **GIVEN** a player force with 10000 BV
- **WHEN** generating OpFor with difficulty "Veteran" (110%)
- **THEN** target enemy BV is 11000 × (75-125% variation)
- **AND** enemy skills are in the 3/4 to 2/3 range

#### Scenario: OpFor lance selection

- **GIVEN** a target BV for OpFor
- **WHEN** selecting units
- **THEN** units are chosen to approximate target BV
- **AND** force composition respects scenario conditions (e.g., no tanks in low gravity)

### Requirement: Battle Modifiers

The system SHALL support battle modifiers that affect encounter conditions.

#### Scenario: Roll random modifiers

- **GIVEN** an encounter being generated
- **AND** maximum modifier count is 3
- **WHEN** modifiers are rolled
- **THEN** 0-3 modifiers are selected
- **AND** modifiers are chosen from the available pool

#### Scenario: Modifier properties

- **GIVEN** a battle modifier
- **WHEN** accessing its properties
- **THEN** modifier MUST have: id, name, description, effect (positive/negative/neutral)
- **AND** modifier MAY have: requirements, exclusions, implementation details

#### Scenario: Facility-forced modifiers

- **GIVEN** an enemy facility is nearby
- **WHEN** generating the encounter
- **THEN** facility-specific modifiers are automatically included
- **AND** they count toward the modifier limit

#### Scenario: Modifier stacking

- **GIVEN** multiple modifiers are rolled
- **WHEN** checking compatibility
- **THEN** conflicting modifiers are replaced with alternatives
- **AND** the same modifier cannot appear twice

### Requirement: Terrain Selection

The system SHALL select appropriate terrain based on conditions.

#### Scenario: Biome-based terrain

- **GIVEN** a campaign track with "jungle" biome
- **WHEN** generating a scenario
- **THEN** map presets appropriate for jungle are selected
- **AND** terrain features match the biome

#### Scenario: Temperature effects

- **GIVEN** a track with extreme temperature
- **WHEN** generating a scenario
- **THEN** appropriate temperature modifier is applied
- **AND** heat-affected units are impacted accordingly

#### Scenario: Facility terrain

- **GIVEN** an encounter at an enemy base
- **WHEN** generating terrain
- **THEN** reinforced buildings are included
- **AND** defensive positions are placed

### Requirement: Generator Configuration

The system SHALL allow configuration of generation parameters.

#### Scenario: Configure difficulty

- **GIVEN** the encounter generation UI
- **WHEN** the user selects difficulty level
- **THEN** BV multiplier and skill ranges update
- **AND** the preview reflects the new difficulty

#### Scenario: Configure modifier count

- **GIVEN** the encounter generation UI
- **WHEN** the user sets maximum modifiers to 1
- **THEN** at most 1 modifier is generated
- **AND** battles are more predictable

#### Scenario: Manual override

- **GIVEN** a generated scenario
- **WHEN** the user edits the enemy force
- **THEN** units can be added, removed, or changed
- **AND** the modified scenario is used

### Requirement: Generation Preview

The system SHALL preview generated content before confirmation.

#### Scenario: Preview OpFor

- **GIVEN** a scenario has been generated
- **WHEN** viewing the preview
- **THEN** all enemy units are listed with their stats
- **AND** total enemy BV is displayed
- **AND** BV comparison to player force is shown

#### Scenario: Preview modifiers

- **GIVEN** modifiers have been rolled
- **WHEN** viewing the preview
- **THEN** each modifier is listed with its effect
- **AND** positive/negative impact is clearly indicated

#### Scenario: Regenerate option

- **GIVEN** the user is viewing a preview
- **WHEN** they click "Regenerate"
- **THEN** a new scenario is generated with the same parameters
- **AND** the preview updates with new results

### Requirement: Combat Role System

The system SHALL support 7 combat roles for force assignment with role-specific battle chances.

#### Scenario: Combat role assignment

- **GIVEN** a force in an active campaign
- **WHEN** assigning the force to a combat role
- **THEN** the role SHALL be one of: Maneuver, Frontline, Patrol, Training, Cadre, Auxiliary, Reserve
- **AND** each role has a defined base battle chance percentage

#### Scenario: Battle chance per role

- **GIVEN** a combat team with role Maneuver
- **WHEN** checking for weekly battle
- **THEN** the base battle chance is 40%
- **AND** Patrol role has 60% chance
- **AND** Frontline role has 20% chance
- **AND** Training and Cadre roles have 10% chance
- **AND** Auxiliary and Reserve roles have 0% chance (never generate battles)

### Requirement: AtB Scenario Type Selection

The system SHALL select scenario types from role-specific tables using dice rolls.

#### Scenario: Maneuver role scenario selection

- **GIVEN** a combat team with Maneuver role
- **WHEN** a battle is triggered
- **THEN** roll d40 to select from Maneuver scenario table
- **AND** roll 1 = Base Attack (enemy attacks)
- **AND** roll 2-8 = Breakthrough
- **AND** roll 9-16 = Standup (player attacks)
- **AND** roll 17-24 = Standup (enemy attacks)
- **AND** roll 25-32 = Chase or Hold the Line
- **AND** roll 33-40 = Hold the Line (player defends)
- **AND** roll 41+ = Base Attack (player attacks)

#### Scenario: Patrol role scenario selection

- **GIVEN** a combat team with Patrol role
- **WHEN** a battle is triggered
- **THEN** roll d60 to select from Patrol scenario table
- **AND** scenarios include: Base Attack, Chase, Hide & Seek, Probe, Extraction, Recon Raid

#### Scenario: Frontline role scenario selection

- **GIVEN** a combat team with Frontline role
- **WHEN** a battle is triggered
- **THEN** roll d20 to select from Frontline scenario table
- **AND** scenarios emphasize defensive and extraction missions

#### Scenario: Training role scenario selection

- **GIVEN** a combat team with Training or Cadre role
- **WHEN** a battle is triggered
- **THEN** roll d10 to select from Training scenario table
- **AND** scenarios are lower intensity

### Requirement: Scenario Conditions System

The system SHALL generate planetary conditions that affect force composition.

#### Scenario: Random condition generation

- **GIVEN** a generated scenario
- **WHEN** applying planetary conditions
- **THEN** conditions SHALL include: light level, weather, gravity, temperature, atmosphere
- **AND** light levels: daylight, dusk, full_moon, moonless, pitch_black
- **AND** weather types: clear, light_rain, heavy_rain, sleet, snow, fog, sandstorm

#### Scenario: Low gravity force restrictions

- **GIVEN** a scenario with gravity ≤ 0.2
- **WHEN** determining allowed unit types
- **THEN** tanks are banned from the scenario
- **AND** mechs and aerospace are allowed

#### Scenario: Toxic atmosphere force restrictions

- **GIVEN** a scenario with toxic or tainted atmosphere
- **WHEN** determining allowed unit types
- **THEN** conventional infantry are banned
- **AND** tanks are banned
- **AND** battle armor and mechs are allowed

### Requirement: Weekly Scenario Generation Processor

The system SHALL generate scenarios weekly for active contracts with combat teams.

#### Scenario: Monday scenario generation

- **GIVEN** a campaign with active contracts and combat teams
- **WHEN** advancing to Monday
- **THEN** the scenario generation processor runs
- **AND** each combat team gets a battle chance check
- **AND** successful checks generate a scenario with type, OpFor, and conditions

#### Scenario: Skip non-Monday days

- **GIVEN** a campaign advancing to Tuesday
- **WHEN** the scenario generation processor runs
- **THEN** no scenarios are generated
- **AND** the processor returns immediately

#### Scenario: Opt-in via campaign option

- **GIVEN** a campaign with useAtBScenarios = false
- **WHEN** the scenario generation processor runs
- **THEN** no scenarios are generated
- **AND** existing manual scenario creation still works

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

### Requirement: Random Force Generator from Real Catalog

The scenario-generation system SHALL provide a `generateRandomForce` service that produces an `IForce` with `assignments[]` populated from the real 4,196-unit canonical catalog (`public/data/units/battlemechs/index.json`), filtered by configurable BV budget, tonnage range, era, and tech-base constraints.

The generator SHALL:

1. Filter the catalog index by all provided filters (BV bucket implied by budget, tonnage min/max, era, tech-base).
2. Use a `WeightedTable` weighted by inverse-BV (lower-BV chassis weighted higher within the filtered set, so a tight budget naturally prefers lighter mechs).
3. Use a `SeededRandom` instance derived from the per-run seed so the same seed produces the same force.
4. Greedy-fill — pick a unit, subtract its BV from the remaining budget, recompute the weighted table over remaining candidates that fit, repeat until force size reached or remaining budget is within ±5% tolerance.
5. Enforce a duplicate-chassis cap (`Math.ceil(count / 4)` by default) — when the cap is reached for a chassis, exclude it from the candidate set for the rest of the assembly.
6. Throw a `BudgetUnsatisfiableError` carrying the achievable BV range when greedy fill cannot satisfy the budget within tolerance — do NOT retry-loop.

#### Scenario: Generate force within BV tolerance

- **GIVEN** `bvBudget = 5000`, `count = 3`, `era = 3050`, `techBase = 'IS'`, `seed = 42`
- **WHEN** `generateRandomForce` is called
- **THEN** the returned `IForce.assignments[]` SHALL have exactly 3 entries
- **AND** the sum of BVs of the chosen units SHALL fall within [4750, 5250] (5000 ± 5%)
- **AND** every chosen unit SHALL be tagged with era `3050` (or earlier) and tech base `IS` per the catalog index

#### Scenario: Same seed produces same force

- **GIVEN** identical filter inputs and `seed = 42`
- **WHEN** `generateRandomForce` is called twice
- **THEN** both invocations SHALL return byte-identical `IForce.assignments[]` arrays
- **AND** the order of assignments SHALL be identical

#### Scenario: Duplicate chassis cap enforced

- **GIVEN** `count = 8`, default duplicate cap = `Math.ceil(8/4) = 2`
- **WHEN** force assembly proceeds
- **THEN** no chassis SHALL appear more than 2 times in the resulting `assignments[]`

#### Scenario: Unsatisfiable budget throws explicit error

- **GIVEN** `bvBudget = 1500`, `count = 2`, filters that yield only candidates in [800, 1200] BV
- **WHEN** `generateRandomForce` is called (no two-unit roster fits within ±5% of 1500)
- **THEN** `BudgetUnsatisfiableError` SHALL be thrown
- **AND** the error payload SHALL include the achievable BV range
- **AND** no retry SHALL be attempted

#### Scenario: Filter narrows candidate pool

- **GIVEN** `tonnageMin = 80`, `tonnageMax = 100`, era and tech-base unrestricted
- **WHEN** `generateRandomForce` is called
- **THEN** every chosen unit's tonnage SHALL fall in [80, 100]
- **AND** units outside that range SHALL NOT appear in the result

### Requirement: Pilot Synthesis from Skill Template

The scenario-generation system SHALL provide a pilot synthesis path that produces fresh `IPilot` instances from an `IPilotSkillTemplate` (the existing template type used by `IOpForConfig.pilotSkillTemplate`).

Synthesized pilots SHALL:

1. Have unique IDs (UUIDs) generated from the per-run `SeededRandom` so the same seed produces the same pilot IDs.
2. Have `skills.gunnery` drawn uniformly from the template's `gunneryRange` (inclusive both ends).
3. Have `skills.piloting` drawn uniformly from the template's `pilotingRange` (inclusive both ends).
4. NOT be persisted to the canonical pilot vault (`usePilotStore`); they live only for the swarm-run lifetime.

#### Scenario: Synthesized skills land in template band

- **GIVEN** `gunneryRange = [3, 5]`, `pilotingRange = [4, 6]`, `count = 100`, `seed = 42`
- **WHEN** `generateRandomPilots({ strategy: 'template', skillTemplate, count, random, … })` is called
- **THEN** every returned pilot's `skills.gunnery` SHALL fall in [3, 5]
- **AND** every returned pilot's `skills.piloting` SHALL fall in [4, 6]
- **AND** the distribution SHALL not be degenerate (every value in the range SHALL appear at least once for `count = 100` over the full range)

#### Scenario: Synthesized pilots have unique IDs

- **GIVEN** `count = 50` with template synthesis
- **WHEN** the generator returns
- **THEN** all 50 returned `IPilot.id` values SHALL be unique within the run

#### Scenario: Synthesized pilots not persisted to vault

- **GIVEN** the swarm harness has just synthesized 10 pilots for a run
- **WHEN** `usePilotStore.getState().pilots` is read after the run completes
- **THEN** none of the synthesized pilot IDs SHALL appear in the store
- **AND** the vault state SHALL be unchanged from before the run

### Requirement: Force/Pilot Pairing for Swarm Runs

The scenario-generation system SHALL pair generated forces with generated pilots in a deterministic 1:1 mapping (assignment[i] ↔ pilot[i]) and write `pilotId` on each `IForce.assignments[i]`.

The paired output SHALL flow through the existing `encounterToGameSession.buildGameUnitsForForce` function unchanged — random-generated `IForce` + synthesized or sampled `IPilot[]` are valid encounter inputs.

#### Scenario: Pairing is sequential and complete

- **GIVEN** a generated force with 4 assignments and 4 generated pilots
- **WHEN** pairing is applied
- **THEN** `assignments[0].pilotId` SHALL equal `pilots[0].id`
- **AND** `assignments[1].pilotId` SHALL equal `pilots[1].id`
- **AND** every assignment SHALL have a non-null `pilotId`

#### Scenario: Paired output drives existing encounter pipeline

- **GIVEN** a paired `IForce` from the random generator
- **WHEN** `encounterToGameSession.buildGameUnitsForForce(force, side, getPilotById)` is called
- **AND** `getPilotById` is wired to look up the synthesized pilots
- **THEN** the resulting `IGameUnit[]` SHALL carry the synthesized pilot's `gunnery` and `piloting` (not defaults)
- **AND** the existing encounter flow SHALL run end-to-end without code changes to `encounterToGameSession`

