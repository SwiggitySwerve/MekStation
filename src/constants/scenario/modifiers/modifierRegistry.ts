import type { IBattleModifier } from '@/types/scenario';

import {
  BiomeType,
  ModifierEffect,
  ScenarioObjectiveType,
} from '@/types/scenario';

import {
  MINEFIELD,
  ARTILLERY_SUPPORT,
  ENEMY_ARTILLERY,
} from './equipmentModifiers';
import {
  AMBUSH,
  SENSOR_GHOSTS,
  INTEL_ADVANTAGE,
  DAMAGED_UNITS,
} from './forceModifiers';
import { TIME_PRESSURE, EXTENDED_ENGAGEMENT } from './objectiveModifiers';
import {
  ENEMY_REINFORCEMENTS,
  ALLIED_REINFORCEMENTS,
} from './reinforcementModifiers';
import {
  HEAVY_FOG,
  NIGHT_BATTLE,
  EXTREME_HEAT,
  FREEZING_CONDITIONS,
  DUST_STORM,
} from './terrainModifiers';

export const BATTLE_MODIFIERS: readonly IBattleModifier[] = [
  ENEMY_REINFORCEMENTS,
  ALLIED_REINFORCEMENTS,
  HEAVY_FOG,
  NIGHT_BATTLE,
  EXTREME_HEAT,
  FREEZING_CONDITIONS,
  DUST_STORM,
  MINEFIELD,
  ARTILLERY_SUPPORT,
  ENEMY_ARTILLERY,
  AMBUSH,
  SENSOR_GHOSTS,
  INTEL_ADVANTAGE,
  DAMAGED_UNITS,
  TIME_PRESSURE,
  EXTENDED_ENGAGEMENT,
];

export function getModifierById(id: string): IBattleModifier | undefined {
  return BATTLE_MODIFIERS.find((m) => m.id === id);
}

export function getModifiersByEffect(
  effect: ModifierEffect,
): readonly IBattleModifier[] {
  return BATTLE_MODIFIERS.filter((m) => m.effect === effect);
}

export function getModifiersByTag(tag: string): readonly IBattleModifier[] {
  return BATTLE_MODIFIERS.filter((m) => m.tags.includes(tag));
}

export function getModifiersForScenarioType(
  scenarioType: ScenarioObjectiveType,
): readonly IBattleModifier[] {
  return BATTLE_MODIFIERS.filter(
    (m) =>
      !m.applicability.scenarioTypes ||
      m.applicability.scenarioTypes.includes(scenarioType),
  );
}

export function getModifiersForBiome(
  biome: BiomeType,
): readonly IBattleModifier[] {
  return BATTLE_MODIFIERS.filter(
    (m) => !m.applicability.biomes || m.applicability.biomes.includes(biome),
  );
}
