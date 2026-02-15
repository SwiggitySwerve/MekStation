import type { IBattleModifier } from '@/types/scenario';

import { BiomeType, ModifierEffect } from '@/types/scenario';

export const HEAVY_FOG: IBattleModifier = {
  id: 'heavy_fog',
  name: 'Heavy Fog',
  description:
    'Dense fog blankets the battlefield, reducing visibility. All attacks beyond 6 hexes suffer a +2 modifier.',
  effect: ModifierEffect.Neutral,
  applicability: {
    weight: 20,
    biomes: [
      BiomeType.Swamp,
      BiomeType.Forest,
      BiomeType.Plains,
      BiomeType.Arctic,
    ],
  },
  implementation: {
    type: 'terrain_effect',
    parameters: {
      visibilityLimit: 10,
      rangeModifier: 2,
      rangeThreshold: 6,
    },
  },
  tags: ['weather', 'visibility', 'neutral'],
};

export const NIGHT_BATTLE: IBattleModifier = {
  id: 'night_battle',
  name: 'Night Battle',
  description:
    'The battle takes place at night. All attacks suffer a +1 modifier unless equipped with searchlights or advanced sensors.',
  effect: ModifierEffect.Neutral,
  applicability: {
    weight: 15,
    exclusiveWith: ['heavy_fog', 'dust_storm'],
  },
  implementation: {
    type: 'terrain_effect',
    parameters: {
      globalModifier: 1,
      negatedBy: ['searchlight', 'advanced_sensors', 'active_probe'],
    },
  },
  tags: ['weather', 'night', 'visibility'],
};

export const EXTREME_HEAT: IBattleModifier = {
  id: 'extreme_heat',
  name: 'Extreme Heat',
  description:
    'Scorching temperatures increase heat dissipation problems. All units generate +2 heat per turn.',
  effect: ModifierEffect.Negative,
  applicability: {
    weight: 15,
    biomes: [BiomeType.Desert, BiomeType.Volcanic, BiomeType.Badlands],
  },
  implementation: {
    type: 'terrain_effect',
    parameters: {
      heatPerTurn: 2,
      affectsAll: true,
    },
  },
  tags: ['weather', 'heat', 'difficulty'],
};

export const FREEZING_CONDITIONS: IBattleModifier = {
  id: 'freezing_conditions',
  name: 'Freezing Conditions',
  description:
    'Sub-zero temperatures improve heat dissipation. All units dissipate 2 additional heat per turn.',
  effect: ModifierEffect.Positive,
  applicability: {
    weight: 12,
    biomes: [BiomeType.Arctic],
  },
  implementation: {
    type: 'terrain_effect',
    parameters: {
      heatDissipation: 2,
      affectsAll: true,
    },
  },
  tags: ['weather', 'cold', 'help'],
};

export const DUST_STORM: IBattleModifier = {
  id: 'dust_storm',
  name: 'Dust Storm',
  description:
    'A severe dust storm reduces visibility and hampers movement. -1 MP for all ground units, +1 to hit at all ranges.',
  effect: ModifierEffect.Neutral,
  applicability: {
    weight: 10,
    biomes: [BiomeType.Desert, BiomeType.Badlands, BiomeType.Plains],
    exclusiveWith: ['heavy_fog', 'night_battle'],
  },
  implementation: {
    type: 'terrain_effect',
    parameters: {
      movementPenalty: 1,
      globalModifier: 1,
      affectsAll: true,
    },
  },
  tags: ['weather', 'visibility', 'movement', 'neutral'],
};
