/**
 * Custom Unit Service Tests
 *
 * Tests for CRUD operations on user-created unit variants.
 *
 * @spec openspec/specs/unit-services/spec.md
 */

import {
  indexedDBService,
  STORES,
} from '@/services/persistence/IndexedDBService';
import { IFullUnit } from '@/services/units/CanonicalUnitService';
import { CustomUnitService } from '@/services/units/CustomUnitService';
import { Era } from '@/types/enums/Era';
import { TechBase } from '@/types/enums/TechBase';
import { WeightClass } from '@/types/enums/WeightClass';

// Mock the IndexedDB service
jest.mock('@/services/persistence/IndexedDBService', () => ({
  indexedDBService: {
    initialize: jest.fn().mockResolvedValue(undefined),
    put: jest.fn().mockResolvedValue(undefined),
    get: jest.fn(),
    getAll: jest.fn(),
    delete: jest.fn().mockResolvedValue(undefined),
  },
  STORES: {
    CUSTOM_UNITS: 'custom-units',
  },
}));

describe('CustomUnitService', () => {
  let service: CustomUnitService;
  const mockIndexedDB = indexedDBService as jest.Mocked<
    typeof indexedDBService
  >;

  beforeEach(() => {
    service = new CustomUnitService();
    jest.clearAllMocks();
  });

  /**
   * Create a mock full unit
   */
  function createMockUnit(overrides: Partial<IFullUnit> = {}): IFullUnit {
    return {
      id: 'test-unit',
      chassis: 'Custom Mech',
      variant: 'CM-1',
      tonnage: 50,
      techBase: 'Inner Sphere',
      era: 'Succession Wars',
      unitType: 'BattleMech',
      equipment: [],
      armor: { head: 9 },
      structure: { head: 3 },
      ...overrides,
    };
  }

  // ============================================================================
  // create()
  // ============================================================================
  describe('create()', () => {
    it('should initialize database before creating', async () => {
      const unit = createMockUnit();

      await service.create(unit);

      expect(mockIndexedDB.initialize).toHaveBeenCalled();
    });

    it('should generate custom ID', async () => {
      const unit = createMockUnit();

      const id = await service.create(unit);

      expect(id).toMatch(/^custom-/);
    });

    it('should store unit with generated ID', async () => {
      const unit = createMockUnit();

      const id = await service.create(unit);

      expect(mockIndexedDB.put).toHaveBeenCalledWith(
        STORES.CUSTOM_UNITS,
        id,
        expect.objectContaining({ id }),
      );
    });

    it('should return unique IDs for multiple creates', async () => {
      const unit1 = createMockUnit({ chassis: 'Mech 1' });
      const unit2 = createMockUnit({ chassis: 'Mech 2' });

      const id1 = await service.create(unit1);
      const id2 = await service.create(unit2);

      expect(id1).not.toBe(id2);
    });
  });

  // ============================================================================
  // update()
  // ============================================================================
  describe('update()', () => {
    it('should initialize database before updating', async () => {
      const unit = createMockUnit({ id: 'custom-123' });
      mockIndexedDB.get.mockResolvedValueOnce(unit);

      await service.update('custom-123', unit);

      expect(mockIndexedDB.initialize).toHaveBeenCalled();
    });

    it('should throw NotFoundError for non-existent unit', async () => {
      mockIndexedDB.get.mockResolvedValueOnce(null);

      await expect(
        service.update('non-existent', createMockUnit()),
      ).rejects.toThrow('Custom Unit');
    });

    it('should update existing unit', async () => {
      const existing = createMockUnit({ id: 'custom-123' });
      const updated = { ...existing, chassis: 'Updated Mech' };

      mockIndexedDB.get.mockResolvedValueOnce(existing);

      await service.update('custom-123', updated);

      expect(mockIndexedDB.put).toHaveBeenCalledWith(
        STORES.CUSTOM_UNITS,
        'custom-123',
        expect.objectContaining({ id: 'custom-123', chassis: 'Updated Mech' }),
      );
    });

    it('should preserve ID even if different ID provided in unit', async () => {
      const existing = createMockUnit({ id: 'custom-123' });
      const updated = { ...existing, id: 'different-id' };

      mockIndexedDB.get.mockResolvedValueOnce(existing);

      await service.update('custom-123', updated);

      expect(mockIndexedDB.put).toHaveBeenCalledWith(
        STORES.CUSTOM_UNITS,
        'custom-123',
        expect.objectContaining({ id: 'custom-123' }),
      );
    });
  });

  // ============================================================================
  // delete()
  // ============================================================================
  describe('delete()', () => {
    it('should initialize database before deleting', async () => {
      await service.delete('custom-123');

      expect(mockIndexedDB.initialize).toHaveBeenCalled();
    });

    it('should delete unit from database', async () => {
      await service.delete('custom-123');

      expect(mockIndexedDB.delete).toHaveBeenCalledWith(
        STORES.CUSTOM_UNITS,
        'custom-123',
      );
    });
  });

  // ============================================================================
  // getById()
  // ============================================================================
  describe('getById()', () => {
    it('should initialize database before getting', async () => {
      mockIndexedDB.get.mockResolvedValueOnce(null);

      await service.getById('custom-123');

      expect(mockIndexedDB.initialize).toHaveBeenCalled();
    });

    it('should return null for non-existent unit', async () => {
      mockIndexedDB.get.mockResolvedValueOnce(undefined);

      const result = await service.getById('non-existent');

      expect(result).toBeNull();
    });

    it('should return unit data', async () => {
      const unit = createMockUnit({ id: 'custom-123' });
      mockIndexedDB.get.mockResolvedValueOnce(unit);

      const result = await service.getById('custom-123');

      expect(result).toEqual(unit);
    });
  });

  // ============================================================================
  // list()
  // ============================================================================
  describe('list()', () => {
    it('should initialize database before listing', async () => {
      mockIndexedDB.getAll.mockResolvedValueOnce([]);

      await service.list();

      expect(mockIndexedDB.initialize).toHaveBeenCalled();
    });

    it('should return empty array when no units', async () => {
      mockIndexedDB.getAll.mockResolvedValueOnce([]);

      const result = await service.list();

      expect(result).toEqual([]);
    });

    it('should convert units to index entries', async () => {
      const units = [
        createMockUnit({
          id: 'custom-1',
          chassis: 'Mech 1',
          variant: 'M1',
          tonnage: 50,
        }),
        createMockUnit({
          id: 'custom-2',
          chassis: 'Mech 2',
          variant: 'M2',
          tonnage: 75,
        }),
      ];
      mockIndexedDB.getAll.mockResolvedValueOnce(units);

      const result = await service.list();

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('id', 'custom-1');
      expect(result[0]).toHaveProperty('name', 'Mech 1 M1');
      expect(result[0]).toHaveProperty('tonnage', 50);
      expect(result[1]).toHaveProperty('id', 'custom-2');
    });

    it('should include correct index entry fields', async () => {
      const unit = createMockUnit({
        id: 'custom-1',
        chassis: 'Test',
        variant: 'T-1',
        tonnage: 50,
        techBase: TechBase.CLAN,
        era: Era.CLAN_INVASION,
        unitType: 'BattleMech',
      });
      mockIndexedDB.getAll.mockResolvedValueOnce([unit]);

      const result = await service.list();

      expect(result[0]).toMatchObject({
        id: 'custom-1',
        name: 'Test T-1',
        chassis: 'Test',
        variant: 'T-1',
        tonnage: 50,
        techBase: TechBase.CLAN,
        era: Era.CLAN_INVASION,
        unitType: 'BattleMech',
        filePath: '', // Custom units don't have file paths
      });
    });

    it('should calculate weight class from tonnage', async () => {
      const lightUnit = createMockUnit({ id: '1', tonnage: 20 });
      const mediumUnit = createMockUnit({ id: '2', tonnage: 50 });
      const heavyUnit = createMockUnit({ id: '3', tonnage: 75 });
      const assaultUnit = createMockUnit({ id: '4', tonnage: 100 });

      mockIndexedDB.getAll.mockResolvedValueOnce([
        lightUnit,
        mediumUnit,
        heavyUnit,
        assaultUnit,
      ]);

      const result = await service.list();

      expect(result[0].weightClass).toBe(WeightClass.LIGHT);
      expect(result[1].weightClass).toBe(WeightClass.MEDIUM);
      expect(result[2].weightClass).toBe(WeightClass.HEAVY);
      expect(result[3].weightClass).toBe(WeightClass.ASSAULT);
    });
  });

  // ============================================================================
  // exists()
  // ============================================================================
  describe('exists()', () => {
    it('should return false for non-existent unit', async () => {
      mockIndexedDB.get.mockResolvedValueOnce(null);

      const result = await service.exists('non-existent');

      expect(result).toBe(false);
    });

    it('should return true for existing unit', async () => {
      const unit = createMockUnit({ id: 'custom-123' });
      mockIndexedDB.get.mockResolvedValueOnce(unit);

      const result = await service.exists('custom-123');

      expect(result).toBe(true);
    });
  });
});
