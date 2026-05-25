import type { IHexTerrain } from '@/types/gameplay';

import { TerrainType } from '@/types/gameplay';

import { tacticalMapHexTerrain } from './tactical-map.fixtures';

export const tacticalMapCappedIsometricStackHexTerrain: readonly IHexTerrain[] =
  [
    {
      coordinate: { q: 1, r: 0 },
      elevation: 4,
      features: [{ type: TerrainType.Building, level: 8 }],
    },
    ...tacticalMapHexTerrain.filter(
      (terrain) => terrain.coordinate.q !== 1 || terrain.coordinate.r !== 0,
    ),
  ];
