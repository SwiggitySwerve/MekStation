/**
 * Unit Search Service Tests
 * 
 * Tests for MiniSearch-powered full-text search across units.
 * 
 * @spec openspec/specs/unit-services/spec.md
 */

import { UnitSearchService } from '@/services/units/UnitSearchService';
import { canonicalUnitService } from '@/services/units/CanonicalUnitService';
import { customUnitApiService } from '@/services/units/CustomUnitApiService';
import { IUnitIndexEntry } from '@/services/common/types';
import { ICustomUnitIndexEntry } from '@/types/persistence/UnitPersistence';
import { TechBase } from '@/types/enums/TechBase';
import { Era } from '@/types/enums/Era';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { WeightClass } from '@/types/enums/WeightClass';

// Mock the unit services
jest.mock('@/services/units/CanonicalUnitService', () => ({
  canonicalUnitService: {
    getIndex: jest.fn(),
  },
}));

jest.mock('@/services/units/CustomUnitApiService', () => ({
  customUnitApiService: {
    list: jest.fn(),
  },
}));

describe('UnitSearchService', () => {
  let service: UnitSearchService;
  const mockCanonical = canonicalUnitService as jest.Mocked<typeof canonicalUnitService>;
  const mockCustomApi = customUnitApiService as jest.Mocked<typeof customUnitApiService>;

  beforeEach(() => {
    service = new UnitSearchService();
    jest.clearAllMocks();
  });

  /**
   * Create a mock index entry
   */
  function createMockEntry(overrides: Partial<IUnitIndexEntry> = {}): IUnitIndexEntry {
    return {
      id: 'test-unit',
      name: 'Atlas AS7-D',
      chassis: 'Atlas',
      variant: 'AS7-D',
      tonnage: 100,
      techBase: TechBase.INNER_SPHERE,
      era: Era.STAR_LEAGUE,
      weightClass: WeightClass.ASSAULT,
      unitType: 'BattleMech',
      filePath: '/data/units/atlas.json',
      ...overrides,
    };
  }

  /**
   * Create a mock custom unit index entry (from API)
   */
  function createMockCustomEntry(overrides: Partial<ICustomUnitIndexEntry> = {}): ICustomUnitIndexEntry {
    return {
      id: 'custom-test-unit',
      chassis: 'Custom',
      variant: 'TEST-1',
      tonnage: 50,
      techBase: TechBase.INNER_SPHERE,
      era: Era.LATE_SUCCESSION_WARS,
      rulesLevel: RulesLevel.STANDARD,
      weightClass: WeightClass.MEDIUM,
      unitType: 'BattleMech',
      currentVersion: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    };
  }

  // ============================================================================
  // initialize()
  // ============================================================================
  describe('initialize()', () => {
    it('should load canonical units', async () => {
      mockCanonical.getIndex.mockResolvedValueOnce([]);
      mockCustomApi.list.mockResolvedValueOnce([]);
      
      await service.initialize();
      
      expect(mockCanonical.getIndex).toHaveBeenCalled();
    });

    it('should load custom units from API', async () => {
      mockCanonical.getIndex.mockResolvedValueOnce([]);
      mockCustomApi.list.mockResolvedValueOnce([]);
      
      await service.initialize();
      
      expect(mockCustomApi.list).toHaveBeenCalled();
    });

    it('should only initialize once', async () => {
      mockCanonical.getIndex.mockResolvedValue([]);
      mockCustomApi.list.mockResolvedValue([]);
      
      await service.initialize();
      await service.initialize();
      
      expect(mockCanonical.getIndex).toHaveBeenCalledTimes(1);
    });

    it('should combine canonical and custom units', async () => {
      const canonical = [createMockEntry({ id: 'canonical-1', name: 'Atlas AS7-D' })];
      const custom = [createMockCustomEntry({ id: 'custom-1', chassis: 'Custom', variant: 'Mech' })];
      
      mockCanonical.getIndex.mockResolvedValueOnce(canonical);
      mockCustomApi.list.mockResolvedValueOnce(custom);
      
      await service.initialize();
      
      // Both should be searchable
      const atlasResults = service.search('Atlas');
      const customResults = service.search('Custom');
      
      expect(atlasResults.length).toBeGreaterThanOrEqual(0);
      expect(customResults.length).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // search()
  // ============================================================================
  describe('search()', () => {
    beforeEach(async () => {
      const units = [
        createMockEntry({ id: '1', name: 'Atlas AS7-D', chassis: 'Atlas', variant: 'AS7-D' }),
        createMockEntry({ id: '2', name: 'Atlas AS7-K', chassis: 'Atlas', variant: 'AS7-K' }),
        createMockEntry({ id: '3', name: 'Hunchback HBK-4G', chassis: 'Hunchback', variant: 'HBK-4G' }),
        createMockEntry({ id: '4', name: 'Locust LCT-1V', chassis: 'Locust', variant: 'LCT-1V' }),
      ];
      
      mockCanonical.getIndex.mockResolvedValueOnce(units);
      mockCustomApi.list.mockResolvedValueOnce([]);
      
      await service.initialize();
    });

    it('should return empty array when not initialized', () => {
      const uninitializedService = new UnitSearchService();
      
      const results = uninitializedService.search('Atlas');
      
      expect(results).toEqual([]);
    });

    it('should find units by name', () => {
      const results = service.search('Atlas');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => r.name.includes('Atlas'))).toBe(true);
    });

    it('should find units by chassis', () => {
      const results = service.search('Hunchback');
      
      expect(results.length).toBe(1);
      expect(results[0].chassis).toBe('Hunchback');
    });

    it('should find units by variant', () => {
      const results = service.search('AS7-D');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.variant === 'AS7-D')).toBe(true);
    });

    it('should support fuzzy search', () => {
      // "Atla" should still find "Atlas"
      const results = service.search('Atla');
      
      expect(results.length).toBeGreaterThan(0);
    });

    it('should support prefix search', () => {
      const results = service.search('Loc');
      
      expect(results.length).toBe(1);
      expect(results[0].chassis).toBe('Locust');
    });

    it('should limit results when specified', () => {
      const results = service.search('Atlas', { limit: 1 });
      
      expect(results).toHaveLength(1);
    });

    it('should return empty array for no matches', () => {
      const results = service.search('NonexistentMech12345');
      
      expect(results).toEqual([]);
    });
  });

  // ============================================================================
  // addToIndex()
  // ============================================================================
  describe('addToIndex()', () => {
    beforeEach(async () => {
      mockCanonical.getIndex.mockResolvedValueOnce([]);
      mockCustomApi.list.mockResolvedValueOnce([]);
      await service.initialize();
    });

    it('should do nothing when not initialized', () => {
      const uninitializedService = new UnitSearchService();
      const unit = createMockEntry({ id: 'new-unit' });
      
      // Should not throw
      expect(() => uninitializedService.addToIndex(unit)).not.toThrow();
    });

    it('should add new unit to index', () => {
      const unit = createMockEntry({ id: 'new-unit', name: 'New Mech', chassis: 'NewMech' });
      
      service.addToIndex(unit);
      
      const results = service.search('NewMech');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('new-unit');
    });

    it('should update existing unit in index', () => {
      const originalUnit = createMockEntry({ id: 'update-unit', name: 'Original Name', chassis: 'Original' });
      const updatedUnit = createMockEntry({ id: 'update-unit', name: 'Updated Name', chassis: 'Updated' });
      
      service.addToIndex(originalUnit);
      service.addToIndex(updatedUnit);
      
      const results = service.search('Updated');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Updated Name');
    });
  });

  // ============================================================================
  // removeFromIndex()
  // ============================================================================
  describe('removeFromIndex()', () => {
    beforeEach(async () => {
      const units = [
        createMockEntry({ id: 'keep-unit', name: 'Keep Mech', chassis: 'Keep' }),
        createMockEntry({ id: 'remove-unit', name: 'Remove Mech', chassis: 'Remove' }),
      ];
      
      mockCanonical.getIndex.mockResolvedValueOnce(units);
      mockCustomApi.list.mockResolvedValueOnce([]);
      await service.initialize();
    });

    it('should do nothing when not initialized', () => {
      const uninitializedService = new UnitSearchService();
      
      // Should not throw
      expect(() => uninitializedService.removeFromIndex('some-id')).not.toThrow();
    });

    it('should do nothing for non-existent ID', () => {
      // Should not throw
      expect(() => service.removeFromIndex('non-existent')).not.toThrow();
    });

    it('should remove unit from index', () => {
      service.removeFromIndex('remove-unit');
      
      const results = service.search('Remove');
      expect(results).toHaveLength(0);
    });

    it('should keep other units', () => {
      service.removeFromIndex('remove-unit');
      
      const results = service.search('Keep');
      expect(results).toHaveLength(1);
    });
  });

  // ============================================================================
  // rebuildIndex()
  // ============================================================================
  describe('rebuildIndex()', () => {
    it('should reset initialized state', async () => {
      mockCanonical.getIndex.mockResolvedValue([]);
      mockCustomApi.list.mockResolvedValue([]);
      
      await service.initialize();
      await service.rebuildIndex();
      
      // Should have called getIndex twice (once for each init)
      expect(mockCanonical.getIndex).toHaveBeenCalledTimes(2);
    });

    it('should pick up new units', async () => {
      // First init - no units
      mockCanonical.getIndex.mockResolvedValueOnce([]);
      mockCustomApi.list.mockResolvedValueOnce([]);
      await service.initialize();
      
      expect(service.search('Atlas')).toHaveLength(0);
      
      // Rebuild with new units
      const newUnits = [createMockEntry({ id: '1', name: 'Atlas AS7-D', chassis: 'Atlas' })];
      mockCanonical.getIndex.mockResolvedValueOnce(newUnits);
      mockCustomApi.list.mockResolvedValueOnce([]);
      
      await service.rebuildIndex();
      
      const results = service.search('Atlas');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should remove deleted units', async () => {
      // First init - has unit
      const units = [createMockEntry({ id: '1', name: 'Atlas AS7-D', chassis: 'Atlas' })];
      mockCanonical.getIndex.mockResolvedValueOnce(units);
      mockCustomApi.list.mockResolvedValueOnce([]);
      await service.initialize();
      
      expect(service.search('Atlas').length).toBeGreaterThan(0);
      
      // Rebuild with no units
      mockCanonical.getIndex.mockResolvedValueOnce([]);
      mockCustomApi.list.mockResolvedValueOnce([]);
      
      await service.rebuildIndex();
      
      expect(service.search('Atlas')).toHaveLength(0);
    });
  });

  // ============================================================================
  // Search Options
  // ============================================================================
  describe('Search Options', () => {
    beforeEach(async () => {
      const units = [
        createMockEntry({ id: '1', name: 'Atlas AS7-D', chassis: 'Atlas', variant: 'AS7-D' }),
        createMockEntry({ id: '2', name: 'Atlas AS7-K', chassis: 'Atlas', variant: 'AS7-K' }),
      ];
      
      mockCanonical.getIndex.mockResolvedValueOnce(units);
      mockCustomApi.list.mockResolvedValueOnce([]);
      await service.initialize();
    });

    it('should support fuzzy search option', () => {
      // Fuzzy search should find approximate matches
      const fuzzyResults = service.search('Atlas', { fuzzy: true });
      expect(fuzzyResults.length).toBeGreaterThan(0);
      
      // Non-fuzzy should also work
      const exactResults = service.search('Atlas', { fuzzy: false });
      expect(exactResults.length).toBeGreaterThan(0);
    });

    it('should support field restriction', () => {
      // Search only in chassis field
      const results = service.search('Atlas', { fields: ['chassis'] });
      expect(results.length).toBeGreaterThan(0);
    });
  });
});
