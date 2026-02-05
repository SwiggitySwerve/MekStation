/**
 * Battle Modifier Data
 * Pre-defined battle modifiers for scenario generation.
 *
 * @spec openspec/changes/add-scenario-generators/spec.md
 */

import {
  BiomeType,
  type IBattleModifier,
  ModifierEffect,
  ScenarioObjectiveType,
} from '../../types/scenario';

// =============================================================================
// Reinforcement Modifiers
// =============================================================================

/**
 * Enemy reinforcements - additional OpFor units arrive.
 */
export const ENEMY_REINFORCEMENTS: IBattleModifier = {
  id: 'enemy_reinforcements',
  name: 'Enemy Reinforcements',
  description:
    'Additional enemy units will arrive as reinforcements during the battle. They appear on turn 4 from the enemy edge.',
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
};

/**
 * Allied reinforcements - friendly units arrive.
 */
export const ALLIED_REINFORCEMENTS: IBattleModifier = {
  id: 'allied_reinforcements',
  name: 'Allied Reinforcements',
  description:
    'Friendly reinforcements will arrive to assist you. They appear on turn 5 from your deployment edge.',
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
};

// =============================================================================
// Terrain/Weather Modifiers
// =============================================================================

/**
 * Heavy fog - reduced visibility.
 */
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

/**
 * Night battle - darkness penalties.
 */
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

/**
 * Extreme heat - increased heat buildup.
 */
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

/**
 * Freezing conditions - reduced heat.
 */
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

/**
 * Dust storm - movement and visibility penalties.
 */
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

// =============================================================================
// Equipment/Asset Modifiers
// =============================================================================

/**
 * Minefield - hazardous terrain.
 */
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

/**
 * Artillery support - player has off-map artillery.
 */
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

/**
 * Enemy artillery - OpFor has artillery.
 */
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

// =============================================================================
// Force Modifiers
// =============================================================================

/**
 * Ambush - hidden enemy deployment.
 */
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

/**
 * Sensor ghosts - false radar contacts.
 */
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

/**
 * Intel advantage - pre-battle reconnaissance.
 */
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

/**
 * Damaged units - player units start damaged.
 */
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

// =============================================================================
// Objective Modifiers
// =============================================================================

/**
 * Time pressure - reduced turn limit.
 */
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

/**
 * Extended engagement - more time available.
 */
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

// =============================================================================
// Exports
// =============================================================================

/**
 * All available battle modifiers.
 */
export const BATTLE_MODIFIERS: readonly IBattleModifier[] = [
  // Reinforcements
  ENEMY_REINFORCEMENTS,
  ALLIED_REINFORCEMENTS,
  // Terrain/Weather
  HEAVY_FOG,
  NIGHT_BATTLE,
  EXTREME_HEAT,
  FREEZING_CONDITIONS,
  DUST_STORM,
  // Equipment
  MINEFIELD,
  ARTILLERY_SUPPORT,
  ENEMY_ARTILLERY,
  // Force
  AMBUSH,
  SENSOR_GHOSTS,
  INTEL_ADVANTAGE,
  DAMAGED_UNITS,
  // Objective
  TIME_PRESSURE,
  EXTENDED_ENGAGEMENT,
];

/**
 * Get a modifier by ID.
 */
export function getModifierById(id: string): IBattleModifier | undefined {
  return BATTLE_MODIFIERS.find((m) => m.id === id);
}

/**
 * Get modifiers by effect type.
 */
export function getModifiersByEffect(
  effect: ModifierEffect,
): readonly IBattleModifier[] {
  return BATTLE_MODIFIERS.filter((m) => m.effect === effect);
}

/**
 * Get modifiers by tag.
 */
export function getModifiersByTag(tag: string): readonly IBattleModifier[] {
  return BATTLE_MODIFIERS.filter((m) => m.tags.includes(tag));
}

/**
 * Get modifiers applicable to a scenario type.
 */
export function getModifiersForScenarioType(
  scenarioType: ScenarioObjectiveType,
): readonly IBattleModifier[] {
  return BATTLE_MODIFIERS.filter(
    (m) =>
      !m.applicability.scenarioTypes ||
      m.applicability.scenarioTypes.includes(scenarioType),
  );
}

/**
 * Get modifiers applicable to a biome.
 */
export function getModifiersForBiome(
  biome: BiomeType,
): readonly IBattleModifier[] {
  return BATTLE_MODIFIERS.filter(
    (m) => !m.applicability.biomes || m.applicability.biomes.includes(biome),
  );
}
