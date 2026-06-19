import { ModifierEffect, ScenarioObjectiveType } from '@/types/scenario';

import { defineBattleModifier } from './modifierDefinition';

export const ENEMY_REINFORCEMENTS = defineBattleModifier({
  id: 'enemy_reinforcements',
  name: 'Enemy Reinforcements',
  descriptionParts: [
    'Additional enemy units will arrive as reinforcements during the battle. They appear on turn 4 from the enemy edge.',
  ],
  effect: ModifierEffect.Negative,
  applicability: {
    weight: 15,
    minTurn: 4,
    scenarioTypes: [
      ScenarioObjectiveType.Destroy,
      ScenarioObjectiveType.Capture,
      ScenarioObjectiveType.Defend,
    ],
  },
  implementation: {
    type: 'reinforcement',
    parameters: {
      side: 'enemy',
      arrivalTurn: 4,
      bvPercentage: 25,
      deploymentEdge: 'enemy',
    },
  },
  tags: ['reinforcement', 'enemy', 'difficulty'],
});

export const ALLIED_REINFORCEMENTS = defineBattleModifier({
  id: 'allied_reinforcements',
  name: 'Allied Reinforcements',
  descriptionParts: [
    'Friendly reinforcements will arrive to assist you. They appear on turn 5 from your deployment edge.',
  ],
  effect: ModifierEffect.Positive,
  applicability: {
    weight: 10,
    minTurn: 5,
    scenarioTypes: [
      ScenarioObjectiveType.Destroy,
      ScenarioObjectiveType.Defend,
      ScenarioObjectiveType.Capture,
    ],
  },
  implementation: {
    type: 'reinforcement',
    parameters: {
      side: 'player',
      arrivalTurn: 5,
      bvPercentage: 20,
      deploymentEdge: 'player',
    },
  },
  tags: ['reinforcement', 'allied', 'help'],
});
