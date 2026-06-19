import type { ILOSDamageableCoverProvider } from '@/utils/gameplay/lineOfSight';

import {
  GameEventType,
  GamePhase,
  IGameEvent,
  IGameState,
  IHexGrid,
  ITerrainChangedPayload,
  TerrainType,
} from '@/types/gameplay';
import { applyTerrainChanged } from '@/utils/gameplay/gameState/terrainReducer';
import { coordToKey } from '@/utils/gameplay/hexMath';
import {
  terrainFeaturesFromString,
  terrainStringFromFeatures,
} from '@/utils/gameplay/terrainEncoding';

import { createGameEvent } from './utils';

function coverProviderMatchesFeature(
  provider: ILOSDamageableCoverProvider,
  feature: {
    readonly type: TerrainType;
    readonly buildingId?: string;
    readonly fuelTankId?: string;
    readonly fuelTankElevation?: number;
  },
): boolean {
  if (provider.kind === 'grounded-dropship') return false;
  if (feature.type !== TerrainType.Building) return false;
  if (provider.kind === 'fuel-tank') {
    if (provider.fuelTankId !== undefined || feature.fuelTankId !== undefined) {
      return provider.fuelTankId === feature.fuelTankId;
    }
    return feature.fuelTankElevation !== undefined;
  }

  if (provider.buildingId !== undefined || feature.buildingId !== undefined) {
    return provider.buildingId === feature.buildingId;
  }
  return (
    feature.fuelTankId === undefined && feature.fuelTankElevation === undefined
  );
}

export function applyDamageableCoverProviderHit(options: {
  currentState: IGameState;
  events: IGameEvent[];
  gameId: string;
  attackerId: string;
  provider: ILOSDamageableCoverProvider | undefined;
  grid: IHexGrid | undefined;
  damage: number;
}): IGameState {
  const { attackerId, damage, events, gameId, grid, provider } = options;
  if (!provider || !grid || damage <= 0) return options.currentState;

  const key = coordToKey(provider.coord);
  const hex = grid.hexes.get(key);
  if (!hex) return options.currentState;

  let changed = false;
  const nextFeatures = terrainFeaturesFromString(hex.terrain).flatMap(
    (feature) => {
      if (changed || !coverProviderMatchesFeature(provider, feature)) {
        return [feature];
      }

      changed = true;
      const constructionFactor = Math.max(
        0,
        (feature.constructionFactor ?? provider.constructionFactor ?? 0) -
          damage,
      );
      if (constructionFactor === 0) return [];
      return [{ ...feature, constructionFactor }];
    },
  );

  if (!changed) return options.currentState;

  const nextTerrain = terrainStringFromFeatures(nextFeatures);
  const payload: ITerrainChangedPayload = {
    hex: provider.coord,
    terrain: nextTerrain,
    elevation: hex.elevation,
    previousTerrain: hex.terrain,
    previousElevation: hex.elevation,
    reason: 'damageable_cover_hit',
    sourceUnitId: attackerId,
  };
  events.push(
    createGameEvent(
      gameId,
      events.length,
      GameEventType.TerrainChanged,
      options.currentState.turn,
      GamePhase.WeaponAttack,
      payload,
      attackerId,
    ),
  );
  grid.hexes.set(key, { ...hex, terrain: nextTerrain });
  return applyTerrainChanged(options.currentState, payload);
}
