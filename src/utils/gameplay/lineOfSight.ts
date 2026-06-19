/**
 * Line of Sight Calculation Module
 * Implements BattleTech LOS rules with terrain blocking.
 *
 * @spec openspec/specs/terrain-system/spec.md
 */

import type {
  IHexCoordinate,
  IHexGrid,
} from '@/types/gameplay/HexGridInterfaces';

import { TerrainType } from '@/types/gameplay/TerrainTypes';

import type { ILOSCalculationOptions, ILOSResult } from './lineOfSight.types';

import { coordToKey, hexEquals, hexLine } from './hexMath';
import {
  defenderFavorableDividedResult,
  hexLineWithPerpendicularNudge,
  interveningHexesForLine,
  isDividedLosBearing,
} from './lineOfSight.geometry';
import {
  getBlockingTerrain,
  parseTerrainFeatures,
  sharedEndpointBuildingContext,
} from './lineOfSight.terrain';
import { calculateLOSForInterveningHexes } from './lineOfSight.trace';
import {
  endpointWaterStatus,
  initialMinimumWaterDepth,
  landToUnderwaterBlocked,
} from './lineOfSight.water';

export type {
  ILOSCalculationOptions,
  ILOSDamageableCoverProvider,
  ILOSInterveningTerrainEffect,
  ILOSResult,
  ILOSUnitOccupantState,
  LOSDamageableBuildingClass,
  LOSDamageableCoverProviderKind,
  LOSDamageableCoverSide,
} from './lineOfSight.types';
export { getBlockingTerrain, parseTerrainFeatures };

const TAC_OPS_LOS_DIAGRAM_OPTIONAL_RULES = new Set([
  'advanced_combat_tac_ops_los1',
  'advanced-combat-tac-ops-los1',
  'tac_ops_los1',
  'tac-ops-los1',
  'tacops_los1',
  'tacops-los1',
]);

export function lineOfSightOptionsFromOptionalRules(
  optionalRules: readonly string[] | undefined,
): ILOSCalculationOptions {
  if (optionalRules === undefined) {
    return {};
  }

  return {
    tacOpsLosDiagram: optionalRules.some((rule) =>
      TAC_OPS_LOS_DIAGRAM_OPTIONAL_RULES.has(rule.toLowerCase()),
    ),
  };
}

/**
 * Calculate line of sight between two hexes.
 *
 * Implements basic BattleTech LOS rules:
 * - Draws a line from source to target
 * - Checks intervening hexes for blocking terrain
 * - Considers elevation differences, including pure intervening elevation
 *   blockers without a blocking terrain feature
 */
export function calculateLOS(
  from: IHexCoordinate,
  to: IHexCoordinate,
  grid: IHexGrid,
  fromElevation?: number,
  toElevation?: number,
  options: ILOSCalculationOptions = {},
): ILOSResult {
  const lineHexes = hexLine(from, to);
  const interveningHexes = interveningHexesForLine(lineHexes, from, to);
  const fromHex = grid.hexes.get(coordToKey(from));
  const toHex = grid.hexes.get(coordToKey(to));
  const fromBaseElevation = fromHex?.elevation ?? 0;
  const toBaseElevation = toHex?.elevation ?? 0;
  const fromWater = endpointWaterStatus({
    terrainString: fromHex?.terrain,
    baseElevation: fromBaseElevation,
    losElevation: fromElevation,
  });
  const toWater = endpointWaterStatus({
    terrainString: toHex?.terrain,
    baseElevation: toBaseElevation,
    losElevation: toElevation,
  });
  const initialWaterDepth = initialMinimumWaterDepth(fromWater, toWater);

  if (!hexEquals(from, to) && landToUnderwaterBlocked(fromWater, toWater)) {
    const blockedBy = toWater.state === 'underwater' ? to : from;

    return {
      hasLOS: false,
      blockedBy,
      blockingTerrain: TerrainType.Water,
      interveningHexes,
      interveningTerrainEffects: [],
      minimumWaterDepth: initialWaterDepth,
      damageableCoverProviders: [],
    };
  }

  if (interveningHexes.length === 0) {
    return {
      hasLOS: true,
      interveningHexes: [],
      interveningTerrainEffects: [],
      minimumWaterDepth: initialWaterDepth,
      damageableCoverProviders: [],
    };
  }

  const shooterHeight = fromElevation ?? fromBaseElevation + 1;
  const targetHeight = toElevation ?? toBaseElevation + 1;
  const sameBuildingContext = sharedEndpointBuildingContext({
    fromHexTerrain: fromHex?.terrain,
    fromBaseElevation,
    fromLosElevation: fromElevation,
    toHexTerrain: toHex?.terrain,
    toBaseElevation,
    toLosElevation: toElevation,
  });

  const sharedOptions = {
    grid,
    shooterHeight,
    targetHeight,
    sameBuildingContext,
    fromWater,
    toWater,
    initialMinimumWaterDepth: initialWaterDepth,
    tacOpsLosDiagram: options.tacOpsLosDiagram ?? true,
    occupants: options.occupants,
  };

  if (isDividedLosBearing(from, to)) {
    const leftLine = hexLineWithPerpendicularNudge(from, to, 1);
    const rightLine = hexLineWithPerpendicularNudge(from, to, -1);
    return defenderFavorableDividedResult(
      calculateLOSForInterveningHexes({
        ...sharedOptions,
        interveningHexes: interveningHexesForLine(leftLine, from, to),
      }),
      calculateLOSForInterveningHexes({
        ...sharedOptions,
        interveningHexes: interveningHexesForLine(rightLine, from, to),
      }),
    );
  }

  return calculateLOSForInterveningHexes({
    ...sharedOptions,
    interveningHexes,
  });
}

function formatTerrainLabel(terrain: TerrainType): string {
  return terrain.replace(/_/g, ' ');
}

function formatTerrainList(terrains: readonly TerrainType[]): string {
  const labels = terrains.map(formatTerrainLabel);
  if (labels.length <= 1) return labels[0] ?? 'terrain';
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`;
}

function formatElevationLabel(elevation: number): string {
  return elevation >= 0 ? `+${elevation}` : `${elevation}`;
}

function stackedBlockingTerrainLabel(result: ILOSResult): string | undefined {
  const blockedBy = result.blockedBy;
  if (!blockedBy || !result.blockingTerrain) return undefined;

  const stackedTerrains = result.interveningTerrainEffects
    .filter(
      (effect) =>
        hexEquals(effect.coord, blockedBy) &&
        (effect.terrain === TerrainType.LightWoods ||
          effect.terrain === TerrainType.HeavyWoods ||
          effect.terrain === TerrainType.Smoke),
    )
    .map((effect) => effect.terrain);

  const uniqueTerrains = Array.from(new Set(stackedTerrains));
  return uniqueTerrains.length > 1
    ? formatTerrainList(uniqueTerrains)
    : undefined;
}

export function formatLOSBlockedDetails(result: ILOSResult): string {
  const blockedBy = result.blockedBy;
  if (!blockedBy) return 'Line of sight blocked';

  const hexLabel = `(${blockedBy.q}, ${blockedBy.r})`;
  if (result.blockingTerrain) {
    return `Blocked by ${
      stackedBlockingTerrainLabel(result) ??
      formatTerrainLabel(result.blockingTerrain)
    } at ${hexLabel}`;
  }
  if (result.blockingElevation !== undefined) {
    return `Blocked by elevation ${formatElevationLabel(result.blockingElevation)} at ${hexLabel}`;
  }
  return `Line of sight blocked at ${hexLabel}`;
}
