/**
 * Line of Sight Calculation Module
 * Implements BattleTech LOS rules with terrain blocking.
 *
 * @spec openspec/specs/terrain-system/spec.md
 */

import type { IUnitToken } from '@/types/gameplay';

import { IHexCoordinate, IHexGrid } from '@/types/gameplay/HexGridInterfaces';
import {
  TerrainType,
  TERRAIN_PROPERTIES,
  ITerrainFeature,
} from '@/types/gameplay/TerrainTypes';

import { hexLine, coordToKey, hexEquals } from './hexMath';
import { terrainFeaturesFromString } from './terrainEncoding';
import { parseWaterDepth } from './waterDepth';

// =============================================================================
// Result Interface
// =============================================================================

/**
 * Result of LOS calculation.
 */
export interface ILOSResult {
  /** Whether LOS exists */
  readonly hasLOS: boolean;
  /** Hex that blocks LOS (if blocked) */
  readonly blockedBy?: IHexCoordinate;
  /** Terrain type that blocks (if blocked) */
  readonly blockingTerrain?: TerrainType;
  /** Destroyed unit token that blocks LOS as a wreck (if blocked) */
  readonly blockingUnit?: IUnitToken;
  /** Pure terrain elevation that blocks LOS without a blocking terrain feature */
  readonly blockingElevation?: number;
  /** All intervening hexes (excluding endpoints) */
  readonly interveningHexes: readonly IHexCoordinate[];
  /** Intervening terrain that affects LOS as a to-hit/visibility modifier */
  readonly interveningTerrainEffects: readonly ILOSInterveningTerrainEffect[];
}

export interface ILOSInterveningTerrainEffect {
  readonly coord: IHexCoordinate;
  readonly terrain: TerrainType;
  readonly modifier: number;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Parse terrain features from a hex's terrain string.
 * Handles both simple terrain type strings and JSON-encoded feature arrays.
 *
 * @param terrainString - The terrain string from IHex
 * @returns Array of terrain features
 */
export function parseTerrainFeatures(
  terrainString: string,
): readonly ITerrainFeature[] {
  return terrainFeaturesFromString(terrainString);
}

/**
 * Get the effective height of a terrain feature for LOS blocking.
 * Buildings use construction factor, others use standard losBlockHeight.
 *
 * @param feature - The terrain feature
 * @param props - The terrain properties
 * @returns The height in levels
 */
function getTerrainHeight(
  feature: ITerrainFeature,
  props: (typeof TERRAIN_PROPERTIES)[TerrainType],
): number {
  // Buildings: use level to indicate height (each level = 1 elevation)
  if (feature.type === TerrainType.Building && feature.level > 0) {
    return feature.level;
  }

  // MegaMek treats intervening smoke as an elevation-2 LOS effect.
  if (feature.type === TerrainType.Smoke) {
    return 2;
  }

  // Standard terrain uses losBlockHeight from properties
  return props.losBlockHeight;
}

function interveningLosDensity(feature: ITerrainFeature): number {
  switch (feature.type) {
    case TerrainType.LightWoods:
      return 1;
    case TerrainType.HeavyWoods:
      return 2;
    case TerrainType.Smoke:
      return feature.level >= 2 ? 2 : 1;
    default:
      return 0;
  }
}

function terrainFeatureAffectsLOS(
  feature: ITerrainFeature,
  hexElevation: number,
  losHeight: number,
): boolean {
  const props = TERRAIN_PROPERTIES[feature.type];
  if (!props) return false;

  return hexElevation + getTerrainHeight(feature, props) >= losHeight;
}

type EndpointWaterState = 'land' | 'in-water' | 'underwater';

function terrainWaterDepth(terrainString: string): number {
  const taggedDepth = parseWaterDepth(terrainString);
  if (taggedDepth > 0 || terrainString.startsWith(TerrainType.Water)) {
    return taggedDepth;
  }

  const waterFeature = parseTerrainFeatures(terrainString).find(
    (feature) => feature.type === TerrainType.Water,
  );
  return Math.max(0, Math.trunc(waterFeature?.level ?? 0));
}

function endpointWaterState(terrainString: string): EndpointWaterState {
  const waterDepth = terrainWaterDepth(terrainString);

  if (waterDepth <= 0) return 'land';
  if (waterDepth === 1) return 'in-water';
  return 'underwater';
}

function landToUnderwaterBlocked(
  fromHexTerrain: string | undefined,
  toHexTerrain: string | undefined,
): boolean {
  const fromState = endpointWaterState(fromHexTerrain ?? TerrainType.Clear);
  const toState = endpointWaterState(toHexTerrain ?? TerrainType.Clear);

  return (
    (fromState === 'land' && toState === 'underwater') ||
    (fromState === 'underwater' && toState === 'land')
  );
}

/**
 * Calculate the LOS height at a specific point along the line.
 * Uses linear interpolation between shooter and target heights.
 *
 * @param fromHeight - Shooter elevation
 * @param toHeight - Target elevation
 * @param totalDistance - Total distance in hexes
 * @param currentDistance - Distance to current hex
 * @returns The interpolated height at this point
 */
function interpolateLOSHeight(
  fromHeight: number,
  toHeight: number,
  totalDistance: number,
  currentDistance: number,
): number {
  if (totalDistance === 0) return fromHeight;
  const t = currentDistance / totalDistance;
  return fromHeight + (toHeight - fromHeight) * t;
}

// =============================================================================
// Main LOS Calculation
// =============================================================================

/**
 * Calculate line of sight between two hexes.
 *
 * Implements basic BattleTech LOS rules:
 * - Draws a line from source to target
 * - Checks intervening hexes for blocking terrain
 * - Considers elevation differences (can see over lower obstacles)
 *
 * @param from - Source hex coordinate
 * @param to - Target hex coordinate
 * @param grid - Hex grid with terrain data
 * @param fromElevation - Elevation of shooter (default: hex elevation + 1 for unit height)
 * @param toElevation - Elevation of target (default: hex elevation + 1 for unit height)
 * @returns LOS result with blocking information
 */
export function calculateLOS(
  from: IHexCoordinate,
  to: IHexCoordinate,
  grid: IHexGrid,
  fromElevation?: number,
  toElevation?: number,
  tokens: readonly IUnitToken[] = [],
): ILOSResult {
  // Get all hexes on the line (includes endpoints)
  const lineHexes = hexLine(from, to);

  // Get intervening hexes (exclude endpoints)
  const interveningHexes = lineHexes.filter(
    (hex) => !hexEquals(hex, from) && !hexEquals(hex, to),
  );

  // If adjacent, always have LOS
  if (interveningHexes.length === 0) {
    return {
      hasLOS: true,
      interveningHexes: [],
      interveningTerrainEffects: [],
    };
  }

  // Get source and target hex data
  const fromHex = grid.hexes.get(coordToKey(from));
  const toHex = grid.hexes.get(coordToKey(to));

  if (
    !hexEquals(from, to) &&
    landToUnderwaterBlocked(fromHex?.terrain, toHex?.terrain)
  ) {
    const blockedBy =
      endpointWaterState(toHex?.terrain ?? TerrainType.Clear) === 'underwater'
        ? to
        : from;

    return {
      hasLOS: false,
      blockedBy,
      blockingTerrain: TerrainType.Water,
      interveningHexes,
      interveningTerrainEffects: [],
    };
  }

  // Calculate effective heights (hex elevation + unit height of 1)
  const fromBaseElevation = fromHex?.elevation ?? 0;
  const toBaseElevation = toHex?.elevation ?? 0;
  const shooterHeight = fromElevation ?? fromBaseElevation + 1;
  const targetHeight = toElevation ?? toBaseElevation + 1;

  const totalDistance = interveningHexes.length + 1; // +1 for target
  const interveningTerrainEffects: ILOSInterveningTerrainEffect[] = [];
  let cumulativeLosDensity = 0;

  // Check each intervening hex for blocking terrain
  for (let i = 0; i < interveningHexes.length; i++) {
    const hex = interveningHexes[i];
    const blockingUnit = findBlockingWreck(hex, tokens);
    if (blockingUnit) {
      return {
        hasLOS: false,
        blockedBy: hex,
        blockingUnit,
        interveningHexes,
        interveningTerrainEffects,
      };
    }

    const hexData = grid.hexes.get(coordToKey(hex));

    if (!hexData) {
      continue; // No data = clear terrain
    }

    const currentDistance = i + 1;
    const losHeight = interpolateLOSHeight(
      shooterHeight,
      targetHeight,
      totalDistance,
      currentDistance,
    );

    // Get terrain features and check if any block LOS
    const features = parseTerrainFeatures(hexData.terrain);
    const cumulativeTerrainEffects: (ILOSInterveningTerrainEffect & {
      readonly losDensity: number;
    })[] = [];

    for (const feature of features) {
      const props = TERRAIN_PROPERTIES[feature.type];

      if (!props) {
        continue;
      }

      const losDensity = interveningLosDensity(feature);
      if (losDensity > 0) {
        if (terrainFeatureAffectsLOS(feature, hexData.elevation, losHeight)) {
          cumulativeTerrainEffects.push({
            coord: hex,
            terrain: feature.type,
            modifier: losDensity,
            losDensity,
          });
        }
        continue;
      }

      if (!props.blocksLOS) {
        continue;
      }

      // Calculate the blocking height (terrain height + hex elevation)
      const terrainHeight = getTerrainHeight(feature, props);
      const blockingHeight = hexData.elevation + terrainHeight;

      // MegaMek normal LOS blocks intervening buildings/hills only when they
      // are higher than the relevant unit/sight height. Equal-height terrain
      // can still create cover, but it should not become "No LOS" here.
      if (blockingHeight > losHeight) {
        return {
          hasLOS: false,
          blockedBy: hex,
          blockingTerrain: feature.type,
          interveningHexes,
          interveningTerrainEffects,
        };
      }
    }

    for (const terrainEffect of cumulativeTerrainEffects) {
      interveningTerrainEffects.push({
        coord: terrainEffect.coord,
        terrain: terrainEffect.terrain,
        modifier: terrainEffect.modifier,
      });
      cumulativeLosDensity += terrainEffect.losDensity;

      // MegaMek LOS stacks smoke and woods, including multiple effects in the
      // same intervening hex. Light effects count as 1, heavy effects as 2;
      // LOS is impossible only when the cumulative total exceeds 2.
      if (cumulativeLosDensity > 2) {
        return {
          hasLOS: false,
          blockedBy: hex,
          blockingTerrain: terrainEffect.terrain,
          interveningHexes,
          interveningTerrainEffects,
        };
      }
    }

    if (hexData.elevation > losHeight) {
      return {
        hasLOS: false,
        blockedBy: hex,
        blockingElevation: hexData.elevation,
        interveningHexes,
        interveningTerrainEffects,
      };
    }
  }

  // No blocking terrain found
  return {
    hasLOS: true,
    interveningHexes,
    interveningTerrainEffects,
  };
}

function findBlockingWreck(
  hex: IHexCoordinate,
  tokens: readonly IUnitToken[],
): IUnitToken | null {
  return (
    tokens.find(
      (token) => token.isDestroyed && hexEquals(token.position, hex),
    ) ?? null
  );
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
  if (result.blockingUnit) {
    return `Blocked by wreck ${result.blockingUnit.name} at ${hexLabel}`;
  }
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

/**
 * Check if a specific hex blocks LOS.
 * Utility function for checking individual hexes.
 *
 * @param hex - The hex to check
 * @param grid - Hex grid with terrain data
 * @returns The blocking terrain type if it blocks, undefined otherwise
 */
export function getBlockingTerrain(
  hex: IHexCoordinate,
  grid: IHexGrid,
): TerrainType | undefined {
  const hexData = grid.hexes.get(coordToKey(hex));

  if (!hexData) {
    return undefined;
  }

  const features = parseTerrainFeatures(hexData.terrain);

  for (const feature of features) {
    const props = TERRAIN_PROPERTIES[feature.type];
    if (interveningLosDensity(feature) > 0) {
      continue;
    }
    if (props?.blocksLOS) {
      return feature.type;
    }
  }

  return undefined;
}
