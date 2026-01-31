/**
 * Heat Utility Module
 * Calculates terrain-based heat effects for BattleMech combat.
 *
 * @spec openspec/specs/terrain-system/spec.md
 */

import { TerrainType, TERRAIN_PROPERTIES, ITerrainFeature } from '@/types/gameplay/TerrainTypes';

/**
 * Get bonus heat dissipation from standing in water.
 * @param waterDepth - Water depth level (0 = no water, 1-3+)
 * @returns Additional heat sinks worth of cooling (0, 2, or 4)
 */
export function getWaterCoolingBonus(waterDepth: number): number {
  if (waterDepth <= 0) return 0;
  if (waterDepth === 1) return 2; // Depth 1: +2 heat sinks
  return 4; // Depth 2+: +4 heat sinks
}

/**
 * Get heat effect from terrain features.
 * @param terrainFeatures - Array of terrain features at the hex
 * @returns Net heat effect (negative = cooling, positive = heating)
 */
export function getTerrainHeatEffect(terrainFeatures: readonly ITerrainFeature[]): number {
  let heatEffect = 0;

  for (const feature of terrainFeatures) {
    const props = TERRAIN_PROPERTIES[feature.type];

    // Special handling for water - use level as depth
    if (feature.type === TerrainType.Water) {
      heatEffect += getWaterCoolingBonus(feature.level) * -1; // Negative = cooling
    } else {
      heatEffect += props.heatEffect;
    }
  }

  return heatEffect;
}

/**
 * Calculate total heat dissipation including terrain effects.
 * @param baseHeatSinks - Number of heat sinks on the unit
 * @param terrainFeatures - Terrain at unit's hex
 * @returns Total heat dissipation per turn
 */
export function calculateHeatDissipation(
  baseHeatSinks: number,
  terrainFeatures: readonly ITerrainFeature[]
): number {
  const waterFeature = terrainFeatures.find((f) => f.type === TerrainType.Water);
  const waterBonus = waterFeature ? getWaterCoolingBonus(waterFeature.level) : 0;

  return baseHeatSinks + waterBonus;
}
