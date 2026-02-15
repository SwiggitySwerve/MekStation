import type { IBattleModifier } from '@/types/scenario';

import {
  BiomeType,
  ModifierEffect,
  ScenarioObjectiveType,
} from '@/types/scenario';

export const AMBUSH: IBattleModifier = {
  id: 'ambush',
  name: 'Ambush',
  description:
    'The enemy has set up an ambush. Some enemy units deploy hidden and are revealed when they attack or are spotted.',
  effect: ModifierEffect.Negative,
  applicability: {
    weight: 12,
    scenarioTypes: [
      ScenarioObjectiveType.Escort,
      ScenarioObjectiveType.Recon,
      ScenarioObjectiveType.Breakthrough,
    ],
    biomes: [BiomeType.Forest, BiomeType.Urban, BiomeType.Jungle],
  },
  implementation: {
    type: 'force_modifier',
    parameters: {
      hiddenUnits: 50,
      spotRange: 4,
    },
  },
  tags: ['tactical', 'surprise', 'difficulty'],
};

export const SENSOR_GHOSTS: IBattleModifier = {
  id: 'sensor_ghosts',
  name: 'Sensor Ghosts',
  description:
    'Electronic interference creates false sensor contacts. Some blips on your sensors are decoys.',
  effect: ModifierEffect.Negative,
  applicability: {
    weight: 8,
    scenarioTypes: [ScenarioObjectiveType.Recon, ScenarioObjectiveType.Destroy],
  },
  implementation: {
    type: 'force_modifier',
    parameters: {
      decoyCount: 3,
      revealRange: 3,
    },
  },
  tags: ['electronic', 'deception', 'difficulty'],
};

export const INTEL_ADVANTAGE: IBattleModifier = {
  id: 'intel_advantage',
  name: 'Intel Advantage',
  description:
    'Your reconnaissance has paid off. Enemy units are revealed at the start of battle.',
  effect: ModifierEffect.Positive,
  applicability: {
    weight: 10,
    scenarioTypes: [
      ScenarioObjectiveType.Capture,
      ScenarioObjectiveType.Destroy,
    ],
  },
  implementation: {
    type: 'force_modifier',
    parameters: {
      enemyRevealed: true,
    },
  },
  tags: ['intel', 'reconnaissance', 'help'],
};

export const DAMAGED_UNITS: IBattleModifier = {
  id: 'damaged_units',
  name: 'Battered Force',
  description:
    'Your force has seen recent action. Each unit starts with 10-30% armor damage randomly distributed.',
  effect: ModifierEffect.Negative,
  applicability: {
    weight: 8,
    scenarioTypes: [
      ScenarioObjectiveType.Defend,
      ScenarioObjectiveType.Breakthrough,
      ScenarioObjectiveType.Escort,
    ],
  },
  implementation: {
    type: 'force_modifier',
    parameters: {
      armorDamageMin: 10,
      armorDamageMax: 30,
      affectsSide: 'player',
    },
  },
  tags: ['damage', 'attrition', 'difficulty'],
};
