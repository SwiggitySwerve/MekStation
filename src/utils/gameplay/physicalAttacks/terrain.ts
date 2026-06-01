import type {
  IHexGrid,
  IUnitGameState,
  ITerrainFeature,
} from '@/types/gameplay';

import { TerrainType } from '@/types/gameplay';

import type { IPhysicalAttackTerrainContext } from './types';

import { coordToKey } from '../hexMath';
import { terrainFeaturesFromString } from '../terrainEncoding';

function buildingFeatureForUnit(
  unit: IUnitGameState,
  grid: IHexGrid,
): ITerrainFeature | undefined {
  const hex = grid.hexes.get(coordToKey(unit.position));
  return terrainFeaturesFromString(hex?.terrain ?? '').find(
    (feature) => feature.type === TerrainType.Building && feature.level > 0,
  );
}

/**
 * Build the represented terrain context consumed by physical-attack
 * restrictions. Legacy/simple terrain tags only expose coarse building
 * occupancy; encoded terrain metadata may also expose a stable building id.
 */
export function buildPhysicalTerrainContext(
  attacker: IUnitGameState,
  target: IUnitGameState,
  grid: IHexGrid,
): IPhysicalAttackTerrainContext {
  const attackerBuilding = buildingFeatureForUnit(attacker, grid);
  const targetBuilding = buildingFeatureForUnit(target, grid);

  return {
    attackerInBuilding: attackerBuilding !== undefined,
    targetInBuilding: targetBuilding !== undefined,
    attackerBuildingId: attackerBuilding?.buildingId,
    targetBuildingId: targetBuilding?.buildingId,
  };
}
