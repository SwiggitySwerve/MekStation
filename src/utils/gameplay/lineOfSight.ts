/**
 * Line of Sight Calculation Module
 * Implements BattleTech LOS rules with terrain blocking.
 *
 * @spec openspec/specs/terrain-system/spec.md
 */

import {
  IHexCoordinate,
  IHex,
  IHexGrid,
} from '@/types/gameplay/HexGridInterfaces';
import {
  TerrainType,
  TERRAIN_PROPERTIES,
  ITerrainFeature,
} from '@/types/gameplay/TerrainTypes';
import { hexLine, coordToKey, hexEquals } from './hexMath';

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
  /** All intervening hexes (excluding endpoints) */
  readonly interveningHexes: readonly IHexCoordinate[];
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
export function parseTerrainFeatures(terrainString: string): readonly ITerrainFeature[] {
  if (!terrainString) {
    return [];
  }

  // Try to parse as JSON first (future-proofing for complex terrain)
  if (terrainString.startsWith('[')) {
    try {
      return JSON.parse(terrainString) as ITerrainFeature[];
    } catch {
      // Fall through to simple parsing
    }
  }

  // Handle simple terrain type string
  const terrainType = terrainString as TerrainType;
  if (Object.values(TerrainType).includes(terrainType)) {
    return [{ type: terrainType, level: 1 }];
  }

  // Unknown terrain, treat as clear
  return [];
}

/**
 * Get the effective height of a terrain feature for LOS blocking.
 * Buildings use construction factor, others use standard losBlockHeight.
 *
 * @param feature - The terrain feature
 * @param props - The terrain properties
 * @returns The height in levels
 */
function getTerrainHeight(feature: ITerrainFeature, props: typeof TERRAIN_PROPERTIES[TerrainType]): number {
  // Buildings: use level to indicate height (each level = 1 elevation)
  if (feature.type === TerrainType.Building && feature.level > 0) {
    return feature.level;
  }

  // Standard terrain uses losBlockHeight from properties
  return props.losBlockHeight;
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
  currentDistance: number
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
  toElevation?: number
): ILOSResult {
  // Get all hexes on the line (includes endpoints)
  const lineHexes = hexLine(from, to);

  // Get intervening hexes (exclude endpoints)
  const interveningHexes = lineHexes.filter(
    (hex) => !hexEquals(hex, from) && !hexEquals(hex, to)
  );

  // If adjacent, always have LOS
  if (interveningHexes.length === 0) {
    return {
      hasLOS: true,
      interveningHexes: [],
    };
  }

  // Get source and target hex data
  const fromHex = grid.hexes.get(coordToKey(from));
  const toHex = grid.hexes.get(coordToKey(to));

  // Calculate effective heights (hex elevation + unit height of 1)
  const fromBaseElevation = fromHex?.elevation ?? 0;
  const toBaseElevation = toHex?.elevation ?? 0;
  const shooterHeight = fromElevation ?? fromBaseElevation + 1;
  const targetHeight = toElevation ?? toBaseElevation + 1;

  const totalDistance = interveningHexes.length + 1; // +1 for target

  // Check each intervening hex for blocking terrain
  for (let i = 0; i < interveningHexes.length; i++) {
    const hex = interveningHexes[i];
    const hexData = grid.hexes.get(coordToKey(hex));

    if (!hexData) {
      continue; // No data = clear terrain
    }

    // Get terrain features and check if any block LOS
    const features = parseTerrainFeatures(hexData.terrain);

    for (const feature of features) {
      const props = TERRAIN_PROPERTIES[feature.type];

      if (!props || !props.blocksLOS) {
        continue;
      }

      // Calculate the blocking height (terrain height + hex elevation)
      const terrainHeight = getTerrainHeight(feature, props);
      const blockingHeight = hexData.elevation + terrainHeight;

      // Calculate the LOS height at this hex (interpolate between shooter and target)
      const currentDistance = i + 1;
      const losHeight = interpolateLOSHeight(
        shooterHeight,
        targetHeight,
        totalDistance,
        currentDistance
      );

      // LOS is blocked if the blocking terrain is taller than the line of sight
      if (blockingHeight >= losHeight) {
        return {
          hasLOS: false,
          blockedBy: hex,
          blockingTerrain: feature.type,
          interveningHexes,
        };
      }
    }
  }

  // No blocking terrain found
  return {
    hasLOS: true,
    interveningHexes,
  };
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
  grid: IHexGrid
): TerrainType | undefined {
  const hexData = grid.hexes.get(coordToKey(hex));

  if (!hexData) {
    return undefined;
  }

  const features = parseTerrainFeatures(hexData.terrain);

  for (const feature of features) {
    const props = TERRAIN_PROPERTIES[feature.type];
    if (props?.blocksLOS) {
      return feature.type;
    }
  }

  return undefined;
}
