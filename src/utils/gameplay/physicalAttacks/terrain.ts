import type { IHexGrid, IUnitGameState } from '@/types/gameplay';

import { TerrainType } from '@/types/gameplay';

import type { IPhysicalAttackTerrainContext } from './types';

import { coordToKey } from '../hexMath';
import { terrainFeaturesFromString } from '../terrainEncoding';

function unitOccupiesBuildingHex(
  unit: IUnitGameState,
  grid: IHexGrid,
): boolean {
  const hex = grid.hexes.get(coordToKey(unit.position));
  return terrainFeaturesFromString(hex?.terrain ?? '').some(
    (feature) => feature.type === TerrainType.Building && feature.level > 0,
  );
}

/**
 * Build the represented terrain context consumed by physical-attack
 * restrictions. This deliberately avoids guessing building IDs; until those
 * exist, the safe represented gate is "target in a building while attacker is
 * not in a building hex".
 */
export function buildPhysicalTerrainContext(
  attacker: IUnitGameState,
  target: IUnitGameState,
  grid: IHexGrid,
): IPhysicalAttackTerrainContext {
  return {
    attackerInBuilding: unitOccupiesBuildingHex(attacker, grid),
    targetInBuilding: unitOccupiesBuildingHex(target, grid),
  };
}
