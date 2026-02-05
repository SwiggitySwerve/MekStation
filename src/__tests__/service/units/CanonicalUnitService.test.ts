import {
  CanonicalUnitService,
  canonicalUnitService,
} from '@/services/units/CanonicalUnitService';
import { Era } from '@/types/enums/Era';
import { TechBase } from '@/types/enums/TechBase';
import { WeightClass } from '@/types/enums/WeightClass';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

// Mock fetch for client-side
global.fetch = jest.fn();

describe('CanonicalUnitService', () => {
  let service: CanonicalUnitService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CanonicalUnitService();
    service.clearCache();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('getIndex()', () => {
    it('should load index from JSON', async () => {
      const mockIndex = {
        units: [
          {
            id: 'atlas-as7-d',
            chassis: 'Atlas',
            model: 'AS7-D',
            tonnage: 100,
            techBase: 'INNER_SPHERE',
            year: 2750,
            path: '3-succession-wars/assault/atlas-as7-d.json',
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockIndex,
      });

      const index = await service.getIndex();

      expect(index.length).toBe(1);
      expect(index[0].chassis).toBe('Atlas');
      expect(index[0].variant).toBe('AS7-D');
    });

    it('should cache index after first load', async () => {
      const mockIndex = { units: [] };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockIndex,
      });

      await service.getIndex();
      await service.getIndex();

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle fetch errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const index = await service.getIndex();

      expect(index).toEqual([]);
    });

    it('should handle 404 errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
      });

      const index = await service.getIndex();

      expect(index).toEqual([]);
    });

    it('should map tech base correctly', async () => {
      const mockIndex = {
        units: [
          {
            id: 'test-clan',
            chassis: 'Test',
            model: 'Clan',
            tonnage: 50,
            techBase: 'CLAN',
            year: 3050,
            path: '4-clan-invasion/medium/test-clan.json',
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockIndex,
      });

      const index = await service.getIndex();

      expect(index[0].techBase).toBe(TechBase.CLAN);
    });

    it('should determine weight class from tonnage', async () => {
      const mockIndex = {
        units: [
          {
            id: 'light',
            chassis: 'Light',
            model: 'Mech',
            tonnage: 30,
            techBase: 'INNER_SPHERE',
            year: 2750,
            path: 'test.json',
          },
          {
            id: 'medium',
            chassis: 'Medium',
            model: 'Mech',
            tonnage: 50,
            techBase: 'INNER_SPHERE',
            year: 2750,
            path: 'test.json',
          },
          {
            id: 'heavy',
            chassis: 'Heavy',
            model: 'Mech',
            tonnage: 70,
            techBase: 'INNER_SPHERE',
            year: 2750,
            path: 'test.json',
          },
          {
            id: 'assault',
            chassis: 'Assault',
            model: 'Mech',
            tonnage: 100,
            techBase: 'INNER_SPHERE',
            year: 2750,
            path: 'test.json',
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockIndex,
      });

      const index = await service.getIndex();

      expect(index.find((u) => u.id === 'light')?.weightClass).toBe(
        WeightClass.LIGHT,
      );
      expect(index.find((u) => u.id === 'medium')?.weightClass).toBe(
        WeightClass.MEDIUM,
      );
      expect(index.find((u) => u.id === 'heavy')?.weightClass).toBe(
        WeightClass.HEAVY,
      );
      expect(index.find((u) => u.id === 'assault')?.weightClass).toBe(
        WeightClass.ASSAULT,
      );
    });

    it('should map era from file path', async () => {
      const mockIndex = {
        units: [
          {
            id: 'test',
            chassis: 'Test',
            model: 'Mech',
            tonnage: 50,
            techBase: 'INNER_SPHERE',
            year: 2750,
            path: '4-clan-invasion/test.json',
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockIndex,
      });

      const index = await service.getIndex();

      expect(index[0].era).toBe(Era.CLAN_INVASION);
    });

    it('should default mixed tech base to Inner Sphere', async () => {
      const mockIndex = {
        units: [
          {
            id: 'mixed',
            chassis: 'Mixed',
            model: 'MX-1',
            tonnage: 55,
            techBase: 'MIXED',
            year: 3070,
            path: '6-dark-age/mixed.json',
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockIndex,
      });

      const index = await service.getIndex();

      expect(index[0].techBase).toBe(TechBase.INNER_SPHERE);
    });

    it('should fallback era to Late Succession Wars when path is unknown', async () => {
      const mockIndex = {
        units: [
          {
            id: 'unknown-era',
            chassis: 'Unknown',
            model: 'UE-1',
            tonnage: 40,
            techBase: 'INNER_SPHERE',
            year: 3025,
            path: 'unknown/path.json',
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockIndex,
      });

      const index = await service.getIndex();

      expect(index[0].era).toBe(Era.LATE_SUCCESSION_WARS);
    });
  });

  describe('getById()', () => {
    it('should return unit when found', async () => {
      const mockIndex = {
        units: [
          {
            id: 'atlas-as7-d',
            chassis: 'Atlas',
            model: 'AS7-D',
            tonnage: 100,
            techBase: 'INNER_SPHERE',
            year: 2750,
            path: 'test/atlas-as7-d.json',
          },
        ],
      };

      const mockUnit = {
        id: 'atlas-as7-d',
        chassis: 'Atlas',
        variant: 'AS7-D',
        tonnage: 100,
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockIndex,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUnit,
        });

      const unit = await service.getById('atlas-as7-d');

      expect(unit).toBeDefined();
      expect(unit?.chassis).toBe('Atlas');
    });

    it('should return null when unit not found', async () => {
      const mockIndex = { units: [] };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockIndex,
      });

      const unit = await service.getById('non-existent');

      expect(unit).toBeNull();
    });

    it('should cache unit after loading', async () => {
      const mockIndex = {
        units: [
          {
            id: 'test-unit',
            chassis: 'Test',
            model: 'Mech',
            tonnage: 50,
            techBase: 'INNER_SPHERE',
            year: 2750,
            path: 'test/test-unit.json',
          },
        ],
      };

      const mockUnit = { id: 'test-unit', chassis: 'Test' };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockIndex,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUnit,
        });

      await service.getById('test-unit');
      const firstCallCount = (global.fetch as jest.Mock).mock.calls.length;
      await service.getById('test-unit');
      const secondCallCount = (global.fetch as jest.Mock).mock.calls.length;

      // Unit should be cached, so second call shouldn't fetch unit again
      expect(secondCallCount).toBe(firstCallCount);
    });

    it('should return null when unit fetch fails', async () => {
      const mockIndex = {
        units: [
          {
            id: 'failing',
            chassis: 'Fail',
            model: 'F-1',
            tonnage: 50,
            techBase: 'INNER_SPHERE',
            year: 2750,
            path: 'test/fail.json',
          },
        ],
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockIndex,
        })
        .mockResolvedValueOnce({
          ok: false,
        });

      const unit = await service.getById('failing');

      expect(unit).toBeNull();
    });
  });

  describe('getByIds()', () => {
    it('should load multiple units', async () => {
      const mockIndex = {
        units: [
          {
            id: 'unit-1',
            chassis: 'Unit1',
            model: 'Mech',
            tonnage: 50,
            techBase: 'INNER_SPHERE',
            year: 2750,
            path: 'test/unit-1.json',
          },
          {
            id: 'unit-2',
            chassis: 'Unit2',
            model: 'Mech',
            tonnage: 50,
            techBase: 'INNER_SPHERE',
            year: 2750,
            path: 'test/unit-2.json',
          },
        ],
      };

      // Pre-load the index first to avoid race conditions with parallel getById calls
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockIndex,
      });
      await service.getIndex();

      // Now set up mocks for individual unit fetches
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'unit-1', chassis: 'Unit1' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'unit-2', chassis: 'Unit2' }),
        });

      const units = await service.getByIds(['unit-1', 'unit-2']);

      expect(units.length).toBe(2);
      expect(units[0].chassis).toBe('Unit1');
      expect(units[1].chassis).toBe('Unit2');
    });

    it('should filter out null results', async () => {
      const mockIndex = {
        units: [
          {
            id: 'unit-1',
            chassis: 'Unit1',
            model: 'Mech',
            tonnage: 50,
            techBase: 'INNER_SPHERE',
            year: 2750,
            path: 'test/unit-1.json',
          },
        ],
      };

      // Pre-load the index first to avoid race conditions
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockIndex,
      });
      await service.getIndex();

      // Now set up mocks for individual unit fetches
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'unit-1', chassis: 'Unit1' }),
      });

      // 'non-existent' will return null because it's not in the index
      const units = await service.getByIds(['unit-1', 'non-existent']);

      expect(units.length).toBe(1);
      expect(units[0].chassis).toBe('Unit1');
    });
  });

  describe('query()', () => {
    beforeEach(async () => {
      const mockIndex = {
        units: [
          {
            id: 'atlas-is',
            chassis: 'Atlas',
            model: 'AS7-D',
            tonnage: 100,
            techBase: 'INNER_SPHERE',
            year: 2750,
            path: '3-succession-wars/assault/atlas.json',
          },
          {
            id: 'timber-wolf',
            chassis: 'Timber Wolf',
            model: 'Prime',
            tonnage: 75,
            techBase: 'CLAN',
            year: 3050,
            path: '4-clan-invasion/heavy/timber-wolf.json',
          },
          {
            id: 'locust',
            chassis: 'Locust',
            model: 'LCT-1V',
            tonnage: 20,
            techBase: 'INNER_SPHERE',
            year: 2470,
            path: '3-succession-wars/light/locust.json',
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockIndex,
      });
    });

    it('should filter by tech base', async () => {
      const results = await service.query({ techBase: TechBase.CLAN });

      expect(results.length).toBe(1);
      expect(results[0].techBase).toBe(TechBase.CLAN);
    });

    it('should filter by era', async () => {
      const results = await service.query({ era: Era.CLAN_INVASION });

      expect(results.length).toBe(1);
      expect(results[0].era).toBe(Era.CLAN_INVASION);
    });

    it('should filter by weight class', async () => {
      const results = await service.query({ weightClass: WeightClass.ASSAULT });

      expect(results.length).toBe(1);
      expect(results[0].weightClass).toBe(WeightClass.ASSAULT);
    });

    it('should filter by min tonnage', async () => {
      const results = await service.query({ minTonnage: 75 });

      expect(results.length).toBe(2);
      expect(results.every((u) => u.tonnage >= 75)).toBe(true);
    });

    it('should filter by max tonnage', async () => {
      const results = await service.query({ maxTonnage: 50 });

      expect(results.length).toBe(1);
      expect(results[0].tonnage).toBeLessThanOrEqual(50);
    });

    it('should combine multiple filters', async () => {
      const results = await service.query({
        techBase: TechBase.INNER_SPHERE,
        minTonnage: 50,
        maxTonnage: 100,
      });

      expect(results.length).toBe(1);
      expect(results[0].chassis).toBe('Atlas');
    });

    it('should return all units when no filters', async () => {
      const results = await service.query({});

      expect(results.length).toBe(3);
    });

    it('should filter by unit type with no matches', async () => {
      const results = await service.query({ unitType: UnitType.VEHICLE });

      expect(results.length).toBe(0);
    });
  });

  describe('clearCache()', () => {
    it('should clear index cache', async () => {
      const mockIndex = { units: [] };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockIndex,
      });

      await service.getIndex();
      service.clearCache();
      await service.getIndex();

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should clear unit cache', async () => {
      const mockIndex = {
        units: [
          {
            id: 'test-unit',
            chassis: 'Test',
            model: 'Mech',
            tonnage: 50,
            techBase: 'INNER_SPHERE',
            year: 2750,
            path: 'test/test-unit.json',
          },
        ],
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockIndex,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'test-unit', chassis: 'Test' }),
        });

      await service.getById('test-unit');
      const beforeClear = (global.fetch as jest.Mock).mock.calls.length;
      service.clearCache();
      await service.getById('test-unit');
      const afterClear = (global.fetch as jest.Mock).mock.calls.length;

      // After clear, should fetch again
      expect(afterClear).toBeGreaterThan(beforeClear);
    });
  });

  describe('singleton instance', () => {
    it('should export singleton instance', () => {
      expect(canonicalUnitService).toBeInstanceOf(CanonicalUnitService);
    });
  });
});
