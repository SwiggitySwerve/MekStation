# Tasks: Add Scenario and OpFor Generators

## 1. Scenario Template System

- [x] 1.1 Define `IScenarioTemplate` interface:
  - `id`, `name`, `description`
  - `objectiveType`: 'destroy', 'capture', 'defend', 'escort', 'recon', 'breakthrough'
  - `victoryConditions`: array of condition definitions
  - `deploymentZones`: player and enemy deployment areas
  - `turnLimit`: optional maximum turns
  - `specialRules`: array of special rule IDs
  - Created in: `src/types/scenario/ScenarioInterfaces.ts`

- [x] 1.2 Create initial scenario templates:
  - Standup Fight (destroy enemy force)
  - Base Assault (capture/destroy facility)
  - Defensive Hold (defend for X turns)
  - Convoy Escort (protect moving units)
  - Recon (scan objectives and withdraw)
  - Breakthrough (exit units from enemy edge)
  - Created in: `src/data/scenario/templates.ts`

- [x] 1.3 Create scenario template data files
  - Templates: `src/data/scenario/templates.ts`
  - Modifiers: `src/data/scenario/modifiers.ts`
  - Map presets: `src/data/scenario/mapPresets.ts`

## 2. OpFor Generator

- [x] 2.1 Define `IOpForConfig` interface:
  - `playerBV`: number
  - `difficultyMultiplier`: 0.8 to 1.4
  - `faction`: enemy faction for RAT selection
  - `era`: for era-appropriate units
  - `unitTypeMix`: ratios of mech/vehicle/infantry/aerospace
  - Created in: `src/types/scenario/ScenarioInterfaces.ts`

- [x] 2.2 Implement BV-scaled unit selection:
  - Select lance from appropriate RAT
  - Check if total BV is within floor/ceiling
  - Roll to continue adding lances
  - Apply difficulty multiplier
  - Implemented in: `src/services/generators/OpForGeneratorService.ts`

- [x] 2.3 Implement skill assignment:
  - Determine enemy skill level based on difficulty
  - Apply skill variance within lance
  - Implemented in: `src/services/generators/OpForGeneratorService.ts`

- [x] 2.4 Add Random Assignment Tables (RATs):
  - Structure for faction/era/unit type lookups
  - Initial data for common factions (5 tables: LC, DC, CW, FS, Pirates)
  - Created in: `src/data/scenario/rats.ts`

## 3. Modifier System

- [x] 3.1 Define `IBattleModifier` interface:
  - `id`, `name`, `description`
  - `effect`: positive, negative, or neutral
  - `applicability`: when modifier can apply
  - `implementation`: how it affects gameplay
  - Created in: `src/types/scenario/ScenarioInterfaces.ts`

- [x] 3.2 Create initial modifier set:
  - Reinforcements (enemy or allied)
  - Terrain conditions (fog, night, extreme weather)
  - Equipment effects (minefield, artillery support)
  - Force modifiers (ambush, sensor ghosts)
  - Created in: `src/data/scenario/modifiers.ts` (16 modifiers)

- [x] 3.3 Implement modifier rolling:
  - Random roll from available modifiers
  - Facility-based modifiers (enemy base = reinforcements)
  - Maximum modifier count (configurable)
  - Implemented in: `src/services/generators/ScenarioGeneratorService.ts`

## 4. Terrain Generator

- [x] 4.1 Define terrain/map selection rules:
  - Map preset based on biome
  - Temperature affects available biomes
  - Facility presence affects map features
  - Created in: `src/types/scenario/ScenarioInterfaces.ts` (IMapPreset, ITerrainFeature)

- [x] 4.2 Implement map preset selection
  - Created in: `src/data/scenario/mapPresets.ts` (17 presets across all biomes)

## 5. Integration

- [x] 5.1 Add generator service: `ScenarioGeneratorService`
  - Implemented in: `src/services/generators/ScenarioGeneratorService.ts`
  - Exports singleton: `scenarioGenerator`

- [x] 5.2 Integrate with Encounter creation:
  - "Generate Scenario" button
  - Preview generated setup
  - Allow manual adjustments
  - Implemented in: `src/pages/gameplay/encounters/[id].tsx`

- [x] 5.3 Add difficulty configuration UI:
  - Skill level selection (Green to Legendary)
  - Modifier count slider
  - BV percentage adjustment
  - Implemented in: `src/components/gameplay/ScenarioGenerator.tsx`

## 6. Testing

- [x] 6.1 Unit tests for OpFor BV calculations
  - 18 tests in: `src/services/generators/__tests__/OpForGeneratorService.test.ts`

- [x] 6.2 Unit tests for modifier rolling
  - Covered in ScenarioGeneratorService tests

- [x] 6.3 Integration tests for full scenario generation
  - 18 tests in: `src/services/generators/__tests__/ScenarioGeneratorService.test.ts`

- [x] 6.4 Balance testing with sample forces
  - 23 tests in: `src/services/generators/__tests__/balance.test.ts`
  - Tests BV accuracy, difficulty scaling, force composition, reproducibility
