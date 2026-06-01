import type { IHexGrid, IUnitGameState } from '@/types/gameplay';

import { coordToKey } from '../hexMath';

/**
 * Return a grid copy whose occupant ids reflect the live session state.
 * Terrain/elevation stay untouched; stale occupant markers from the source
 * grid are cleared before active units are placed.
 */
export function gridWithUnitOccupants(
  grid: IHexGrid,
  units: Readonly<Record<string, IUnitGameState>> | readonly IUnitGameState[],
): IHexGrid {
  const hexes = new Map(grid.hexes);
  for (const [key, hex] of Array.from(hexes.entries())) {
    hexes.set(key, { ...hex, occupantId: null });
  }

  const unitList = Array.isArray(units) ? units : Object.values(units);
  for (const unit of unitList) {
    if (unit.destroyed) continue;
    const key = coordToKey(unit.position);
    const hex = hexes.get(key);
    if (!hex) continue;
    hexes.set(key, { ...hex, occupantId: unit.id });
  }

  return { ...grid, hexes };
}
