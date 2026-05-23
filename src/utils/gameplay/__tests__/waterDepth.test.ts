import { TerrainType } from '@/types/gameplay';
import { terrainStringFromFeatures } from '@/utils/gameplay/terrainEncoding';

import { parseWaterDepth } from '../waterDepth';

describe('parseWaterDepth', () => {
  it('keeps legacy water tags working', () => {
    expect(parseWaterDepth('water')).toBe(1);
    expect(parseWaterDepth('water:2')).toBe(2);
    expect(parseWaterDepth('clear')).toBe(0);
  });

  it('reads water depth from encoded multi-feature terrain', () => {
    const tag = terrainStringFromFeatures([
      { type: TerrainType.Water, level: 2 },
      { type: TerrainType.Smoke, level: 1 },
    ]);

    expect(parseWaterDepth(tag)).toBe(2);
  });
});
