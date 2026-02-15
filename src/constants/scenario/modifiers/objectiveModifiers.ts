import type { IBattleModifier } from '@/types/scenario';

import { ModifierEffect, ScenarioObjectiveType } from '@/types/scenario';

export const TIME_PRESSURE: IBattleModifier = {
  id: 'time_pressure',
  name: 'Time Pressure',
  description:
    'External factors require a quick resolution. The turn limit is reduced by 3 turns.',
  effect: ModifierEffect.Negative,
  applicability: {
    weight: 10,
    minTurn: 5,
    scenarioTypes: [
      ScenarioObjectiveType.Capture,
      ScenarioObjectiveType.Defend,
      ScenarioObjectiveType.Breakthrough,
    ],
  },
  implementation: {
    type: 'objective_modifier',
    parameters: {
      turnLimitChange: -3,
    },
  },
  tags: ['time', 'pressure', 'difficulty'],
};

export const EXTENDED_ENGAGEMENT: IBattleModifier = {
  id: 'extended_engagement',
  name: 'Extended Engagement',
  description:
    'No time pressure allows for a longer engagement. Turn limit increased by 5 turns.',
  effect: ModifierEffect.Positive,
  applicability: {
    weight: 8,
    scenarioTypes: [
      ScenarioObjectiveType.Capture,
      ScenarioObjectiveType.Defend,
    ],
    exclusiveWith: ['time_pressure'],
  },
  implementation: {
    type: 'objective_modifier',
    parameters: {
      turnLimitChange: 5,
    },
  },
  tags: ['time', 'extension', 'help'],
};
