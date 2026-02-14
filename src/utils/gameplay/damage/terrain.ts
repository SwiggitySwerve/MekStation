import {
  CombatLocation,
  IDamageResult,
  IHexTerrain,
  TerrainType,
} from '@/types/gameplay';

import { roll2d6 } from '../hitLocation';
import { resolveDamage } from './resolve';
import { ITerrainDamageResult, IUnitDamageState } from './types';

function hasDeepWater(terrain: IHexTerrain | null): number {
  if (!terrain) {
    return 0;
  }

  const waterFeature = terrain.features.find(
    (feature) => feature.type === TerrainType.Water,
  );
  return waterFeature && waterFeature.level >= 2 ? waterFeature.level : 0;
}

function indicatesFall(damageResult: IDamageResult): boolean {
  return damageResult.locationDamages.some(
    (locationDamage) => locationDamage.destroyed,
  );
}

export function applyDamageWithTerrainEffects(
  state: IUnitDamageState,
  location: CombatLocation,
  damage: number,
  terrain: IHexTerrain | null,
): ITerrainDamageResult {
  const baseResult = resolveDamage(state, location, damage);

  if (!terrain) {
    return baseResult;
  }

  const waterDepth = hasDeepWater(terrain);
  const unitFell = indicatesFall(baseResult.result);

  if (waterDepth >= 2 && unitFell) {
    const drowningRoll = roll2d6();
    const psrTarget = 5;
    const drowningCheckPassed = drowningRoll.total >= psrTarget;

    if (!drowningCheckPassed) {
      const drowningDamage = 1;
      const drowningResult = resolveDamage(
        baseResult.state,
        'center_torso',
        drowningDamage,
      );

      return {
        state: drowningResult.state,
        result: {
          ...drowningResult.result,
          locationDamages: [
            ...baseResult.result.locationDamages,
            ...drowningResult.result.locationDamages,
          ],
        },
        terrainEffects: {
          drowningCheckTriggered: true,
          drowningRoll,
          drowningCheckPassed: false,
          drowningDamage,
        },
      };
    }

    return {
      ...baseResult,
      terrainEffects: {
        drowningCheckTriggered: true,
        drowningRoll,
        drowningCheckPassed: true,
      },
    };
  }

  return baseResult;
}
