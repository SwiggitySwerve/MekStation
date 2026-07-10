import {
  TerrainType,
  type ITerrainFeature,
} from '@/types/gameplay/TerrainTypes';
import { terrainFeaturesFromString } from '@/utils/gameplay/terrainEncoding';

describe('terrainFeaturesFromString', () => {
  it('returns the same frozen array for repeated simple terrain encodings', () => {
    const first = terrainFeaturesFromString(TerrainType.Rough);
    const second = terrainFeaturesFromString(TerrainType.Rough);

    expect(first).toBe(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(first).toEqual([{ type: TerrainType.Rough, level: 1 }]);
  });

  it('parses a compound encoding once and reuses its frozen result', () => {
    const compoundTerrain = JSON.stringify([
      { type: TerrainType.Rough, level: 2 },
      { type: TerrainType.LightWoods, level: 1 },
    ]);
    const parseSpy = jest.spyOn(JSON, 'parse');

    const first = terrainFeaturesFromString(compoundTerrain);
    const second = terrainFeaturesFromString(compoundTerrain);

    expect(parseSpy).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
    expect(Object.isFrozen(first)).toBe(true);

    parseSpy.mockRestore();
  });

  it('returns frozen empty arrays for unknown and empty encodings', () => {
    const unknown = terrainFeaturesFromString('unknown-terrain');
    const empty = terrainFeaturesFromString('');

    expect(unknown).toEqual([]);
    expect(empty).toEqual([]);
    expect(Object.isFrozen(unknown)).toBe(true);
    expect(Object.isFrozen(empty)).toBe(true);
  });

  it('rejects attempts to mutate a cached feature array', () => {
    const features = terrainFeaturesFromString(TerrainType.HeavyWoods);

    expect(() => {
      (features as ITerrainFeature[]).push({
        type: TerrainType.Rough,
        level: 1,
      });
    }).toThrow(TypeError);
  });
});
