/**
 * Tests for heat utility functions
 */

import { getWaterCoolingBonus, getTerrainHeatEffect, calculateHeatDissipation } from '../heat';
import { TerrainType, ITerrainFeature } from '@/types/gameplay/TerrainTypes';

describe('getWaterCoolingBonus', () => {
  it('should return 0 for no water (depth 0)', () => {
    expect(getWaterCoolingBonus(0)).toBe(0);
  });

  it('should return 0 for negative depth', () => {
    expect(getWaterCoolingBonus(-1)).toBe(0);
  });

  it('should return 2 for water depth 1', () => {
    expect(getWaterCoolingBonus(1)).toBe(2);
  });

  it('should return 4 for water depth 2', () => {
    expect(getWaterCoolingBonus(2)).toBe(4);
  });

  it('should return 4 for water depth 3+', () => {
    expect(getWaterCoolingBonus(3)).toBe(4);
    expect(getWaterCoolingBonus(5)).toBe(4);
  });
});

describe('getTerrainHeatEffect', () => {
  it('should return 0 for empty terrain', () => {
    expect(getTerrainHeatEffect([])).toBe(0);
  });

  it('should return 0 for clear terrain', () => {
    const terrain: ITerrainFeature[] = [{ type: TerrainType.Clear, level: 0 }];
    expect(getTerrainHeatEffect(terrain)).toBe(0);
  });

  it('should return -2 for water depth 1', () => {
    const terrain: ITerrainFeature[] = [{ type: TerrainType.Water, level: 1 }];
    expect(getTerrainHeatEffect(terrain)).toBe(-2);
  });

  it('should return -4 for water depth 2', () => {
    const terrain: ITerrainFeature[] = [{ type: TerrainType.Water, level: 2 }];
    expect(getTerrainHeatEffect(terrain)).toBe(-4);
  });

  it('should return -4 for water depth 3+', () => {
    const terrain: ITerrainFeature[] = [{ type: TerrainType.Water, level: 3 }];
    expect(getTerrainHeatEffect(terrain)).toBe(-4);
  });

  it('should handle multiple terrain features', () => {
    const terrain: ITerrainFeature[] = [
      { type: TerrainType.Water, level: 1 },
      { type: TerrainType.Clear, level: 0 },
    ];
    expect(getTerrainHeatEffect(terrain)).toBe(-2);
  });

  it('should return 5 for fire terrain', () => {
    const terrain: ITerrainFeature[] = [{ type: TerrainType.Fire, level: 1 }];
    expect(getTerrainHeatEffect(terrain)).toBe(5);
  });
});

describe('calculateHeatDissipation', () => {
  it('should return base heat sinks for clear terrain', () => {
    const terrain: ITerrainFeature[] = [{ type: TerrainType.Clear, level: 0 }];
    expect(calculateHeatDissipation(10, terrain)).toBe(10);
  });

  it('should return base heat sinks for empty terrain', () => {
    expect(calculateHeatDissipation(10, [])).toBe(10);
  });

  it('should add 2 for water depth 1', () => {
    const terrain: ITerrainFeature[] = [{ type: TerrainType.Water, level: 1 }];
    expect(calculateHeatDissipation(10, terrain)).toBe(12);
  });

  it('should add 4 for water depth 2', () => {
    const terrain: ITerrainFeature[] = [{ type: TerrainType.Water, level: 2 }];
    expect(calculateHeatDissipation(10, terrain)).toBe(14);
  });

  it('should add 4 for water depth 3+', () => {
    const terrain: ITerrainFeature[] = [{ type: TerrainType.Water, level: 3 }];
    expect(calculateHeatDissipation(10, terrain)).toBe(14);
  });

  it('should ignore non-water terrain for dissipation bonus', () => {
    const terrain: ITerrainFeature[] = [
      { type: TerrainType.Fire, level: 1 },
      { type: TerrainType.Clear, level: 0 },
    ];
    expect(calculateHeatDissipation(10, terrain)).toBe(10);
  });

  it('should handle zero base heat sinks', () => {
    const terrain: ITerrainFeature[] = [{ type: TerrainType.Water, level: 1 }];
    expect(calculateHeatDissipation(0, terrain)).toBe(2);
  });
});
