import type {
  IHexCoordinate,
  IHexGrid,
  IToHitModifierDetail,
} from '@/types/gameplay';
import type { ILOSResult } from '@/utils/gameplay/lineOfSight';

import { coordToKey } from '@/utils/gameplay/hexMath';
import { parseTerrainFeatures } from '@/utils/gameplay/lineOfSight';
import { getTerrainToHitModifier } from '@/utils/gameplay/toHit';

export function calculateInterveningTerrainToHitModifier(
  grid: IHexGrid | undefined,
  losResult: ILOSResult | undefined,
): IToHitModifierDetail | null {
  if (!grid || !losResult?.hasLOS) return null;

  const interveningTerrain = losResult.interveningHexes.map((coord) => {
    const hex = grid.hexes.get(coordToKey(coord));
    return hex ? parseTerrainFeatures(hex.terrain) : [];
  });
  const value = getTerrainToHitModifier([], interveningTerrain);

  if (value === 0) return null;

  return {
    name: 'Intervening Terrain',
    value,
    source: 'terrain',
    description: `Intervening terrain features: ${value > 0 ? '+' : ''}${value}`,
  };
}

export function calculateTargetTerrainToHitModifier(
  grid: IHexGrid | undefined,
  targetPosition: IHexCoordinate,
): IToHitModifierDetail | null {
  if (!grid) return null;

  const targetHex = grid.hexes.get(coordToKey(targetPosition));
  const targetTerrain = targetHex
    ? parseTerrainFeatures(targetHex.terrain)
    : [];
  const value = getTerrainToHitModifier(targetTerrain, []);

  if (value === 0) return null;

  return {
    name: 'Target Terrain',
    value,
    source: 'terrain',
    description: `Target terrain features: ${value > 0 ? '+' : ''}${value}`,
  };
}
