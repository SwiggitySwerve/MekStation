import type {
  IHexCoordinate,
  IHexGrid,
  IToHitModifierDetail,
} from '@/types/gameplay';
import type { ITerrainFeature } from '@/types/gameplay/TerrainTypes';
import type { ILOSResult } from '@/utils/gameplay/lineOfSight';

import { coordToKey } from '@/utils/gameplay/hexMath';
import { parseTerrainFeatures } from '@/utils/gameplay/lineOfSight';
import {
  calculateInterveningTerrainModifier,
  getTerrainToHitModifier,
} from '@/utils/gameplay/toHit';

export function calculateInterveningTerrainToHitModifier(
  grid: IHexGrid | undefined,
  losResult: ILOSResult | undefined,
): IToHitModifierDetail | null {
  if (!grid || !losResult?.hasLOS) return null;

  return calculateInterveningTerrainModifier(
    losResult.interveningTerrainEffects,
  );
}

export function calculateTargetTerrainToHitModifier(
  grid: IHexGrid | undefined,
  targetPosition: IHexCoordinate,
): IToHitModifierDetail | null {
  if (!grid) return null;

  const targetTerrain = targetTerrainFeatures(grid, targetPosition);
  const value = getTerrainToHitModifier(targetTerrain, []);

  if (value === 0) return null;

  return {
    name: 'Target Terrain',
    value,
    source: 'terrain',
    description: `Target terrain features: ${value > 0 ? '+' : ''}${value}`,
  };
}

export function targetTerrainFeatures(
  grid: IHexGrid | undefined,
  targetPosition: IHexCoordinate,
): readonly ITerrainFeature[] {
  if (!grid) return [];

  const targetHex = grid.hexes.get(coordToKey(targetPosition));
  return targetHex ? parseTerrainFeatures(targetHex.terrain) : [];
}
