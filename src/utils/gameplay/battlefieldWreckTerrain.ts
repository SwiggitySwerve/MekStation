import type {
  IGameEvent,
  IGameSession,
  ITerrainChangedPayload,
  IUnitGameState,
} from '@/types/gameplay/GameSessionInterfaces';
import type {
  IHexCoordinate,
  IHexGrid,
} from '@/types/gameplay/HexGridInterfaces';

import { GameEventType } from '@/types/gameplay/GameSessionInterfaces';
import {
  TerrainType,
  type ITerrainFeature,
} from '@/types/gameplay/TerrainTypes';
import { coordToKey } from '@/utils/gameplay/hexMath';
import {
  terrainFeaturesFromString,
  terrainStringFromFeatures,
} from '@/utils/gameplay/terrainEncoding';

export const TAC_OPS_BATTLE_WRECK_OPTIONAL_RULE_KEY = 'tacops_battle_wreck';

const BATTLEFIELD_WRECK_OPTION_KEYS = new Set([
  'tacopsbattlewreck',
  'advancedtacopsbattlewreck',
]);

type BattleWreckExcludedKind = NonNullable<
  IUnitGameState['combatState']
>['kind'];

export interface IBattlefieldWreckUnitProfile {
  readonly unitId: string;
  readonly position?: IHexCoordinate;
  readonly weightTons?: number;
  readonly combatKind?: BattleWreckExcludedKind;
  readonly isLargeSupportTank?: boolean;
  readonly isGroundMap?: boolean;
  readonly sourceEventId?: string;
}

export type BattlefieldWreckTerrainReason =
  | 'option_disabled'
  | 'missing_position'
  | 'missing_hex'
  | 'excluded_unit_type'
  | 'below_weight_threshold'
  | 'already_rough'
  | 'terrain_updated';

export interface IBattlefieldWreckTerrainResult {
  readonly changed: boolean;
  readonly reason: BattlefieldWreckTerrainReason;
  readonly unitId?: string;
  readonly hex?: IHexCoordinate;
  readonly previousTerrain?: string;
  readonly previousElevation?: number;
  readonly terrain?: string;
  readonly elevation?: number;
  readonly roughLevel?: number;
  readonly sourceEventId?: string;
  readonly optionalRule?: string;
}

function normalizeOptionalRule(rule: string): string {
  return rule.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function hasBattlefieldWreckOptionalRule(
  optionalRules: readonly string[] = [],
): boolean {
  return optionalRules.some((rule) =>
    BATTLEFIELD_WRECK_OPTION_KEYS.has(normalizeOptionalRule(rule)),
  );
}

function isExcludedBattlefieldWreckKind(
  combatKind: BattleWreckExcludedKind | undefined,
): boolean {
  return (
    combatKind === 'platoon' || combatKind === 'squad' || combatKind === 'proto'
  );
}

function upsertRoughTerrainFeature(
  features: readonly ITerrainFeature[],
  roughLevel: number,
): readonly ITerrainFeature[] {
  let foundRough = false;
  const nextFeatures = features
    .filter((feature) => feature.type !== TerrainType.Clear)
    .map((feature) => {
      if (feature.type !== TerrainType.Rough) return feature;
      foundRough = true;
      return { ...feature, level: Math.max(feature.level, roughLevel) };
    });

  if (foundRough) return nextFeatures;
  return [...nextFeatures, { type: TerrainType.Rough, level: roughLevel }];
}

function terrainHasRough(features: readonly ITerrainFeature[]): boolean {
  return features.some((feature) => feature.type === TerrainType.Rough);
}

function roughLevel(features: readonly ITerrainFeature[]): number {
  return (
    features.find((feature) => feature.type === TerrainType.Rough)?.level ?? 0
  );
}

export function applyBattlefieldWreckTerrainToGrid(
  grid: IHexGrid,
  unit: IBattlefieldWreckUnitProfile,
  optionalRules: readonly string[] = [],
): IBattlefieldWreckTerrainResult {
  if (!hasBattlefieldWreckOptionalRule(optionalRules)) {
    return { changed: false, reason: 'option_disabled' };
  }
  if (!unit.position) {
    return { changed: false, reason: 'missing_position' };
  }
  if (unit.isGroundMap === false) {
    return { changed: false, reason: 'excluded_unit_type' };
  }
  if (isExcludedBattlefieldWreckKind(unit.combatKind)) {
    return { changed: false, reason: 'excluded_unit_type' };
  }

  const targetRoughLevel = unit.isLargeSupportTank
    ? 2
    : (unit.weightTons ?? 0) >= 40
      ? 1
      : 0;
  if (targetRoughLevel === 0) {
    return { changed: false, reason: 'below_weight_threshold' };
  }

  const hexKey = coordToKey(unit.position);
  const hex = grid.hexes.get(hexKey);
  if (!hex) {
    return { changed: false, reason: 'missing_hex' };
  }

  const features = terrainFeaturesFromString(hex.terrain);
  const existingRoughLevel = roughLevel(features);
  if (
    (!unit.isLargeSupportTank && terrainHasRough(features)) ||
    existingRoughLevel >= targetRoughLevel
  ) {
    return {
      changed: false,
      reason: 'already_rough',
      terrain: hex.terrain,
      roughLevel: existingRoughLevel,
    };
  }

  const nextTerrain = terrainStringFromFeatures(
    upsertRoughTerrainFeature(features, targetRoughLevel),
  );
  grid.hexes.set(hexKey, { ...hex, terrain: nextTerrain });

  return {
    changed: true,
    reason: 'terrain_updated',
    unitId: unit.unitId,
    hex: unit.position,
    previousTerrain: hex.terrain,
    previousElevation: hex.elevation,
    terrain: nextTerrain,
    elevation: hex.elevation,
    roughLevel: targetRoughLevel,
    sourceEventId: unit.sourceEventId,
    optionalRule: TAC_OPS_BATTLE_WRECK_OPTIONAL_RULE_KEY,
  };
}

export function terrainChangedPayloadFromBattlefieldWreckResult(
  result: IBattlefieldWreckTerrainResult,
): ITerrainChangedPayload | null {
  if (
    !result.changed ||
    result.hex === undefined ||
    result.terrain === undefined
  ) {
    return null;
  }

  return {
    hex: result.hex,
    terrain: result.terrain,
    ...(result.elevation !== undefined ? { elevation: result.elevation } : {}),
    ...(result.previousTerrain !== undefined
      ? { previousTerrain: result.previousTerrain }
      : {}),
    ...(result.previousElevation !== undefined
      ? { previousElevation: result.previousElevation }
      : {}),
    reason: 'battlefield_wreckage',
    ...(result.sourceEventId !== undefined
      ? { sourceEventId: result.sourceEventId }
      : {}),
    ...(result.unitId !== undefined ? { sourceUnitId: result.unitId } : {}),
    ...(result.optionalRule !== undefined
      ? { optionalRule: result.optionalRule }
      : {}),
  };
}

function unitProfileFromDestroyedEvent(
  event: IGameEvent,
  sessionBeforeEvent: IGameSession,
  tonnageByUnit: ReadonlyMap<string, number>,
): IBattlefieldWreckUnitProfile | null {
  if (event.type !== GameEventType.UnitDestroyed) return null;
  const unitId = 'unitId' in event.payload ? event.payload.unitId : undefined;
  if (typeof unitId !== 'string') return null;

  const unit = sessionBeforeEvent.currentState.units[unitId];
  return {
    unitId,
    position: unit?.position,
    weightTons: tonnageByUnit.get(unitId),
    combatKind: unit?.combatState?.kind,
    sourceEventId: event.id,
  };
}

export function applyBattlefieldWreckTerrainForSessionEvents(
  grid: IHexGrid,
  sessionBeforeEvents: IGameSession,
  events: readonly IGameEvent[],
  tonnageByUnit: ReadonlyMap<string, number>,
): readonly IBattlefieldWreckTerrainResult[] {
  if (
    !hasBattlefieldWreckOptionalRule(sessionBeforeEvents.config.optionalRules)
  ) {
    return [];
  }

  const results: IBattlefieldWreckTerrainResult[] = [];
  for (const event of events) {
    const profile = unitProfileFromDestroyedEvent(
      event,
      sessionBeforeEvents,
      tonnageByUnit,
    );
    if (!profile) continue;
    results.push(
      applyBattlefieldWreckTerrainToGrid(
        grid,
        profile,
        sessionBeforeEvents.config.optionalRules,
      ),
    );
  }
  return results;
}
