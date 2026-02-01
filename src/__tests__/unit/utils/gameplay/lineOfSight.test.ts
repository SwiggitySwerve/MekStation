import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  calculateLOS,
  parseTerrainFeatures,
  getBlockingTerrain,
  ILOSResult,
} from '@/utils/gameplay/lineOfSight';
import { IHexGrid, IHex, IHexCoordinate } from '@/types/gameplay/HexGridInterfaces';
import { TerrainType, ITerrainFeature } from '@/types/gameplay/TerrainTypes';
import { coordToKey } from '@/utils/gameplay/hexMath';

function createHex(
  q: number,
  r: number,
  terrain: string = TerrainType.Clear,
  elevation: number = 0
): IHex {
  return {
    coord: { q, r },
    occupantId: null,
    terrain,
    elevation,
  };
}

function createGrid(hexes: IHex[]): IHexGrid {
  const hexMap = new Map<string, IHex>();
  for (const hex of hexes) {
    hexMap.set(coordToKey(hex.coord), hex);
  }
  return {
    config: { radius: 10 },
    hexes: hexMap,
  };
}

describe('lineOfSight', () => {
  describe('parseTerrainFeatures()', () => {
    it('should return empty array for empty string', () => {
      expect(parseTerrainFeatures('')).toEqual([]);
    });

    it('should parse simple terrain type string', () => {
      const features = parseTerrainFeatures(TerrainType.HeavyWoods);
      expect(features).toHaveLength(1);
      expect(features[0].type).toBe(TerrainType.HeavyWoods);
      expect(features[0].level).toBe(1);
    });

    it('should parse JSON-encoded feature array', () => {
      const featureArray: ITerrainFeature[] = [
        { type: TerrainType.Building, level: 3, constructionFactor: 40 },
      ];
      const features = parseTerrainFeatures(JSON.stringify(featureArray));
      expect(features).toHaveLength(1);
      expect(features[0].type).toBe(TerrainType.Building);
      expect(features[0].level).toBe(3);
    });

    it('should return empty array for unknown terrain', () => {
      expect(parseTerrainFeatures('unknown_terrain')).toEqual([]);
    });
  });

  describe('calculateLOS()', () => {
    let clearGrid: IHexGrid;

    beforeEach(() => {
      const hexes: IHex[] = [];
      for (let q = -5; q <= 5; q++) {
        for (let r = -5; r <= 5; r++) {
          hexes.push(createHex(q, r, TerrainType.Clear, 0));
        }
      }
      clearGrid = createGrid(hexes);
    });

    it('should return hasLOS=true for clear terrain', () => {
      const from: IHexCoordinate = { q: 0, r: 0 };
      const to: IHexCoordinate = { q: 3, r: 0 };
      const result = calculateLOS(from, to, clearGrid);

      expect(result.hasLOS).toBe(true);
      expect(result.blockedBy).toBeUndefined();
      expect(result.blockingTerrain).toBeUndefined();
    });

    it('should return hasLOS=true for adjacent hexes', () => {
      const from: IHexCoordinate = { q: 0, r: 0 };
      const to: IHexCoordinate = { q: 1, r: 0 };
      const result = calculateLOS(from, to, clearGrid);

      expect(result.hasLOS).toBe(true);
      expect(result.interveningHexes).toHaveLength(0);
    });

    it('should return intervening hexes for longer lines', () => {
      const from: IHexCoordinate = { q: 0, r: 0 };
      const to: IHexCoordinate = { q: 4, r: 0 };
      const result = calculateLOS(from, to, clearGrid);

      expect(result.hasLOS).toBe(true);
      expect(result.interveningHexes.length).toBeGreaterThan(0);
    });

    it('should return hasLOS=false when heavy woods blocks', () => {
      const hexes = [
        createHex(0, 0, TerrainType.Clear, 0),
        createHex(1, 0, TerrainType.HeavyWoods, 0),
        createHex(2, 0, TerrainType.Clear, 0),
        createHex(3, 0, TerrainType.Clear, 0),
      ];
      const grid = createGrid(hexes);

      const from: IHexCoordinate = { q: 0, r: 0 };
      const to: IHexCoordinate = { q: 3, r: 0 };
      const result = calculateLOS(from, to, grid);

      expect(result.hasLOS).toBe(false);
      expect(result.blockedBy).toEqual({ q: 1, r: 0 });
      expect(result.blockingTerrain).toBe(TerrainType.HeavyWoods);
    });

    it('should return hasLOS=false when building blocks', () => {
      const hexes = [
        createHex(0, 0, TerrainType.Clear, 0),
        createHex(1, 0, TerrainType.Building, 0),
        createHex(2, 0, TerrainType.Clear, 0),
      ];
      const grid = createGrid(hexes);

      const from: IHexCoordinate = { q: 0, r: 0 };
      const to: IHexCoordinate = { q: 2, r: 0 };
      const result = calculateLOS(from, to, grid);

      expect(result.hasLOS).toBe(false);
      expect(result.blockingTerrain).toBe(TerrainType.Building);
    });

    it('should allow LOS over woods from higher elevation', () => {
      const hexes = [
        createHex(0, 0, TerrainType.Clear, 3),
        createHex(1, 0, TerrainType.HeavyWoods, 0),
        createHex(2, 0, TerrainType.Clear, 0),
      ];
      const grid = createGrid(hexes);

      const from: IHexCoordinate = { q: 0, r: 0 };
      const to: IHexCoordinate = { q: 2, r: 0 };
      const result = calculateLOS(from, to, grid, 4, 1);

      expect(result.hasLOS).toBe(true);
    });

    it('should not block LOS with light woods', () => {
      const hexes = [
        createHex(0, 0, TerrainType.Clear, 0),
        createHex(1, 0, TerrainType.LightWoods, 0),
        createHex(2, 0, TerrainType.Clear, 0),
      ];
      const grid = createGrid(hexes);

      const from: IHexCoordinate = { q: 0, r: 0 };
      const to: IHexCoordinate = { q: 2, r: 0 };
      const result = calculateLOS(from, to, grid);

      expect(result.hasLOS).toBe(true);
    });

    it('should handle diagonal lines', () => {
      const from: IHexCoordinate = { q: 0, r: 0 };
      const to: IHexCoordinate = { q: 3, r: -3 };
      const result = calculateLOS(from, to, clearGrid);

      expect(result.hasLOS).toBe(true);
      expect(result.interveningHexes.length).toBeGreaterThan(0);
    });

    it('should handle same hex (no intervening)', () => {
      const from: IHexCoordinate = { q: 0, r: 0 };
      const to: IHexCoordinate = { q: 0, r: 0 };
      const result = calculateLOS(from, to, clearGrid);

      expect(result.hasLOS).toBe(true);
      expect(result.interveningHexes).toHaveLength(0);
    });

    it('should handle missing hex data as clear terrain', () => {
      const emptyGrid = createGrid([
        createHex(0, 0, TerrainType.Clear, 0),
        createHex(3, 0, TerrainType.Clear, 0),
      ]);

      const from: IHexCoordinate = { q: 0, r: 0 };
      const to: IHexCoordinate = { q: 3, r: 0 };
      const result = calculateLOS(from, to, emptyGrid);

      expect(result.hasLOS).toBe(true);
    });

    it('should block LOS with building of specific level', () => {
      const buildingFeature: ITerrainFeature[] = [
        { type: TerrainType.Building, level: 3 },
      ];
      const hexes = [
        createHex(0, 0, TerrainType.Clear, 0),
        createHex(1, 0, JSON.stringify(buildingFeature), 0),
        createHex(2, 0, TerrainType.Clear, 0),
      ];
      const grid = createGrid(hexes);

      const from: IHexCoordinate = { q: 0, r: 0 };
      const to: IHexCoordinate = { q: 2, r: 0 };
      const result = calculateLOS(from, to, grid, 1, 1);

      expect(result.hasLOS).toBe(false);
      expect(result.blockingTerrain).toBe(TerrainType.Building);
    });
  });

  describe('getBlockingTerrain()', () => {
    it('should return undefined for clear terrain', () => {
      const grid = createGrid([createHex(0, 0, TerrainType.Clear, 0)]);
      expect(getBlockingTerrain({ q: 0, r: 0 }, grid)).toBeUndefined();
    });

    it('should return terrain type for blocking terrain', () => {
      const grid = createGrid([createHex(0, 0, TerrainType.HeavyWoods, 0)]);
      expect(getBlockingTerrain({ q: 0, r: 0 }, grid)).toBe(TerrainType.HeavyWoods);
    });

    it('should return undefined for non-blocking terrain', () => {
      const grid = createGrid([createHex(0, 0, TerrainType.LightWoods, 0)]);
      expect(getBlockingTerrain({ q: 0, r: 0 }, grid)).toBeUndefined();
    });

    it('should return undefined for missing hex', () => {
      const grid = createGrid([]);
      expect(getBlockingTerrain({ q: 99, r: 99 }, grid)).toBeUndefined();
    });
  });
});
