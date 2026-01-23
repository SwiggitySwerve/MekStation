# scenario-generation Specification

## Purpose
TBD - created by archiving change add-scenario-generators. Update Purpose after archive.
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

The system SHALL generate enemy forces scaled to player force strength.

#### Scenario: Generate OpFor with default settings

- **GIVEN** a player force with calculated BV
- **WHEN** generating OpFor with difficulty "Regular" (100%)
- **THEN** enemy force BV is within 90-110% of player BV
- **AND** enemy units are selected from appropriate faction RAT
- **AND** enemy skills match the difficulty level

#### Scenario: Generate OpFor with difficulty scaling

- **GIVEN** a player force with 10000 BV
- **WHEN** generating OpFor with difficulty "Veteran" (110%)
- **THEN** target enemy BV is 11000 (10000 × 1.1)
- **AND** enemy skills are in the 3/4 to 2/3 range

#### Scenario: OpFor lance selection

- **GIVEN** target BV not yet met
- **WHEN** selecting enemy units
- **THEN** a lance is selected from the faction's RAT
- **AND** if total BV < floor, another lance is added
- **AND** a roll determines if additional lances are added

#### Scenario: Faction and era filtering

- **GIVEN** a campaign set in 3025 against House Liao
- **WHEN** generating OpFor
- **THEN** only units available to Liao in 3025 are selected
- **AND** extinct or future units are excluded

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

