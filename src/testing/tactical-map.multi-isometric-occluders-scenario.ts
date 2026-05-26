import type { IHexTerrain } from '@/types/gameplay';

import { TerrainType } from '@/types/gameplay';

import { tacticalMapHexTerrain } from './tactical-map.fixtures';

export const tacticalMapMultiIsometricOccludersHexTerrain: readonly IHexTerrain[] =
  [
    {
      coordinate: { q: 1, r: 0 },
      elevation: 4,
      features: [{ type: TerrainType.Building, level: 1 }],
    },
    {
      coordinate: { q: 0, r: 1 },
      elevation: 2,
      features: [{ type: TerrainType.Building, level: 1 }],
    },
    ...tacticalMapHexTerrain.filter(
      (terrain) =>
        !(
          (terrain.coordinate.q === 1 && terrain.coordinate.r === 0) ||
          (terrain.coordinate.q === 0 && terrain.coordinate.r === 1)
        ),
    ),
  ];
