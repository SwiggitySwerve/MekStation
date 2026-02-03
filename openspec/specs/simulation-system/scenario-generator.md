# Scenario Generator Specification

**Status**: Draft
**Version**: 1.0
**Last Updated**: 2026-02-01
**Dependencies**: Core Infrastructure (WeightedTable)
**Affects**: Simulation Runner

---

## Overview

### Purpose
Creates random game scenarios with weighted force composition, map generation, and starting positions using seeded RNG for reproducibility.

### Scope
**In Scope:**
- ScenarioGenerator class
- Weighted unit selection by tonnage class
- Random map generation (radius, terrain)
- Starting position and facing assignment
- Preset configurations (LIGHT_SKIRMISH, STANDARD_LANCE, STRESS_TEST)
- BV-matched force generation

**Out of Scope:**
- Smart/tactical force composition
- Campaign-level scenarios
- Physical attack scenarios
- Terrain movement cost validation
- More than 4v4 scenarios initially

---

## Requirements

### Requirement: Random Scenario Generation

The system SHALL generate valid game scenarios deterministically from seed.

**Priority**: Critical

#### Scenario: Generate balanced scenario
**GIVEN** config with unitCount=4, mapRadius=8, seed=12345
**WHEN** calling generate()
**THEN** scenario SHALL have 4 units per side
**AND** map SHALL have radius 8
**AND** units SHALL be at valid starting positions
**AND** same seed SHALL produce identical scenario

#### Scenario: Weighted unit selection
**GIVEN** WeightedTable with Light=3, Medium=2, Heavy=1, Assault=1
**WHEN** generating 100 units
**THEN** approximately 43% SHALL be Light
**AND** approximately 29% SHALL be Medium
**AND** approximately 14% SHALL be Heavy
**AND** approximately 14% SHALL be Assault

### Requirement: Preset Configurations

The system SHALL provide preset scenario configurations.

**Priority**: Medium

#### Scenario: Light skirmish preset
**GIVEN** preset = 'light-skirmish'
**WHEN** creating configuration
**THEN** unitCount SHALL be 2
**AND** mapRadius SHALL be 5
**AND** turnLimit SHALL be 50

---

## Data Model Requirements

```typescript
interface IScenarioPreset {
  readonly name: string;
  readonly unitCount: number;
  readonly mapRadius: number;
  readonly turnLimit: number;
}

const PRESETS: Record<string, IScenarioPreset> = {
  LIGHT_SKIRMISH: {
    name: 'light-skirmish',
    unitCount: 2,
    mapRadius: 5,
    turnLimit: 50
  },
  STANDARD_LANCE: {
    name: 'standard-lance',
    unitCount: 4,
    mapRadius: 8,
    turnLimit: 100
  },
  STRESS_TEST: {
    name: 'stress-test',
    unitCount: 4,
    mapRadius: 10,
    turnLimit: 200
  }
};

interface IScenarioGenerator {
  readonly generate: (
    config: ISimulationConfig,
    random: ISeededRandom
  ) => IGameSession;

  readonly generateForce: (
    unitCount: number,
    random: ISeededRandom
  ) => IGameUnit[];
}
```

---

## Examples

### Example: Generate Scenario

```typescript
const generator = new ScenarioGenerator();
const random = new SeededRandom(12345);
const config: ISimulationConfig = {
  seed: 12345,
  turnLimit: 100,
  unitCount: 4,
  mapRadius: 8
};

const scenario = generator.generate(config, random);
// scenario.units.length === 8 (4 player + 4 opponent)
// scenario.hexGrid.radius === 8
// Same seed always produces same scenario
```

---

## References

- MekHQ AtBScenarioFactory: E:\Projects\mekhq\MekHQ\src\mekhq\campaign\mission\atb\AtBScenarioFactory.java
- Core Infrastructure Specification (WeightedTable)

---

## Changelog

### Version 1.0 (2026-02-01)
- Initial specification
