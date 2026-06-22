import type { IHexTerrain } from '@/types/gameplay';

import { TerrainType } from '@/types/gameplay';

export const tacticalMapLargeTopdownLegibilityRadius = 17;

export const tacticalMapLargeTopdownLegibilitySelectedHex = {
  q: 0,
  r: 0,
} as const;

export const tacticalMapLargeTopdownLegibilityHexTerrain: readonly IHexTerrain[] =
  [
    {
      coordinate: { q: 0, r: 0 },
      elevation: 0,
      features: [{ type: TerrainType.Clear, level: 0 }],
    },
    {
      coordinate: { q: 1, r: 0 },
      elevation: 4,
      features: [{ type: TerrainType.Building, level: 2 }],
    },
    {
      coordinate: { q: 0, r: 1 },
      elevation: -1,
      features: [{ type: TerrainType.Water, level: 1 }],
    },
    {
      coordinate: { q: -1, r: 1 },
      elevation: -2,
      features: [{ type: TerrainType.Water, level: 2 }],
    },
    {
      coordinate: { q: 2, r: -1 },
      elevation: 3,
      features: [{ type: TerrainType.HeavyWoods, level: 2 }],
    },
    {
      coordinate: { q: -2, r: 2 },
      elevation: 2,
      features: [{ type: TerrainType.Rough, level: 1 }],
    },
    {
      coordinate: { q: 5, r: -3 },
      elevation: 1,
      features: [{ type: TerrainType.LightWoods, level: 1 }],
    },
    {
      coordinate: { q: -5, r: 3 },
      elevation: -1,
      features: [{ type: TerrainType.Swamp, level: 1 }],
    },
  ];
