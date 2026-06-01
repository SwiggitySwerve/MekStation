import type { IHex } from '@/types/gameplay';

import { IToHitModifierDetail } from '@/types/gameplay';
import {
  TerrainType,
  ITerrainFeature,
  TERRAIN_PROPERTIES,
} from '@/types/gameplay/TerrainTypes';
import { terrainFeaturesFromString } from '@/utils/gameplay/terrainEncoding';

import { HEAT_THRESHOLDS } from './constants';

interface IInterveningTerrainModifierInput {
  readonly terrain: string;
  readonly modifier: number;
}

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
  if (!hullDown || !partialCover) {
    return null;
  }

  return {
    name: 'Hull Down',
    value: 2,
    source: 'terrain',
    description: 'Target in hull-down position with cover: +2',
  };
}

function targetSmokeModifier(feature: ITerrainFeature): number {
  if (feature.type !== TerrainType.Smoke) return 0;
  return feature.level >= 2 ? 2 : 1;
}

function targetWoodsModifier(feature: ITerrainFeature): number {
  if (feature.type === TerrainType.LightWoods) return 1;
  if (feature.type === TerrainType.HeavyWoods) return 2;
  return 0;
}

function formatTargetTerrainDescription(
  woodsModifier: number,
  smokeModifier: number,
  value: number,
): string {
  if (woodsModifier > 0 && smokeModifier > 0) {
    return `Target in woods and smoke: +${value}`;
  }
  if (woodsModifier === 1) return 'Target in light woods: +1';
  if (woodsModifier === 2) return 'Target in heavy woods: +2';
  if (smokeModifier === 1) return 'Target in light smoke: +1';
  return 'Target in heavy smoke: +2';
}

/**
 * MegaMek separates target-hex woods/smoke terrain modifiers from true
 * partial cover. Source pins: `Compute.getTargetTerrainModifier` applies
 * target woods/smoke to-hit modifiers, while `LosEffects.targetCover` drives
 * partial-cover to-hit and hit-location behavior.
 */
export function calculateTargetTerrainModifier(
  targetTerrain: readonly ITerrainFeature[],
): IToHitModifierDetail | null {
  const woodsModifier = Math.max(0, ...targetTerrain.map(targetWoodsModifier));
  const smokeModifier = Math.max(0, ...targetTerrain.map(targetSmokeModifier));
  const value = woodsModifier + smokeModifier;
  if (value <= 0) return null;

  return {
    name: 'Target Terrain',
    value,
    source: 'terrain',
    description: formatTargetTerrainDescription(
      woodsModifier,
      smokeModifier,
      value,
    ),
  };
}

export function calculateTargetTerrainModifierFromHex(
  hex: Pick<IHex, 'terrain'> | undefined,
): IToHitModifierDetail | null {
  return calculateTargetTerrainModifier(
    terrainFeaturesFromString(hex?.terrain ?? ''),
  );
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

function formatTerrainName(terrain: string): string {
  return terrain.replace(/_/g, ' ');
}

export function calculateInterveningTerrainModifier(
  effects: readonly IInterveningTerrainModifierInput[],
): IToHitModifierDetail | null {
  const value = effects.reduce((total, effect) => total + effect.modifier, 0);
  if (value <= 0) return null;

  const description =
    effects.length === 1
      ? `Firing through ${formatTerrainName(effects[0].terrain)}: +${value}`
      : `Firing through ${effects.length} intervening terrain hexes: +${value}`;

  return {
    name: 'Intervening Terrain',
    value,
    source: 'terrain',
    description,
  };
}
