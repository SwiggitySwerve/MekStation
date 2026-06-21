/**
 * Hex Map Rendering Helpers
 * Pure utility functions for hex coordinate math, terrain lookups, and SVG generation.
 *
 * Extracted from HexMapDisplay.tsx for modularity.
 */

import {
  HEX_SIZE,
  HEX_COLORS,
  hexToPixel as layoutHexToPixel,
} from '@/constants/hexMap';
import {
  TERRAIN_COLORS,
  WATER_DEPTH_COLORS,
  TERRAIN_PATTERNS,
} from '@/constants/terrain';
import {
  IHexCoordinate,
  Facing,
  IHexTerrain,
  TerrainType,
} from '@/types/gameplay';
import { TERRAIN_PROPERTIES, CoverLevel } from '@/types/gameplay/TerrainTypes';

// =============================================================================
// Coordinate Math
// =============================================================================

/**
 * Convert axial hex coordinates to pixel position.
 */
export function hexToPixel(hex: IHexCoordinate): { x: number; y: number } {
  return layoutHexToPixel(hex.q, hex.r);
}

/**
 * Generate hexes within a radius.
 */
export function generateHexesInRadius(radius: number): IHexCoordinate[] {
  const hexes: IHexCoordinate[] = [];
  for (let q = -radius; q <= radius; q++) {
    const r1 = Math.max(-radius, -q - radius);
    const r2 = Math.min(radius, -q + radius);
    for (let r = r1; r <= r2; r++) {
      hexes.push({ q, r });
    }
  }
  return hexes;
}

// =============================================================================
// SVG Generation
// =============================================================================

/**
 * Generate SVG path for a flat-top hexagon.
 */
export function hexPath(cx: number, cy: number): string {
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angleDeg = 60 * i;
    const angleRad = (Math.PI / 180) * angleDeg;
    const x = cx + HEX_SIZE * Math.cos(angleRad);
    const y = cy + HEX_SIZE * Math.sin(angleRad);
    points.push(`${x},${y}`);
  }
  return `M${points.join('L')}Z`;
}

/**
 * Get rotation angle for facing.
 */
export function getFacingRotation(facing: Facing): number {
  const facingAngles: Record<Facing, number> = {
    [Facing.North]: 0,
    [Facing.Northeast]: 60,
    [Facing.Southeast]: 120,
    [Facing.South]: 180,
    [Facing.Southwest]: 240,
    [Facing.Northwest]: 300,
  };
  return facingAngles[facing] ?? 0;
}

// =============================================================================
// Hex Comparison
// =============================================================================

/**
 * Check if two hex coordinates are equal.
 */
export function hexEquals(a: IHexCoordinate, b: IHexCoordinate): boolean {
  return a.q === b.q && a.r === b.r;
}

/**
 * Check if a hex is in a list.
 */
export function hexInList(
  hex: IHexCoordinate,
  list: readonly IHexCoordinate[],
): boolean {
  return list.some((h) => hexEquals(h, hex));
}

// =============================================================================
// Terrain Helpers
// =============================================================================

/**
 * `getPrimaryTerrainFeature` and `getTerrainMovementCost` were extracted into
 * the simulation-accessible utility `src/utils/gameplay/terrainMovementCost.ts`
 * per `add-ai-terrain-aware-movement` design D1 so the AI can consult terrain
 * cost without importing this rendering module. They are re-exported here so
 * existing rendering call sites are unchanged; `getPrimaryTerrainFeature` is
 * also imported below for use by the remaining rendering helpers in this file.
 */
export {
  getPrimaryTerrainFeature,
  getTerrainMovementCost,
} from '@/utils/gameplay/terrainMovementCost';

import { getPrimaryTerrainFeature } from '@/utils/gameplay/terrainMovementCost';

export function getTerrainCoverLevel(
  terrain: IHexTerrain | undefined,
): CoverLevel {
  const feature = getPrimaryTerrainFeature(terrain);
  if (!feature) return CoverLevel.None;
  const props = TERRAIN_PROPERTIES[feature.type];
  return props?.coverLevel ?? CoverLevel.None;
}

export function getTerrainFill(terrain: IHexTerrain | undefined): string {
  const feature = getPrimaryTerrainFeature(terrain);
  if (!feature) return HEX_COLORS.hexFill;

  if (feature.type === TerrainType.Water) {
    const depthIndex = Math.min(feature.level, 3);
    return WATER_DEPTH_COLORS[depthIndex] ?? WATER_DEPTH_COLORS[1];
  }

  const patternId = TERRAIN_PATTERNS[feature.type];
  if (patternId) {
    return `url(#${patternId})`;
  }

  return TERRAIN_COLORS[feature.type] ?? HEX_COLORS.hexFill;
}
