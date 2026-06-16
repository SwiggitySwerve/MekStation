import { describe, it, expect, beforeEach } from '@jest/globals';

import {
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

    it('should block adjacent land-to-underwater LOS at depth 2+', () => {
      const hexes = [
        createHex(0, 0, TerrainType.Clear, 0),
        createHex(1, 0, 'water:2', 0),
      ];
      const grid = createGrid(hexes);

      const result = calculateLOS({ q: 0, r: 0 }, { q: 1, r: 0 }, grid);

      expect(result).toMatchObject({
        hasLOS: false,
        blockedBy: { q: 1, r: 0 },
        blockingTerrain: TerrainType.Water,
        interveningHexes: [],
      });
    });

    it('should block adjacent underwater-to-land LOS at depth 2+', () => {
      const underwater: ITerrainFeature[] = [
        { type: TerrainType.Water, level: 2 },
      ];
      const hexes = [
        createHex(0, 0, JSON.stringify(underwater), 0),
        createHex(1, 0, TerrainType.Clear, 0),
      ];
      const grid = createGrid(hexes);

      const result = calculateLOS({ q: 0, r: 0 }, { q: 1, r: 0 }, grid);

      expect(result).toMatchObject({
        hasLOS: false,
        blockedBy: { q: 0, r: 0 },
        blockingTerrain: TerrainType.Water,
        interveningHexes: [],
      });
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

    it('should use explicit endpoint height to allow land-to-waterline depth-2 LOS', () => {
      const hexes = [
        createHex(0, 0, TerrainType.Clear, 0),
        createHex(1, 0, 'water:2', 0),
      ];
      const grid = createGrid(hexes);

      const result = calculateLOS({ q: 0, r: 0 }, { q: 1, r: 0 }, grid, 1, 0);

      expect(result.hasLOS).toBe(true);
      expect(result.blockingTerrain).toBeUndefined();
      expect(result.minimumWaterDepth).toBe(0);
    });

    it('should use explicit endpoint height to block land-to-submerged depth-2 LOS', () => {
      const hexes = [
        createHex(0, 0, TerrainType.Clear, 0),
        createHex(1, 0, 'water:2', 0),
      ];
      const grid = createGrid(hexes);

      const result = calculateLOS({ q: 0, r: 0 }, { q: 1, r: 0 }, grid, 1, -1);

      expect(result).toMatchObject({
        hasLOS: false,
        blockedBy: { q: 1, r: 0 },
        blockingTerrain: TerrainType.Water,
        minimumWaterDepth: 0,
      });
    });

    it('should block underwater-to-underwater LOS across represented clear hexes', () => {
      const underwater: ITerrainFeature[] = [
        { type: TerrainType.Water, level: 2 },
      ];
      const hexes = [
        createHex(0, 0, JSON.stringify(underwater), 0),
        createHex(1, 0, TerrainType.Clear, 0),
        createHex(2, 0, JSON.stringify(underwater), 0),
      ];
      const grid = createGrid(hexes);

      const result = calculateLOS({ q: 0, r: 0 }, { q: 2, r: 0 }, grid);

      expect(result).toMatchObject({
        hasLOS: false,
        blockedBy: { q: 1, r: 0 },
        blockingTerrain: TerrainType.Water,
      });
    });

    it('should allow underwater-to-underwater LOS across represented depth-1 water', () => {
      const underwater: ITerrainFeature[] = [
        { type: TerrainType.Water, level: 2 },
      ];
      const shallowWater: ITerrainFeature[] = [
        { type: TerrainType.Water, level: 1 },
      ];
      const hexes = [
        createHex(0, 0, JSON.stringify(underwater), 0),
        createHex(1, 0, JSON.stringify(shallowWater), 0),
        createHex(2, 0, JSON.stringify(underwater), 0),
      ];
      const grid = createGrid(hexes);

      const result = calculateLOS({ q: 0, r: 0 }, { q: 2, r: 0 }, grid);

      expect(result.hasLOS).toBe(true);
      expect(result.blockedBy).toBeUndefined();
      expect(result.blockingTerrain).toBeUndefined();
    });

    it('should allow underwater-to-underwater LOS across represented depth-2 water', () => {
      const underwater: ITerrainFeature[] = [
        { type: TerrainType.Water, level: 2 },
      ];
      const hexes = [
        createHex(0, 0, JSON.stringify(underwater), 0),
        createHex(1, 0, JSON.stringify(underwater), 0),
        createHex(2, 0, JSON.stringify(underwater), 0),
      ];
      const grid = createGrid(hexes);

      const result = calculateLOS({ q: 0, r: 0 }, { q: 2, r: 0 }, grid);

      expect(result.hasLOS).toBe(true);
      expect(result.blockedBy).toBeUndefined();
      expect(result.blockingTerrain).toBeUndefined();
    });

    it('should expose minimum water depth metadata across underwater LOS paths', () => {
      const deepWater: ITerrainFeature[] = [
        { type: TerrainType.Water, level: 3 },
      ];
      const shallowWater: ITerrainFeature[] = [
        { type: TerrainType.Water, level: 1 },
      ];
      const hexes = [
        createHex(0, 0, JSON.stringify(deepWater), 0),
        createHex(1, 0, JSON.stringify(shallowWater), 0),
        createHex(2, 0, JSON.stringify(deepWater), 0),
      ];
      const grid = createGrid(hexes);

      const result = calculateLOS({ q: 0, r: 0 }, { q: 2, r: 0 }, grid, -1, -1);

      expect(result.hasLOS).toBe(true);
      expect(result.minimumWaterDepth).toBe(1);
    });

    it('should block underwater-to-shallow-water LOS across represented clear hexes', () => {
      const underwater: ITerrainFeature[] = [
        { type: TerrainType.Water, level: 2 },
      ];
      const shallowWater: ITerrainFeature[] = [
        { type: TerrainType.Water, level: 1 },
      ];
      const hexes = [
        createHex(0, 0, JSON.stringify(underwater), 0),
        createHex(1, 0, TerrainType.Clear, 0),
        createHex(2, 0, JSON.stringify(shallowWater), 0),
      ];
      const grid = createGrid(hexes);

      const result = calculateLOS({ q: 0, r: 0 }, { q: 2, r: 0 }, grid);

      expect(result).toMatchObject({
        hasLOS: false,
        blockedBy: { q: 1, r: 0 },
        blockingTerrain: TerrainType.Water,
      });
    });

    it('should block underwater-to-underwater LOS through elevated represented clear hexes', () => {
      const underwater: ITerrainFeature[] = [
        { type: TerrainType.Water, level: 2 },
      ];
      const hexes = [
        createHex(0, 0, JSON.stringify(underwater), 0),
        createHex(1, 0, TerrainType.Clear, 2),
        createHex(2, 0, JSON.stringify(underwater), 0),
      ];
      const grid = createGrid(hexes);

      const result = calculateLOS({ q: 0, r: 0 }, { q: 2, r: 0 }, grid);

      expect(result).toMatchObject({
        hasLOS: false,
        blockedBy: { q: 1, r: 0 },
        blockingTerrain: TerrainType.Water,
      });
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

    it('should use the defender-favorable blocker on represented divided LOS side paths', () => {
      const elevatedBuilding: ITerrainFeature[] = [
        { type: TerrainType.Building, level: 3, constructionFactor: 40 },
      ];
      const hexes = [
        createHex(0, 0, TerrainType.Clear, 0),
        createHex(0, -1, JSON.stringify(elevatedBuilding), 0),
        createHex(1, -1, TerrainType.Clear, 0),
        createHex(1, -2, TerrainType.Clear, 0),
        createHex(1, -3, TerrainType.Clear, 0),
        createHex(2, -3, TerrainType.Clear, 0),
        createHex(2, -4, TerrainType.Clear, 0),
      ];
      const grid = createGrid(hexes);

      const result = calculateLOS({ q: 0, r: 0 }, { q: 2, r: -4 }, grid);

      expect(result).toMatchObject({
        hasLOS: false,
        blockedBy: { q: 0, r: -1 },
        blockingTerrain: TerrainType.Building,
      });
    });

    it('should carry the defender-favorable modifier from represented divided LOS side paths', () => {
      const hexes = [
        createHex(0, 0, TerrainType.Clear, 0),
        createHex(0, 1, TerrainType.LightWoods, 0),
        createHex(1, 0, TerrainType.Clear, 0),
        createHex(1, 1, TerrainType.Clear, 0),
        createHex(1, 2, TerrainType.Clear, 0),
        createHex(2, 1, TerrainType.Clear, 0),
        createHex(2, 2, TerrainType.Clear, 0),
      ];
      const grid = createGrid(hexes);

      const result = calculateLOS({ q: 0, r: 0 }, { q: 2, r: 2 }, grid);

      expect(result.hasLOS).toBe(true);
      expect(result.interveningTerrainEffects).toEqual([
        {
          coord: { q: 0, r: 1 },
          terrain: TerrainType.LightWoods,
          modifier: 1,
        },
      ]);
    });

    it('should carry represented heavy industrial modifiers from divided TacOps LOS side paths', () => {
      const heavyIndustrial: ITerrainFeature[] = [
        { type: TerrainType.HeavyIndustrial, level: 4 },
      ];
      const hexes = [
        createHex(0, 0, TerrainType.Clear, 3),
        createHex(0, 1, JSON.stringify(heavyIndustrial), 0),
        createHex(1, 0, TerrainType.Clear, 0),
        createHex(1, 1, TerrainType.Clear, 0),
        createHex(1, 2, TerrainType.Clear, 0),
        createHex(2, 1, TerrainType.Clear, 0),
        createHex(2, 2, TerrainType.Clear, 0),
      ];
      const grid = createGrid(hexes);

      const result = calculateLOS({ q: 0, r: 0 }, { q: 2, r: 2 }, grid, 4, 1, {
        tacOpsLosDiagram: true,
      });

      expect(result.hasLOS).toBe(true);
      expect(result.interveningTerrainEffects).toEqual([
        {
          coord: { q: 0, r: 1 },
          terrain: TerrainType.HeavyIndustrial,
          modifier: 1,
        },
      ]);
    });

    it('should use the defender-favorable elevation blocker on represented divided LOS side paths', () => {
      const hexes = [
        createHex(0, 0, TerrainType.Clear, 0),
        createHex(0, -1, TerrainType.Clear, 2),
        createHex(1, -1, TerrainType.Clear, 0),
        createHex(1, -2, TerrainType.Clear, 0),
        createHex(1, -3, TerrainType.Clear, 0),
        createHex(2, -3, TerrainType.Clear, 0),
        createHex(2, -4, TerrainType.Clear, 0),
      ];
      const grid = createGrid(hexes);

      const result = calculateLOS({ q: 0, r: 0 }, { q: 2, r: -4 }, grid);

      expect(result).toMatchObject({
        hasLOS: false,
        blockedBy: { q: 0, r: -1 },
        blockingElevation: 2,
      });
      expect(result.blockingTerrain).toBeUndefined();
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

    it('should block LOS through more than two represented same-building hexes', () => {
      const buildingId = 'warehouse-a';
      const sameBuilding: ITerrainFeature[] = [
        { type: TerrainType.Building, level: 1, buildingId },
      ];
      const hexes = [
        createHex(0, 0, JSON.stringify(sameBuilding), 0),
        createHex(1, 0, JSON.stringify(sameBuilding), 0),
        createHex(2, 0, JSON.stringify(sameBuilding), 0),
        createHex(3, 0, JSON.stringify(sameBuilding), 0),
        createHex(4, 0, JSON.stringify(sameBuilding), 0),
      ];
      const grid = createGrid(hexes);

      const result = calculateLOS({ q: 0, r: 0 }, { q: 4, r: 0 }, grid);

      expect(result).toMatchObject({
        hasLOS: false,
        blockedBy: { q: 3, r: 0 },
        blockingTerrain: TerrainType.Building,
      });
    });

    it('should allow LOS through exactly two represented same-building hexes', () => {
      const buildingId = 'warehouse-a';
      const sameBuilding: ITerrainFeature[] = [
        { type: TerrainType.Building, level: 1, buildingId },
      ];
      const hexes = [
        createHex(0, 0, JSON.stringify(sameBuilding), 0),
        createHex(1, 0, JSON.stringify(sameBuilding), 0),
        createHex(2, 0, JSON.stringify(sameBuilding), 0),
        createHex(3, 0, JSON.stringify(sameBuilding), 0),
      ];
      const grid = createGrid(hexes);

      const result = calculateLOS({ q: 0, r: 0 }, { q: 3, r: 0 }, grid);

      expect(result).toMatchObject({
        hasLOS: true,
      });
      expect(result.blockedBy).toBeUndefined();
      expect(result.blockingTerrain).toBeUndefined();
    });

    it('should not let tall same-building terrain self-block before the same-building limit', () => {
      const buildingId = 'warehouse-a';
      const sameBuilding: ITerrainFeature[] = [
        { type: TerrainType.Building, level: 3, buildingId },
      ];
      const terrain = JSON.stringify(sameBuilding);
      const hexes = [
        createHex(0, 0, terrain, 0),
        createHex(1, 0, terrain, 0),
        createHex(2, 0, terrain, 0),
        createHex(3, 0, terrain, 0),
      ];
      const grid = createGrid(hexes);

      const result = calculateLOS({ q: 0, r: 0 }, { q: 3, r: 0 }, grid);

      expect(result).toMatchObject({
        hasLOS: true,
      });
      expect(result.blockedBy).toBeUndefined();
      expect(result.blockingTerrain).toBeUndefined();
    });

    it('should count represented same-building endpoint elevation differences as building hexes', () => {
      const buildingId = 'warehouse-a';
      const sameBuilding: ITerrainFeature[] = [
        { type: TerrainType.Building, level: 1, buildingId },
      ];
      const hexes = [
        createHex(0, 0, JSON.stringify(sameBuilding), 0),
        createHex(1, 0, JSON.stringify(sameBuilding), 0),
        createHex(2, 0, JSON.stringify(sameBuilding), 0),
        createHex(3, 0, JSON.stringify(sameBuilding), 1),
      ];
      const grid = createGrid(hexes);

      const result = calculateLOS({ q: 0, r: 0 }, { q: 3, r: 0 }, grid);

      expect(result).toMatchObject({
        hasLOS: false,
        blockedBy: { q: 2, r: 0 },
        blockingTerrain: TerrainType.Building,
      });
    });

    it('should count explicit same-building endpoint LOS elevations as building levels', () => {
      const buildingId = 'warehouse-a';
      const sameBuilding: ITerrainFeature[] = [
        { type: TerrainType.Building, level: 3, buildingId },
      ];
      const terrain = JSON.stringify(sameBuilding);
      const hexes = [
        createHex(0, 0, terrain, 0),
        createHex(1, 0, terrain, 0),
        createHex(2, 0, terrain, 0),
      ];
      const grid = createGrid(hexes);

      const result = calculateLOS({ q: 0, r: 0 }, { q: 2, r: 0 }, grid, 1, 3);

      expect(result).toMatchObject({
        hasLOS: false,
        blockedBy: { q: 1, r: 0 },
        blockingTerrain: TerrainType.Building,
      });
    });

    it('should not count endpoint elevation differences outside the same represented building', () => {
      const fromBuilding: ITerrainFeature[] = [
        { type: TerrainType.Building, level: 1, buildingId: 'warehouse-a' },
      ];
      const toBuilding: ITerrainFeature[] = [
        { type: TerrainType.Building, level: 1, buildingId: 'warehouse-b' },
      ];
      const interveningBuilding: ITerrainFeature[] = [
        { type: TerrainType.Building, level: 1, buildingId: 'warehouse-a' },
      ];
      const hexes = [
        createHex(0, 0, JSON.stringify(fromBuilding), 0),
        createHex(1, 0, JSON.stringify(interveningBuilding), 0),
        createHex(2, 0, JSON.stringify(interveningBuilding), 0),
        createHex(3, 0, JSON.stringify(toBuilding), 1),
      ];
      const grid = createGrid(hexes);

      const result = calculateLOS({ q: 0, r: 0 }, { q: 3, r: 0 }, grid);

      expect(result.hasLOS).toBe(true);
      expect(result.blockedBy).toBeUndefined();
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

    it('should gate represented woods terrain effects through TacOps diagram LOS option state', () => {
      const hexes = [
        createHex(0, 0, TerrainType.Clear, 3),
        createHex(1, 0, TerrainType.Clear, 0),
        createHex(2, 0, TerrainType.HeavyWoods, 1),
        createHex(3, 0, TerrainType.Clear, 0),
        createHex(4, 0, TerrainType.Clear, 0),
      ];
      const grid = createGrid(hexes);
      const from: IHexCoordinate = { q: 0, r: 0 };
      const to: IHexCoordinate = { q: 4, r: 0 };

      const nonDiagram = calculateLOS(from, to, grid, 4, 1, {
        tacOpsLosDiagram: false,
      });
      const diagram = calculateLOS(from, to, grid, 4, 1, {
        tacOpsLosDiagram: true,
      });

      expect(nonDiagram).toMatchObject({
        hasLOS: true,
        interveningTerrainEffects: [],
      });
      expect(diagram).toMatchObject({
        hasLOS: true,
        interveningTerrainEffects: [
          {
            coord: { q: 2, r: 0 },
            terrain: TerrainType.HeavyWoods,
            modifier: 2,
          },
        ],
      });
    });

    it('should preserve diagram-style represented smoke terrain effects by default', () => {
      const hexes = [
        createHex(0, 0, TerrainType.Clear, 3),
        createHex(1, 0, TerrainType.Clear, 0),
        createHex(2, 0, TerrainType.Smoke, 1),
        createHex(3, 0, TerrainType.Clear, 0),
        createHex(4, 0, TerrainType.Clear, 0),
      ];
      const grid = createGrid(hexes);
      const from: IHexCoordinate = { q: 0, r: 0 };
      const to: IHexCoordinate = { q: 4, r: 0 };

      const result = calculateLOS(from, to, grid, 4, 1);

      expect(result).toMatchObject({
        hasLOS: true,
        interveningTerrainEffects: [
          {
            coord: { q: 2, r: 0 },
            terrain: TerrainType.Smoke,
            modifier: 1,
          },
        ],
      });
    });

    it('should block TacOps diagram LOS after more than two represented heavy industrial hexes', () => {
      const heavyIndustrial: ITerrainFeature[] = [
        { type: TerrainType.HeavyIndustrial, level: 4 },
      ];
      const terrain = JSON.stringify(heavyIndustrial);
      const hexes = [
        createHex(0, 0, TerrainType.Clear, 3),
        createHex(1, 0, terrain, 0),
        createHex(2, 0, terrain, 0),
        createHex(3, 0, terrain, 0),
        createHex(4, 0, TerrainType.Clear, 0),
        createHex(5, 0, TerrainType.Clear, 0),
      ];
      const grid = createGrid(hexes);
      const from: IHexCoordinate = { q: 0, r: 0 };
      const to: IHexCoordinate = { q: 5, r: 0 };

      const nonDiagram = calculateLOS(from, to, grid, 4, 1, {
        tacOpsLosDiagram: false,
      });
      const diagram = calculateLOS(from, to, grid, 4, 1, {
        tacOpsLosDiagram: true,
      });

      expect(nonDiagram).toMatchObject({
        hasLOS: true,
        interveningTerrainEffects: [],
      });
      expect(diagram).toMatchObject({
        hasLOS: false,
        blockedBy: { q: 3, r: 0 },
        blockingTerrain: TerrainType.HeavyIndustrial,
      });
      expect(diagram.interveningTerrainEffects).toEqual([
        {
          coord: { q: 1, r: 0 },
          terrain: TerrainType.HeavyIndustrial,
          modifier: 1,
        },
        {
          coord: { q: 2, r: 0 },
          terrain: TerrainType.HeavyIndustrial,
          modifier: 1,
        },
        {
          coord: { q: 3, r: 0 },
          terrain: TerrainType.HeavyIndustrial,
          modifier: 1,
        },
      ]);
    });

    it('should block TacOps diagram LOS after more than five represented planted fields', () => {
      const plantedField: ITerrainFeature[] = [
        { type: TerrainType.PlantedField, level: 4 },
      ];
      const terrain = JSON.stringify(plantedField);
      const hexes = [
        createHex(0, 0, TerrainType.Clear, 3),
        createHex(1, 0, terrain, 0),
        createHex(2, 0, terrain, 0),
        createHex(3, 0, terrain, 0),
        createHex(4, 0, terrain, 0),
        createHex(5, 0, terrain, 0),
        createHex(6, 0, terrain, 0),
        createHex(7, 0, TerrainType.Clear, 0),
        createHex(8, 0, TerrainType.Clear, 0),
      ];
      const grid = createGrid(hexes);
      const from: IHexCoordinate = { q: 0, r: 0 };
      const to: IHexCoordinate = { q: 8, r: 0 };

      const nonDiagram = calculateLOS(from, to, grid, 4, 1, {
        tacOpsLosDiagram: false,
      });
      const diagram = calculateLOS(from, to, grid, 4, 1, {
        tacOpsLosDiagram: true,
      });

      expect(nonDiagram).toMatchObject({
        hasLOS: true,
        interveningTerrainEffects: [],
      });
      expect(diagram).toMatchObject({
        hasLOS: false,
        blockedBy: { q: 6, r: 0 },
        blockingTerrain: TerrainType.PlantedField,
      });
      expect(
        diagram.interveningTerrainEffects.map((effect) => effect.modifier),
      ).toEqual([0, 1, 0, 1, 0, 1]);
    });

    it('should block LOS when pure intervening elevation exceeds the sightline', () => {
      const hexes = [
        createHex(0, 0, TerrainType.Clear, 0),
        createHex(1, 0, TerrainType.Clear, 2),
        createHex(2, 0, TerrainType.Clear, 0),
      ];
      const grid = createGrid(hexes);

      const result = calculateLOS({ q: 0, r: 0 }, { q: 2, r: 0 }, grid);

      expect(result).toMatchObject({
        hasLOS: false,
        blockedBy: { q: 1, r: 0 },
        blockingElevation: 2,
      });
      expect(result.blockingTerrain).toBeUndefined();
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

    it('should use explicit fuel-tank elevation for represented LOS blocking', () => {
      const fuelTankFeature: ITerrainFeature[] = [
        {
          type: TerrainType.Building,
          level: 0,
          fuelTankElevation: 3,
          fuelTankId: 'fuel-tank-a',
        },
      ];
      const genericBuildingFeature: ITerrainFeature[] = [
        { type: TerrainType.Building, level: 0 },
      ];
      const fuelTankGrid = createGrid([
        createHex(0, 0, TerrainType.Clear, 0),
        createHex(1, 0, JSON.stringify(fuelTankFeature), 0),
        createHex(2, 0, TerrainType.Clear, 0),
      ]);
      const genericGrid = createGrid([
        createHex(0, 0, TerrainType.Clear, 0),
        createHex(1, 0, JSON.stringify(genericBuildingFeature), 0),
        createHex(2, 0, TerrainType.Clear, 0),
      ]);

      const fuelTankResult = calculateLOS(
        { q: 0, r: 0 },
        { q: 2, r: 0 },
        fuelTankGrid,
        1,
        1,
      );
      const genericResult = calculateLOS(
        { q: 0, r: 0 },
        { q: 2, r: 0 },
        genericGrid,
        1,
        1,
      );

      expect(fuelTankResult).toMatchObject({
        hasLOS: false,
        blockedBy: { q: 1, r: 0 },
        blockingTerrain: TerrainType.Building,
      });
      expect(genericResult.hasLOS).toBe(true);
      expect(genericResult.blockingTerrain).toBeUndefined();
    });

    it('should expose hard building damageable cover providers for represented horizontal cover', () => {
      const hardBuildingFeature: ITerrainFeature[] = [
        {
          type: TerrainType.Building,
          level: 1,
          constructionFactor: 95,
          buildingId: 'hard-building-a',
        },
      ];
      const grid = createGrid([
        createHex(0, 0, TerrainType.Clear, 0),
        createHex(1, 0, JSON.stringify(hardBuildingFeature), 0),
        createHex(2, 0, TerrainType.Clear, 0),
      ]);

      const result = calculateLOS({ q: 0, r: 0 }, { q: 2, r: 0 }, grid, 1, 1);

      expect(result.hasLOS).toBe(true);
      expect(result.damageableCoverProviders).toEqual([
        expect.objectContaining({
          coord: { q: 1, r: 0 },
          kind: 'building',
          side: 'target',
          terrain: TerrainType.Building,
          height: 1,
          totalElevation: 1,
          constructionFactor: 95,
          buildingId: 'hard-building-a',
          buildingClass: 'hard',
        }),
      ]);
    });

    it('should expose soft fuel-tank damageable cover providers separately from building providers', () => {
      const fuelTankFeature: ITerrainFeature[] = [
        {
          type: TerrainType.Building,
          level: 0,
          fuelTankElevation: 1,
          fuelTankId: 'fuel-tank-a',
        },
      ];
      const softBuildingFeature: ITerrainFeature[] = [
        {
          type: TerrainType.Building,
          level: 1,
          constructionFactor: 40,
          buildingId: 'soft-building-a',
        },
      ];
      const fuelTankGrid = createGrid([
        createHex(0, 0, TerrainType.Clear, 0),
        createHex(1, 0, JSON.stringify(fuelTankFeature), 0),
        createHex(2, 0, TerrainType.Clear, 0),
      ]);
      const softBuildingGrid = createGrid([
        createHex(0, 0, TerrainType.Clear, 0),
        createHex(1, 0, JSON.stringify(softBuildingFeature), 0),
        createHex(2, 0, TerrainType.Clear, 0),
      ]);

      const fuelTankResult = calculateLOS(
        { q: 0, r: 0 },
        { q: 2, r: 0 },
        fuelTankGrid,
        1,
        1,
      );
      const softBuildingResult = calculateLOS(
        { q: 0, r: 0 },
        { q: 2, r: 0 },
        softBuildingGrid,
        1,
        1,
      );

      expect(fuelTankResult.hasLOS).toBe(true);
      expect(fuelTankResult.damageableCoverProviders).toEqual([
        expect.objectContaining({
          coord: { q: 1, r: 0 },
          kind: 'fuel-tank',
          side: 'target',
          fuelTankId: 'fuel-tank-a',
          buildingClass: 'soft',
        }),
      ]);
      expect(softBuildingResult.damageableCoverProviders).toEqual([
        expect.objectContaining({
          coord: { q: 1, r: 0 },
          kind: 'building',
          side: 'target',
          buildingId: 'soft-building-a',
          constructionFactor: 40,
          buildingClass: 'soft',
        }),
      ]);
    });

    it('should allow non-adjacent LOS over buildings no higher than the taller endpoint', () => {
      const buildingFeature: ITerrainFeature[] = [
        { type: TerrainType.Building, level: 3 },
      ];
      const hexes = [
        createHex(0, 0, TerrainType.Clear, 3),
        createHex(1, 0, JSON.stringify(buildingFeature), 0),
        createHex(2, 0, TerrainType.Clear, 0),
        createHex(3, 0, TerrainType.Clear, 0),
      ];
      const grid = createGrid(hexes);

      const result = calculateLOS({ q: 0, r: 0 }, { q: 3, r: 0 }, grid, 4, 1);

      expect(result.hasLOS).toBe(true);
      expect(result.blockedBy).toBeUndefined();
      expect(result.blockingTerrain).toBeUndefined();
    });

    it('should block adjacent endpoint LOS when a building is higher than that endpoint', () => {
      const buildingFeature: ITerrainFeature[] = [
        { type: TerrainType.Building, level: 2 },
      ];
      const hexes = [
        createHex(0, 0, TerrainType.Clear, 0),
        createHex(1, 0, JSON.stringify(buildingFeature), 0),
        createHex(2, 0, TerrainType.Clear, 3),
      ];
      const grid = createGrid(hexes);

      const result = calculateLOS({ q: 0, r: 0 }, { q: 2, r: 0 }, grid, 1, 4);

      expect(result).toMatchObject({
        hasLOS: false,
        blockedBy: { q: 1, r: 0 },
        blockingTerrain: TerrainType.Building,
      });
    });

    it('should treat represented grounded DropShip occupants as level-10 LOS cover providers', () => {
      const grid = createGrid([
        createHex(0, 0, TerrainType.Clear, 0),
        { ...createHex(1, 0, TerrainType.Clear, 0), occupantId: 'ds-1' },
        createHex(2, 0, TerrainType.Clear, 0),
      ]);

      const result = calculateLOS({ q: 0, r: 0 }, { q: 2, r: 0 }, grid, 1, 10, {
        occupants: {
          'ds-1': { id: 'ds-1', unitType: 'DropShip', grounded: true },
        },
      });

      expect(result.hasLOS).toBe(false);
      expect(result.blockedBy).toEqual({ q: 1, r: 0 });
      expect(result.blockingTerrain).toBeUndefined();
      expect(result.damageableCoverProviders).toEqual([
        expect.objectContaining({
          coord: { q: 1, r: 0 },
          kind: 'grounded-dropship',
          side: 'target',
          height: 10,
          totalElevation: 10,
          unitId: 'ds-1',
          unitType: 'DropShip',
        }),
      ]);
    });

    it('should ignore destroyed, airborne, and non-DropShip occupants for entity-aware LOS cover', () => {
      const cases = [
        ['destroyed DropShip', { unitType: 'DropShip', destroyed: true }],
        ['airborne DropShip', { unitType: 'DropShip', airborne: true }],
        ['non-DropShip', { unitType: 'BattleMech', grounded: true }],
      ] as const;

      for (const [label, occupant] of cases) {
        const grid = createGrid([
          createHex(0, 0, TerrainType.Clear, 0),
          { ...createHex(1, 0, TerrainType.Clear, 0), occupantId: label },
          createHex(2, 0, TerrainType.Clear, 0),
        ]);

        const result = calculateLOS(
          { q: 0, r: 0 },
          { q: 2, r: 0 },
          grid,
          1,
          10,
          { occupants: { [label]: occupant } },
        );

        expect(result.hasLOS).toBe(true);
        expect(result.blockedBy).toBeUndefined();
        expect(result.damageableCoverProviders).toEqual([]);
      }
    });

    it('should not treat occupied or destroyed-token hexes as LOS terrain blockers', () => {
      // Per align-wreck-los-with-megamek: MegaMek LosEffects derives LOS from
      // terrain/elevation only and never inspects wrecked entities, so the
      // engine takes no token input and a destroyed marker can never produce
      // a LOS blocker reference.
      const from: IHexCoordinate = { q: 0, r: 0 };
      const to: IHexCoordinate = { q: 3, r: 0 };
      const grid = createGrid([
        createHex(0, 0, TerrainType.Clear, 0),
        {
          ...createHex(1, 0, TerrainType.Clear, 0),
          occupantId: 'destroyed-unit',
        },
        {
          ...createHex(2, 0, TerrainType.Clear, 0),
          occupantId: 'second-destroyed-unit',
        },
        createHex(3, 0, TerrainType.Clear, 0),
      ]);

      const result = calculateLOS(from, to, grid);

      expect(result.hasLOS).toBe(true);
      expect(result.blockedBy).toBeUndefined();
      expect(result.blockingTerrain).toBeUndefined();
      expect(result).not.toHaveProperty('blockingUnit');
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
