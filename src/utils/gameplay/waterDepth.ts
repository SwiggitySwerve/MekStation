/**
 * Water depth lookup for `wire-heat-generation-and-effects` task 5
 * (water cooling) + decisions.md "Water cooling integration point".
 *
 * `IHex.terrain` is a plain `string` at runtime — no structured
 * depth. Callers that want water cooling tag a hex as `'water'`,
 * `'water:1'`, or `'water:2'`. Everything else (e.g. `'clear'`,
 * `'woods'`) returns depth 0, and `getWaterCoolingBonus(0)` yields
 * a zero bonus — so existing grids keep their current behaviour.
 *
 * Bare `'water'` maps to depth 1 (knee-deep) per convention.
 */

import type { IHexCoordinate, IHexGrid } from '@/types/gameplay';

export function waterDepthAtPosition(
  grid: IHexGrid,
  position: IHexCoordinate,
): number {
  const key = `${position.q},${position.r}`;
  const hex = grid.hexes.get(key);
  if (!hex) return 0;
  return parseWaterDepth(hex.terrain);
}

export function parseWaterDepth(terrain: string): number {
  if (!terrain.startsWith('water')) return 0;
  const parts = terrain.split(':');
  if (parts.length === 1) return 1;
  const depth = Number.parseInt(parts[1], 10);
  return Number.isFinite(depth) && depth >= 0 ? depth : 0;
}
