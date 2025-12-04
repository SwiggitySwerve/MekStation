import { UnitSearchService } from '@/services/units/UnitSearchService';
import { canonicalUnitService } from '@/services/units/CanonicalUnitService';
import { customUnitApiService } from '@/services/units/CustomUnitApiService';
import { TechBase } from '@/types/enums/TechBase';
import { WeightClass } from '@/types/enums/WeightClass';

// Mock MiniSearch
jest.mock('minisearch', () => {
  const mockIndex = {
    addAll: jest.fn(),
    add: jest.fn(),
    remove: jest.fn(),
    search: jest.fn(),
  };
  
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => mockIndex),
  };
});

// Mock services
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

import MiniSearch from 'minisearch';

interface MockSearchIndex {
  addAll: jest.Mock;
  search: jest.Mock;
}

describe('UnitSearchService', () => {
  let service: UnitSearchService;
  let mockSearchIndex: MockSearchIndex;

  const mockCanonicalUnit = {
    id: 'atlas-as7-d',
    chassis: 'Atlas',
    variant: 'AS7-D',
    tonnage: 100,
    techBase: TechBase.INNER_SPHERE,
    era: 'AGE_OF_WAR',
    weightClass: WeightClass.ASSAULT,
    unitType: 'BattleMech',
    name: 'Atlas AS7-D',
    filePath: '/data/units/atlas-as7-d.json',
  };

  const mockCustomUnit = {
    id: 'custom-1',
    chassis: 'Custom',
    variant: 'C-1',
    tonnage: 50,
    techBase: TechBase.CLAN,
    era: 'CLAN_INVASION',
    weightClass: WeightClass.MEDIUM,
    unitType: 'BattleMech',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UnitSearchService();
    
    mockSearchIndex = {
      addAll: jest.fn(),
      add: jest.fn(),
      remove: jest.fn(),
      discard: jest.fn(),
      search: jest.fn().mockReturnValue([{ id: 'atlas-as7-d' }]),
    };
    
    (MiniSearch as jest.Mock).mockReturnValue(mockSearchIndex);
    (canonicalUnitService.getIndex as jest.Mock).mockResolvedValue([mockCanonicalUnit]);
    (customUnitApiService.list as jest.Mock).mockResolvedValue([mockCustomUnit]);
  });

  describe('initialize()', () => {
    it('should create search index', async () => {
      await service.initialize();
      
      expect(MiniSearch).toHaveBeenCalled();
    });

    it('should load canonical units', async () => {
      await service.initialize();
      
      expect(canonicalUnitService.getIndex).toHaveBeenCalled();
    });

    it('should load custom units', async () => {
      await service.initialize();
      
      expect(customUnitApiService.list).toHaveBeenCalled();
    });

    it('should add units to search index', async () => {
      await service.initialize();
      
      expect(mockSearchIndex.addAll).toHaveBeenCalled();
    });

    it('should not reinitialize if already initialized', async () => {
      await service.initialize();
      await service.initialize();
      
      expect(MiniSearch).toHaveBeenCalledTimes(1);
    });
  });

  describe('search()', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should return empty array if not initialized', () => {
      const uninitializedService = new UnitSearchService();
      const results = uninitializedService.search('Atlas');
      
      expect(results).toEqual([]);
    });

    it('should search units by query', () => {
      service.search('Atlas');
      
      expect(mockSearchIndex.search).toHaveBeenCalledWith('Atlas', expect.any(Object));
    });

    it('should return matching units', () => {
      const results = service.search('Atlas');
      
      expect(results.length).toBeGreaterThan(0);
    });

    it('should filter by tech base when provided', () => {
      service.search('Atlas', { techBase: TechBase.INNER_SPHERE });
      
      expect(mockSearchIndex.search).toHaveBeenCalled();
    });

    it('should filter by weight class when provided', () => {
      service.search('Atlas', { weightClass: WeightClass.ASSAULT });
      
      expect(mockSearchIndex.search).toHaveBeenCalled();
    });

    it('should limit results when maxResults is provided', () => {
      const results = service.search('Atlas', { maxResults: 5 });
      
      expect(results.length).toBeLessThanOrEqual(5);
    });
  });

  describe('addToIndex()', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should add unit to search index', () => {
      service.addToIndex(mockCanonicalUnit);
      
      expect(mockSearchIndex.add).toHaveBeenCalledWith(mockCanonicalUnit);
    });
  });

  describe('removeFromIndex()', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should remove unit from search index', () => {
      service.removeFromIndex('atlas-as7-d');
      
      expect(mockSearchIndex.discard).toHaveBeenCalled();
    });
  });

  describe('rebuildIndex()', () => {
    it('should reload units and rebuild index', async () => {
      await service.initialize();
      await service.rebuildIndex();
      
      expect(canonicalUnitService.getIndex).toHaveBeenCalledTimes(2);
      expect(customUnitApiService.list).toHaveBeenCalledTimes(2);
    });
  });
});
