# Tasks: Add Scenario and OpFor Generators

## 1. Scenario Template System

- [ ] 1.1 Define `IScenarioTemplate` interface:
  - `id`, `name`, `description`
  - `objectiveType`: 'destroy', 'capture', 'defend', 'escort', 'recon', 'breakthrough'
  - `victoryConditions`: array of condition definitions
  - `deploymentZones`: player and enemy deployment areas
  - `turnLimit`: optional maximum turns
  - `specialRules`: array of special rule IDs

- [ ] 1.2 Create initial scenario templates:
  - Standup Fight (destroy enemy force)
  - Base Assault (capture/destroy facility)
  - Defensive Hold (defend for X turns)
  - Convoy Escort (protect moving units)
  - Recon (scan objectives and withdraw)
  - Breakthrough (exit units from enemy edge)

- [ ] 1.3 Create scenario template data files

## 2. OpFor Generator

- [ ] 2.1 Define `IOpForConfig` interface:
  - `playerBV`: number
  - `difficultyMultiplier`: 0.8 to 1.4
  - `faction`: enemy faction for RAT selection
  - `era`: for era-appropriate units
  - `unitTypeMix`: ratios of mech/vehicle/infantry/aerospace

- [ ] 2.2 Implement BV-scaled unit selection:
  - Select lance from appropriate RAT
  - Check if total BV is within floor/ceiling
  - Roll to continue adding lances
  - Apply difficulty multiplier

- [ ] 2.3 Implement skill assignment:
  - Determine enemy skill level based on difficulty
  - Apply skill variance within lance

- [ ] 2.4 Add Random Assignment Tables (RATs):
  - Structure for faction/era/unit type lookups
  - Initial data for common factions

## 3. Modifier System

- [ ] 3.1 Define `IBattleModifier` interface:
  - `id`, `name`, `description`
  - `effect`: positive, negative, or neutral
  - `applicability`: when modifier can apply
  - `implementation`: how it affects gameplay

- [ ] 3.2 Create initial modifier set:
  - Reinforcements (enemy or allied)
  - Terrain conditions (fog, night, extreme weather)
  - Equipment effects (minefield, artillery support)
  - Force modifiers (ambush, sensor ghosts)

- [ ] 3.3 Implement modifier rolling:
  - Random roll from available modifiers
  - Facility-based modifiers (enemy base = reinforcements)
  - Maximum modifier count (configurable)

## 4. Terrain Generator

- [ ] 4.1 Define terrain/map selection rules:
  - Map preset based on biome
  - Temperature affects available biomes
  - Facility presence affects map features

- [ ] 4.2 Implement map preset selection

## 5. Integration

- [ ] 5.1 Add generator service: `ScenarioGeneratorService`
- [ ] 5.2 Integrate with Encounter creation:
  - "Generate Scenario" button
  - Preview generated setup
  - Allow manual adjustments

- [ ] 5.3 Add difficulty configuration UI:
  - Skill level selection (Green to Legendary)
  - Modifier count slider
  - BV percentage adjustment

## 6. Testing

- [ ] 6.1 Unit tests for OpFor BV calculations
- [ ] 6.2 Unit tests for modifier rolling
- [ ] 6.3 Integration tests for full scenario generation
- [ ] 6.4 Balance testing with sample forces
