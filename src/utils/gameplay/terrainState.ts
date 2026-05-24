import type { IGameTerrainOverride, IHexGrid } from '@/types/gameplay';

import { coordToKey } from '@/utils/gameplay/hexMath';

export function applyTerrainOverridesToGrid(
  grid: IHexGrid,
  terrainOverrides: Readonly<Record<string, IGameTerrainOverride>> = {},
): IHexGrid {
  for (const override of Object.values(terrainOverrides)) {
    const key = coordToKey(override.hex);
    const hex = grid.hexes.get(key);
    if (!hex) continue;
    grid.hexes.set(key, {
      ...hex,
      terrain: override.terrain,
      elevation: override.elevation,
    });
  }
  return grid;
}
