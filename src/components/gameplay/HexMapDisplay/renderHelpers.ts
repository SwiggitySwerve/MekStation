/**
 * Hex Map Rendering Helpers
 * Pure utility functions for hex coordinate math, terrain lookups, and SVG generation.
 *
 * Extracted from HexMapDisplay.tsx for modularity.
 */

import { HEX_SIZE, HEX_COLORS } from '@/constants/hexMap';
import {
  TERRAIN_COLORS,
  WATER_DEPTH_COLORS,
  TERRAIN_PATTERNS,
  TERRAIN_LAYER_ORDER,
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
  const x = HEX_SIZE * (3 / 2) * hex.q;
  const y = HEX_SIZE * ((Math.sqrt(3) / 2) * hex.q + Math.sqrt(3) * hex.r);
  return { x, y };
}

/**
 * Convert pixel position to axial hex coordinates.
 * @internal Reserved for future mouse interaction support
 */
export function _pixelToHex(x: number, y: number): IHexCoordinate {
  const q = ((2 / 3) * x) / HEX_SIZE;
  const r = ((-1 / 3) * x + (Math.sqrt(3) / 3) * y) / HEX_SIZE;
  return _roundHex(q, r);
}

/**
 * Round fractional hex coordinates to nearest hex.
 * @internal Used by _pixelToHex
 */
export function _roundHex(q: number, r: number): IHexCoordinate {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);

  const qDiff = Math.abs(rq - q);
  const rDiff = Math.abs(rr - r);
  const sDiff = Math.abs(rs - s);

  if (qDiff > rDiff && qDiff > sDiff) {
    rq = -rr - rs;
  } else if (rDiff > sDiff) {
    rr = -rq - rs;
  }

  return { q: rq, r: rr };
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
 * Get the primary terrain feature (highest layer order) for a hex.
 */
export function getPrimaryTerrainFeature(
  terrain: IHexTerrain | undefined,
): { type: TerrainType; level: number } | null {
  if (!terrain || terrain.features.length === 0) return null;

  const sortedFeatures = [...terrain.features].sort(
    (a, b) => TERRAIN_LAYER_ORDER[b.type] - TERRAIN_LAYER_ORDER[a.type],
  );
  return sortedFeatures[0];
}

export function getTerrainMovementCost(
  terrain: IHexTerrain | undefined,
): number {
  const feature = getPrimaryTerrainFeature(terrain);
  if (!feature) return 1;
  const props = TERRAIN_PROPERTIES[feature.type];
  return 1 + (props?.movementCostModifier.walk ?? 0);
}

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
