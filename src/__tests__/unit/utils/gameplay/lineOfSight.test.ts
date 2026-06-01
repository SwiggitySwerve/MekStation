import { describe, it, expect, beforeEach } from '@jest/globals';

import type { IUnitToken } from '@/types/gameplay/GameplayUIInterfaces';

import { TokenUnitType } from '@/types/gameplay/GameplayUIInterfaces';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';
import {
  Facing,
  IHexGrid,
  IHex,
  IHexCoordinate,
} from '@/types/gameplay/HexGridInterfaces';
import { TerrainType, ITerrainFeature } from '@/types/gameplay/TerrainTypes';
import { coordToKey } from '@/utils/gameplay/hexMath';
import {
  calculateLOS,
  parseTerrainFeatures,
  getBlockingTerrain,
} from '@/utils/gameplay/lineOfSight';

function createHex(
  q: number,
  r: number,
  terrain: string = TerrainType.Clear,
  elevation: number = 0,
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

function createToken(
  unitId: string,
  position: IHexCoordinate,
  isDestroyed: boolean,
): IUnitToken {
  return {
    unitId,
    name: unitId,
    side: GameSide.Opponent,
    position,
    facing: Facing.North,
    isSelected: false,
    isValidTarget: false,
    isDestroyed,
    designation: unitId.toUpperCase(),
    unitType: TokenUnitType.Mech,
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

    it('should keep adjacent land-to-underwater LOS clear at depth 2+', () => {
      const hexes = [
        createHex(0, 0, TerrainType.Clear, 0),
        createHex(1, 0, 'water:2', 0),
      ];
      const grid = createGrid(hexes);

      const result = calculateLOS({ q: 0, r: 0 }, { q: 1, r: 0 }, grid);

      expect(result.hasLOS).toBe(true);
      expect(result.blockedBy).toBeUndefined();
      expect(result.blockingTerrain).toBeUndefined();
      expect(result.interveningHexes).toHaveLength(0);
    });

    it('should keep adjacent underwater-to-land LOS clear at depth 2+', () => {
      const underwater: ITerrainFeature[] = [
        { type: TerrainType.Water, level: 2 },
      ];
      const hexes = [
        createHex(0, 0, JSON.stringify(underwater), 0),
        createHex(1, 0, TerrainType.Clear, 0),
      ];
      const grid = createGrid(hexes);

      const result = calculateLOS({ q: 0, r: 0 }, { q: 1, r: 0 }, grid);

      expect(result.hasLOS).toBe(true);
      expect(result.blockedBy).toBeUndefined();
      expect(result.blockingTerrain).toBeUndefined();
    });

    it('should allow shallow-water-to-underwater endpoint LOS through this narrow water gate', () => {
      const underwater: ITerrainFeature[] = [
        { type: TerrainType.Water, level: 2 },
      ];
      const hexes = [
        createHex(0, 0, TerrainType.Water, 0),
        createHex(1, 0, JSON.stringify(underwater), 0),
      ];
      const grid = createGrid(hexes);

      const result = calculateLOS({ q: 0, r: 0 }, { q: 1, r: 0 }, grid);

      expect(result.hasLOS).toBe(true);
      expect(result.blockingTerrain).toBeUndefined();
    });

    it('should return intervening hexes for longer lines', () => {
      const from: IHexCoordinate = { q: 0, r: 0 };
      const to: IHexCoordinate = { q: 4, r: 0 };
      const result = calculateLOS(from, to, clearGrid);

      expect(result.hasLOS).toBe(true);
      expect(result.interveningHexes.length).toBeGreaterThan(0);
    });

    it('should not block LOS through one heavy woods hex', () => {
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

      expect(result.hasLOS).toBe(true);
      expect(result.blockedBy).toBeUndefined();
      expect(result.blockingTerrain).toBeUndefined();
    });

    it('should return hasLOS=false when cumulative woods density blocks', () => {
      const hexes = [
        createHex(0, 0, TerrainType.Clear, 0),
        createHex(1, 0, TerrainType.HeavyWoods, 0),
        createHex(2, 0, TerrainType.LightWoods, 0),
        createHex(3, 0, TerrainType.Clear, 0),
      ];
      const grid = createGrid(hexes);

      const from: IHexCoordinate = { q: 0, r: 0 };
      const to: IHexCoordinate = { q: 3, r: 0 };
      const result = calculateLOS(from, to, grid);

      expect(result.hasLOS).toBe(false);
      expect(result.blockedBy).toEqual({ q: 2, r: 0 });
      expect(result.blockingTerrain).toBe(TerrainType.LightWoods);
    });

    it('should return hasLOS=false when cumulative smoke density blocks', () => {
      const lightSmoke: ITerrainFeature[] = [
        { type: TerrainType.Smoke, level: 1 },
      ];
      const heavySmoke: ITerrainFeature[] = [
        { type: TerrainType.Smoke, level: 2 },
      ];
      const hexes = [
        createHex(0, 0, TerrainType.Clear, 0),
        createHex(1, 0, JSON.stringify(lightSmoke), 0),
        createHex(2, 0, JSON.stringify(heavySmoke), 0),
        createHex(3, 0, TerrainType.Clear, 0),
      ];
      const grid = createGrid(hexes);

      const from: IHexCoordinate = { q: 0, r: 0 };
      const to: IHexCoordinate = { q: 3, r: 0 };
      const result = calculateLOS(from, to, grid);

      expect(result.hasLOS).toBe(false);
      expect(result.blockedBy).toEqual({ q: 2, r: 0 });
      expect(result.blockingTerrain).toBe(TerrainType.Smoke);
    });

    it('should return hasLOS=false when mixed woods and smoke density blocks', () => {
      const smoke: ITerrainFeature[] = [{ type: TerrainType.Smoke, level: 1 }];
      const hexes = [
        createHex(0, 0, TerrainType.Clear, 0),
        createHex(1, 0, TerrainType.LightWoods, 0),
        createHex(2, 0, JSON.stringify(smoke), 0),
        createHex(3, 0, TerrainType.LightWoods, 0),
        createHex(4, 0, TerrainType.Clear, 0),
      ];
      const grid = createGrid(hexes);

      const from: IHexCoordinate = { q: 0, r: 0 };
      const to: IHexCoordinate = { q: 4, r: 0 };
      const result = calculateLOS(from, to, grid);

      expect(result.hasLOS).toBe(false);
      expect(result.blockedBy).toEqual({ q: 3, r: 0 });
      expect(result.blockingTerrain).toBe(TerrainType.LightWoods);
    });

    it('should return hasLOS=false when two heavy woods hexes block', () => {
      const hexes = [
        createHex(0, 0, TerrainType.Clear, 0),
        createHex(1, 0, TerrainType.HeavyWoods, 0),
        createHex(2, 0, TerrainType.HeavyWoods, 0),
        createHex(3, 0, TerrainType.Clear, 0),
      ];
      const grid = createGrid(hexes);

      const from: IHexCoordinate = { q: 0, r: 0 };
      const to: IHexCoordinate = { q: 3, r: 0 };
      const result = calculateLOS(from, to, grid);

      expect(result.hasLOS).toBe(false);
      expect(result.blockedBy).toEqual({ q: 2, r: 0 });
      expect(result.blockingTerrain).toBe(TerrainType.HeavyWoods);
    });

    it('should keep LOS clear through a level-1 building equal to mech height', () => {
      const hexes = [
        createHex(0, 0, TerrainType.Clear, 0),
        createHex(1, 0, TerrainType.Building, 0),
        createHex(2, 0, TerrainType.Clear, 0),
      ];
      const grid = createGrid(hexes);

      const from: IHexCoordinate = { q: 0, r: 0 };
      const to: IHexCoordinate = { q: 2, r: 0 };
      const result = calculateLOS(from, to, grid);

      expect(result.hasLOS).toBe(true);
      expect(result.blockingTerrain).toBeUndefined();
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

    it('should block LOS when a destroyed unit occupies an intervening hex', () => {
      const from: IHexCoordinate = { q: 0, r: 0 };
      const to: IHexCoordinate = { q: 3, r: 0 };
      const wreck = createToken('wreck-a', { q: 1, r: 0 }, true);

      const result = calculateLOS(from, to, clearGrid, undefined, undefined, [
        wreck,
      ]);

      expect(result.hasLOS).toBe(false);
      expect(result.blockedBy).toEqual({ q: 1, r: 0 });
      expect(result.blockingUnit).toBe(wreck);
      expect(result.blockingTerrain).toBeUndefined();
    });

    it('should report the first intervening wreck when multiple wrecks block LOS', () => {
      const from: IHexCoordinate = { q: 0, r: 0 };
      const to: IHexCoordinate = { q: 4, r: 0 };
      const firstWreck = createToken('wreck-a', { q: 1, r: 0 }, true);
      const secondWreck = createToken('wreck-b', { q: 2, r: 0 }, true);

      const result = calculateLOS(from, to, clearGrid, undefined, undefined, [
        secondWreck,
        firstWreck,
      ]);

      expect(result.hasLOS).toBe(false);
      expect(result.blockedBy).toEqual({ q: 1, r: 0 });
      expect(result.blockingUnit).toBe(firstWreck);
    });

    it('should not block LOS when a destroyed unit is on an endpoint', () => {
      const from: IHexCoordinate = { q: 0, r: 0 };
      const to: IHexCoordinate = { q: 3, r: 0 };
      const endpointWreck = createToken('wreck-target', to, true);

      const result = calculateLOS(from, to, clearGrid, undefined, undefined, [
        endpointWreck,
      ]);

      expect(result.hasLOS).toBe(true);
      expect(result.blockingUnit).toBeUndefined();
    });

    it('should preserve terrain-only behavior when no tokens are passed', () => {
      const from: IHexCoordinate = { q: 0, r: 0 };
      const to: IHexCoordinate = { q: 3, r: 0 };
      const result = calculateLOS(from, to, clearGrid);

      expect(result.hasLOS).toBe(true);
      expect(result.blockingUnit).toBeUndefined();
    });
  });

  describe('getBlockingTerrain()', () => {
    it('should return undefined for clear terrain', () => {
      const grid = createGrid([createHex(0, 0, TerrainType.Clear, 0)]);
      expect(getBlockingTerrain({ q: 0, r: 0 }, grid)).toBeUndefined();
    });

    it('should return terrain type for direct blocking terrain', () => {
      const grid = createGrid([createHex(0, 0, TerrainType.Building, 0)]);
      expect(getBlockingTerrain({ q: 0, r: 0 }, grid)).toBe(
        TerrainType.Building,
      );
    });

    it('should return undefined for cumulative-density terrain without line context', () => {
      const grid = createGrid([
        createHex(0, 0, TerrainType.LightWoods, 0),
        createHex(1, 0, TerrainType.HeavyWoods, 0),
      ]);
      expect(getBlockingTerrain({ q: 0, r: 0 }, grid)).toBeUndefined();
      expect(getBlockingTerrain({ q: 1, r: 0 }, grid)).toBeUndefined();
    });

    it('should return undefined for missing hex', () => {
      const grid = createGrid([]);
      expect(getBlockingTerrain({ q: 99, r: 99 }, grid)).toBeUndefined();
    });
  });
});
