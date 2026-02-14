import { IToHitModifierDetail } from '@/types/gameplay';
import {
  ITerrainFeature,
  TERRAIN_PROPERTIES,
} from '@/types/gameplay/TerrainTypes';

import { HEAT_THRESHOLDS } from './constants';

export function calculateHeatModifier(heat: number): IToHitModifierDetail {
  const threshold = HEAT_THRESHOLDS.find(
    (entry) => heat >= entry.minHeat && heat <= entry.maxHeat,
  );
  const value = threshold?.modifier ?? 0;

  return {
    name: 'Heat',
    value,
    source: 'heat',
    description: heat === 0 ? 'No heat penalty' : `Heat ${heat}: +${value}`,
  };
}

export function calculatePartialCoverModifier(
  partialCover: boolean,
): IToHitModifierDetail | null {
  if (!partialCover) {
    return null;
  }

  return {
    name: 'Partial Cover',
    value: 1,
    source: 'terrain',
    description: 'Target in partial cover: +1',
  };
}

export function calculateHullDownModifier(
  hullDown: boolean,
  partialCover: boolean,
): IToHitModifierDetail | null {
  if (!hullDown || partialCover) {
    return null;
  }

  return {
    name: 'Hull-Down (Partial Cover)',
    value: 1,
    source: 'terrain',
    description: 'Target in hull-down position: +1',
  };
}

export function getTerrainToHitModifier(
  targetTerrain: readonly ITerrainFeature[],
  interveningTerrain: readonly ITerrainFeature[][],
): number {
  let modifier = 0;

  for (const hexFeatures of interveningTerrain) {
    for (const feature of hexFeatures) {
      modifier += TERRAIN_PROPERTIES[feature.type].toHitInterveningModifier;
    }
  }

  if (targetTerrain.length > 0) {
    let targetModifier =
      TERRAIN_PROPERTIES[targetTerrain[0].type].toHitTargetInModifier;
    for (let i = 1; i < targetTerrain.length; i++) {
      const featureModifier =
        TERRAIN_PROPERTIES[targetTerrain[i].type].toHitTargetInModifier;
      if (featureModifier > targetModifier) {
        targetModifier = featureModifier;
      }
    }
    modifier += targetModifier;
  }

  return modifier;
}
