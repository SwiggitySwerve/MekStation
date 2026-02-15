import type { IBattleModifier } from '@/types/scenario';

import { ModifierEffect, ScenarioObjectiveType } from '@/types/scenario';

export const MINEFIELD: IBattleModifier = {
  id: 'minefield',
  name: 'Minefield',
  description:
    'The enemy has laid minefields in the approach. Random hexes contain mines that deal 10 damage when triggered.',
  effect: ModifierEffect.Negative,
  applicability: {
    weight: 12,
    scenarioTypes: [
      ScenarioObjectiveType.Capture,
      ScenarioObjectiveType.Breakthrough,
    ],
  },
  implementation: {
    type: 'equipment_effect',
    parameters: {
      mineCount: 8,
      mineDamage: 10,
      deploymentZone: 'center',
    },
  },
  tags: ['hazard', 'mines', 'difficulty'],
};

export const ARTILLERY_SUPPORT: IBattleModifier = {
  id: 'artillery_support',
  name: 'Artillery Support',
  description:
    'You have access to off-map artillery support. Once per game, call in a barrage dealing 15 damage to a 3-hex radius.',
  effect: ModifierEffect.Positive,
  applicability: {
    weight: 8,
    scenarioTypes: [
      ScenarioObjectiveType.Destroy,
      ScenarioObjectiveType.Capture,
      ScenarioObjectiveType.Defend,
    ],
  },
  implementation: {
    type: 'equipment_effect',
    parameters: {
      uses: 1,
      damage: 15,
      radius: 3,
      callTime: 2,
    },
  },
  tags: ['support', 'artillery', 'help'],
};

export const ENEMY_ARTILLERY: IBattleModifier = {
  id: 'enemy_artillery',
  name: 'Enemy Artillery',
  description:
    'The enemy has artillery support. Every 3 turns, a random player unit is targeted with a 10-damage strike.',
  effect: ModifierEffect.Negative,
  applicability: {
    weight: 10,
    scenarioTypes: [
      ScenarioObjectiveType.Destroy,
      ScenarioObjectiveType.Capture,
      ScenarioObjectiveType.Breakthrough,
    ],
  },
  implementation: {
    type: 'equipment_effect',
    parameters: {
      frequency: 3,
      damage: 10,
      targetSelection: 'random',
    },
  },
  tags: ['hazard', 'artillery', 'difficulty'],
};
