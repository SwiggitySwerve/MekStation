import {
  generateTerrain,
  TerrainGeneratorConfig,
  BiomeType,
  BIOME_WEIGHTS,
} from '@/utils/gameplay/terrainGenerator';
import { TerrainType, IHexTerrain } from '@/types/gameplay/TerrainTypes';

describe('terrainGenerator', () => {
  describe('generateTerrain', () => {
    describe('grid dimensions', () => {
      it('should generate a grid with correct dimensions', () => {
        const config: TerrainGeneratorConfig = {
          width: 10,
          height: 8,
          biome: 'temperate',
        };

        const grid = generateTerrain(config);

        expect(grid).toHaveLength(10 * 8);
      });

      it('should handle 1x1 grid', () => {
        const config: TerrainGeneratorConfig = {
          width: 1,
          height: 1,
          biome: 'temperate',
        };

        const grid = generateTerrain(config);

        expect(grid).toHaveLength(1);
        expect(grid[0].coordinate).toEqual({ q: 0, r: 0 });
      });

      it('should generate correct coordinates for all hexes', () => {
        const config: TerrainGeneratorConfig = {
          width: 5,
          height: 4,
          biome: 'temperate',
        };

        const grid = generateTerrain(config);

        for (const hex of grid) {
          expect(hex.coordinate.q).toBeGreaterThanOrEqual(0);
          expect(hex.coordinate.q).toBeLessThan(5);
          expect(hex.coordinate.r).toBeGreaterThanOrEqual(0);
          expect(hex.coordinate.r).toBeLessThan(4);
        }

        const coordSet = new Set(grid.map((h: IHexTerrain) => `${h.coordinate.q},${h.coordinate.r}`));
        expect(coordSet.size).toBe(grid.length);
      });
    });

    describe('valid terrain types', () => {
      it('should generate all hexes with valid TerrainType', () => {
        const config: TerrainGeneratorConfig = {
          width: 15,
          height: 15,
          biome: 'temperate',
        };

        const grid = generateTerrain(config);
        const validTypes = Object.values(TerrainType);

        for (const hex of grid) {
          expect(hex.features.length).toBeGreaterThan(0);
          for (const feature of hex.features) {
            expect(validTypes).toContain(feature.type);
          }
        }
      });

      it('should generate elevation within expected range (0-3)', () => {
        const config: TerrainGeneratorConfig = {
          width: 20,
          height: 20,
          biome: 'temperate',
        };

        const grid = generateTerrain(config);

        for (const hex of grid) {
          expect(hex.elevation).toBeGreaterThanOrEqual(0);
          expect(hex.elevation).toBeLessThanOrEqual(3);
        }
      });
    });

    describe('seed reproducibility', () => {
      it('should produce identical output with same seed', () => {
        const config: TerrainGeneratorConfig = {
          width: 10,
          height: 10,
          biome: 'temperate',
          seed: 12345,
        };

        const grid1 = generateTerrain(config);
        const grid2 = generateTerrain(config);

        expect(grid1).toEqual(grid2);
      });

      it('should produce different output with different seeds', () => {
        const config1: TerrainGeneratorConfig = {
          width: 10,
          height: 10,
          biome: 'temperate',
          seed: 12345,
        };

        const config2: TerrainGeneratorConfig = {
          width: 10,
          height: 10,
          biome: 'temperate',
          seed: 54321,
        };

        const grid1 = generateTerrain(config1);
        const grid2 = generateTerrain(config2);

        const differences = grid1.filter(
          (h1: IHexTerrain, i: number) =>
            h1.features[0].type !== grid2[i].features[0].type || h1.elevation !== grid2[i].elevation
        );
        expect(differences.length).toBeGreaterThan(0);
      });

      it('should produce different output without seed (random)', () => {
        const config: TerrainGeneratorConfig = {
          width: 10,
          height: 10,
          biome: 'temperate',
        };

        const grid1 = generateTerrain(config);
        const grid2 = generateTerrain(config);

        const allSame = grid1.every(
          (h1: IHexTerrain, i: number) =>
            h1.features[0].type === grid2[i].features[0].type && h1.elevation === grid2[i].elevation
        );
        expect(allSame).toBe(false);
      });
    });

    describe('biome distribution', () => {
      const countTerrainTypes = (grid: IHexTerrain[]): Map<TerrainType, number> => {
        const counts = new Map<TerrainType, number>();
        for (const hex of grid) {
          const type = hex.features[0].type;
          counts.set(type, (counts.get(type) || 0) + 1);
        }
        return counts;
      };

      const checkDistribution = (
        grid: IHexTerrain[],
        weights: Record<string, number>,
        tolerance: number = 0.15
      ) => {
        const counts = countTerrainTypes(grid);
        const total = grid.length;

        for (const [terrainStr, expectedWeight] of Object.entries(weights)) {
          const terrain = terrainStr as TerrainType;
          const actualCount = counts.get(terrain) || 0;
          const actualWeight = actualCount / total;

          expect(actualWeight).toBeGreaterThanOrEqual(expectedWeight - tolerance);
          expect(actualWeight).toBeLessThanOrEqual(expectedWeight + tolerance);
        }
      };

      it('should roughly match temperate biome weights', () => {
        const config: TerrainGeneratorConfig = {
          width: 30,
          height: 30,
          biome: 'temperate',
          seed: 42,
        };

        const grid = generateTerrain(config);

        checkDistribution(
          grid,
          {
            [TerrainType.Clear]: 0.6,
          },
          0.15
        );

        const counts = countTerrainTypes(grid);
        const woodsCount =
          (counts.get(TerrainType.LightWoods) || 0) + (counts.get(TerrainType.HeavyWoods) || 0);
        const woodsPercent = woodsCount / grid.length;
        expect(woodsPercent).toBeGreaterThanOrEqual(0.1);
        expect(woodsPercent).toBeLessThanOrEqual(0.35);
      });

      it('should roughly match desert biome weights', () => {
        const config: TerrainGeneratorConfig = {
          width: 30,
          height: 30,
          biome: 'desert',
          seed: 42,
        };

        const grid = generateTerrain(config);

        const counts = countTerrainTypes(grid);
        const sandPercent = (counts.get(TerrainType.Sand) || 0) / grid.length;
        expect(sandPercent).toBeGreaterThanOrEqual(0.35);
        expect(sandPercent).toBeLessThanOrEqual(0.65);
      });

      it('should roughly match arctic biome weights', () => {
        const config: TerrainGeneratorConfig = {
          width: 30,
          height: 30,
          biome: 'arctic',
          seed: 42,
        };

        const grid = generateTerrain(config);

        const counts = countTerrainTypes(grid);
        const snowPercent = (counts.get(TerrainType.Snow) || 0) / grid.length;
        const icePercent = (counts.get(TerrainType.Ice) || 0) / grid.length;
        expect(snowPercent + icePercent).toBeGreaterThanOrEqual(0.4);
        expect(snowPercent + icePercent).toBeLessThanOrEqual(0.9);
      });

      it('should roughly match urban biome weights', () => {
        const config: TerrainGeneratorConfig = {
          width: 30,
          height: 30,
          biome: 'urban',
          seed: 42,
        };

        const grid = generateTerrain(config);

        const counts = countTerrainTypes(grid);
        const pavementPercent = (counts.get(TerrainType.Pavement) || 0) / grid.length;
        const buildingPercent = (counts.get(TerrainType.Building) || 0) / grid.length;
        expect(pavementPercent + buildingPercent).toBeGreaterThanOrEqual(0.4);
        expect(pavementPercent + buildingPercent).toBeLessThanOrEqual(0.9);
      });

      it('should roughly match jungle biome weights', () => {
        const config: TerrainGeneratorConfig = {
          width: 30,
          height: 30,
          biome: 'jungle',
          seed: 42,
        };

        const grid = generateTerrain(config);

        const counts = countTerrainTypes(grid);
        const heavyWoodsPercent = (counts.get(TerrainType.HeavyWoods) || 0) / grid.length;
        const lightWoodsPercent = (counts.get(TerrainType.LightWoods) || 0) / grid.length;
        expect(heavyWoodsPercent + lightWoodsPercent).toBeGreaterThanOrEqual(0.4);
        expect(heavyWoodsPercent + lightWoodsPercent).toBeLessThanOrEqual(0.9);
      });
    });

    describe('terrain coherence', () => {
      it('should cluster woods together (noise coherence)', () => {
        const config: TerrainGeneratorConfig = {
          width: 20,
          height: 20,
          biome: 'temperate',
          seed: 42,
        };

        const grid = generateTerrain(config);

        let adjacentWoodsCount = 0;
        const isWoods = (hex: IHexTerrain) =>
          hex.features[0].type === TerrainType.LightWoods ||
          hex.features[0].type === TerrainType.HeavyWoods;

        const getHexAt = (q: number, r: number) =>
          grid.find((h: IHexTerrain) => h.coordinate.q === q && h.coordinate.r === r);

        for (const hex of grid) {
          if (isWoods(hex)) {
            const neighbors = [
              getHexAt(hex.coordinate.q + 1, hex.coordinate.r),
              getHexAt(hex.coordinate.q - 1, hex.coordinate.r),
              getHexAt(hex.coordinate.q, hex.coordinate.r + 1),
              getHexAt(hex.coordinate.q, hex.coordinate.r - 1),
            ];

            for (const neighbor of neighbors) {
              if (neighbor && isWoods(neighbor)) {
                adjacentWoodsCount++;
              }
            }
          }
        }

        const totalWoods = grid.filter(isWoods).length;
        if (totalWoods > 0) {
          expect(adjacentWoodsCount).toBeGreaterThan(0);
        }
      });

      it('should place water in low elevation areas', () => {
        const config: TerrainGeneratorConfig = {
          width: 25,
          height: 25,
          biome: 'temperate',
          seed: 123,
        };

        const grid = generateTerrain(config);

        const waterHexes = grid.filter((h: IHexTerrain) => h.features[0].type === TerrainType.Water);
        const nonWaterHexes = grid.filter((h: IHexTerrain) => h.features[0].type !== TerrainType.Water);

        if (waterHexes.length > 0 && nonWaterHexes.length > 0) {
          const avgWaterElevation =
            waterHexes.reduce((sum: number, h: IHexTerrain) => sum + h.elevation, 0) / waterHexes.length;
          const avgNonWaterElevation =
            nonWaterHexes.reduce((sum: number, h: IHexTerrain) => sum + h.elevation, 0) / nonWaterHexes.length;

          expect(avgWaterElevation).toBeLessThanOrEqual(avgNonWaterElevation);
        }
      });
    });

    describe('edge cases', () => {
      it('should handle very large grid', () => {
        const config: TerrainGeneratorConfig = {
          width: 50,
          height: 50,
          biome: 'temperate',
          seed: 99,
        };

        const grid = generateTerrain(config);

        expect(grid).toHaveLength(2500);
      });

      it('should handle all biome types', () => {
        const biomes: BiomeType[] = ['temperate', 'desert', 'arctic', 'urban', 'jungle'];

        for (const biome of biomes) {
          const config: TerrainGeneratorConfig = {
            width: 10,
            height: 10,
            biome,
            seed: 42,
          };

          const grid = generateTerrain(config);

          expect(grid).toHaveLength(100);
          expect(grid.every((h: IHexTerrain) => h.features.length > 0)).toBe(true);
        }
      });
    });
  });

  describe('BIOME_WEIGHTS', () => {
    it('should have weights for all biome types', () => {
      expect(BIOME_WEIGHTS.temperate).toBeDefined();
      expect(BIOME_WEIGHTS.desert).toBeDefined();
      expect(BIOME_WEIGHTS.arctic).toBeDefined();
      expect(BIOME_WEIGHTS.urban).toBeDefined();
      expect(BIOME_WEIGHTS.jungle).toBeDefined();
    });

    it('should have weights that sum to approximately 1.0', () => {
      for (const [, weights] of Object.entries(BIOME_WEIGHTS)) {
        const sum = (Object.values(weights) as number[]).reduce((a: number, b: number) => a + b, 0);
        expect(sum).toBeCloseTo(1.0, 2);
      }
    });
  });
});
