import { MigrationService } from '@/services/persistence/MigrationService';
import { indexedDBService, STORES } from '@/services/persistence/IndexedDBService';
import { getSQLiteService, ISQLiteService } from '@/services/persistence/SQLiteService';
import { getUnitRepository, IUnitRepository } from '@/services/units/UnitRepository';
import { IFullUnit } from '@/services/units/CanonicalUnitService';
import { createMock } from '../../helpers';

// Mock dependencies
jest.mock('@/services/persistence/IndexedDBService');
jest.mock('@/services/persistence/SQLiteService');
jest.mock('@/services/units/UnitRepository');

const mockIndexedDBService = indexedDBService as jest.Mocked<typeof indexedDBService>;
const mockSQLiteService = getSQLiteService as jest.MockedFunction<typeof getSQLiteService>;
const mockUnitRepository = getUnitRepository as jest.MockedFunction<typeof getUnitRepository>;

describe('MigrationService', () => {
  let service: MigrationService;
  let mockProgressCallback: jest.Mock;

  beforeEach(() => {
    service = new MigrationService();
    mockProgressCallback = jest.fn();
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockIndexedDBService.initialize.mockResolvedValue();
    mockIndexedDBService.getAll.mockResolvedValue([]);
    mockIndexedDBService.clear.mockResolvedValue();
    
    // @ts-expect-error - Returning interface mock instead of class instance for testing
    mockSQLiteService.mockReturnValue(createMock<ISQLiteService>({
      initialize: jest.fn(),
    }));
    
    // @ts-expect-error - Returning interface mock instead of class instance for testing
    mockUnitRepository.mockReturnValue(createMock<IUnitRepository>({
      findByName: jest.fn(),
      create: jest.fn(),
    }));
  });

  describe('hasIndexedDBData', () => {
    it('should return true when IndexedDB has units', async () => {
      const mockUnits: IFullUnit[] = [
        {
          id: 'unit-1',
          chassis: 'Atlas',
          variant: 'AS7-D',
          tonnage: 100,
        } as IFullUnit,
      ];
      
      mockIndexedDBService.getAll.mockResolvedValue(mockUnits);
      
      const result = await service.hasIndexedDBData();
      
      expect(result).toBe(true);
      expect(mockIndexedDBService.initialize).toHaveBeenCalled();
      expect(mockIndexedDBService.getAll).toHaveBeenCalledWith(STORES.CUSTOM_UNITS);
    });

    it('should return false when IndexedDB is empty', async () => {
      mockIndexedDBService.getAll.mockResolvedValue([]);
      
      const result = await service.hasIndexedDBData();
      
      expect(result).toBe(false);
    });

    it('should return false when IndexedDB initialization fails', async () => {
      mockIndexedDBService.initialize.mockRejectedValue(new Error('IndexedDB unavailable'));
      
      const result = await service.hasIndexedDBData();
      
      expect(result).toBe(false);
    });
  });

  describe('migrateToSQLite', () => {
    it('should migrate units successfully', async () => {
      const mockUnits: IFullUnit[] = [
        {
          id: 'unit-1',
          chassis: 'Atlas',
          variant: 'AS7-D',
          tonnage: 100,
        } as IFullUnit,
        {
          id: 'unit-2',
          chassis: 'Marauder',
          variant: 'MAD-3R',
          tonnage: 75,
        } as IFullUnit,
      ];
      
      mockIndexedDBService.getAll.mockResolvedValue(mockUnits);
      
      const mockRepo = {
        findByName: jest.fn().mockReturnValue(null), // Unit doesn't exist
        create: jest.fn().mockReturnValue({ success: true }),
      };
      // @ts-expect-error - Returning interface mock instead of class instance for testing
      mockUnitRepository.mockReturnValue(createMock<IUnitRepository>(mockRepo));
      
      const result = await service.migrateToSQLite(mockProgressCallback);
      
      expect(result.success).toBe(true);
      expect(result.totalUnits).toBe(2);
      expect(result.migratedUnits).toBe(2);
      expect(result.failedUnits).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockProgressCallback).toHaveBeenCalledTimes(2);
      expect(mockRepo.create).toHaveBeenCalledTimes(2);
    });

    it('should skip units that already exist', async () => {
      const mockUnits: IFullUnit[] = [
        {
          id: 'unit-1',
          chassis: 'Atlas',
          variant: 'AS7-D',
          tonnage: 100,
        } as IFullUnit,
      ];
      
      mockIndexedDBService.getAll.mockResolvedValue(mockUnits);
      
      const mockRepo = {
        findByName: jest.fn().mockReturnValue({ id: 'existing' }), // Unit exists
        create: jest.fn(),
      };
      // @ts-expect-error - Returning interface mock instead of class instance for testing
      mockUnitRepository.mockReturnValue(createMock<IUnitRepository>(mockRepo));
      
      const result = await service.migrateToSQLite();
      
      expect(result.success).toBe(true);
      expect(result.totalUnits).toBe(1);
      expect(result.migratedUnits).toBe(0);
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('should handle units without chassis or variant', async () => {
      const mockUnits: IFullUnit[] = [
        {
          id: 'unit-1',
          tonnage: 100,
        } as IFullUnit,
      ];
      
      mockIndexedDBService.getAll.mockResolvedValue(mockUnits);
      
      const mockRepo = {
        findByName: jest.fn().mockReturnValue(null),
        create: jest.fn().mockReturnValue({ success: true }),
      };
      // @ts-expect-error - Returning interface mock instead of class instance for testing
      mockUnitRepository.mockReturnValue(createMock<IUnitRepository>(mockRepo));
      
      const result = await service.migrateToSQLite();
      
      expect(result.success).toBe(true);
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          chassis: 'Unknown',
          variant: 'Unknown',
        })
      );
    });

    it('should handle creation failures', async () => {
      const mockUnits: IFullUnit[] = [
        {
          id: 'unit-1',
          chassis: 'Atlas',
          variant: 'AS7-D',
          tonnage: 100,
        } as IFullUnit,
      ];
      
      mockIndexedDBService.getAll.mockResolvedValue(mockUnits);
      
      const mockRepo = {
        findByName: jest.fn().mockReturnValue(null),
        create: jest.fn().mockReturnValue({ success: false, error: 'Creation failed' }),
      };
      // @ts-expect-error - Returning interface mock instead of class instance for testing
      mockUnitRepository.mockReturnValue(createMock<IUnitRepository>(mockRepo));
      
      const result = await service.migrateToSQLite();
      
      expect(result.success).toBe(false);
      expect(result.migratedUnits).toBe(0);
      expect(result.failedUnits).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Creation failed');
    });

    it('should handle exceptions during migration', async () => {
      const mockUnits: IFullUnit[] = [
        {
          id: 'unit-1',
          chassis: 'Atlas',
          variant: 'AS7-D',
          tonnage: 100,
        } as IFullUnit,
      ];
      
      mockIndexedDBService.getAll.mockResolvedValue(mockUnits);
      
      const mockRepo = {
        findByName: jest.fn().mockImplementation(() => {
          throw new Error('Repository error');
        }),
        create: jest.fn(),
      };
      // @ts-expect-error - Returning interface mock instead of class instance for testing
      mockUnitRepository.mockReturnValue(createMock<IUnitRepository>(mockRepo));
      
      const result = await service.migrateToSQLite();
      
      expect(result.success).toBe(false);
      expect(result.failedUnits).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Repository error');
    });

    it('should return success with zero units when IndexedDB is empty', async () => {
      mockIndexedDBService.getAll.mockResolvedValue([]);
      
      const result = await service.migrateToSQLite();
      
      expect(result.success).toBe(true);
      expect(result.totalUnits).toBe(0);
      expect(result.migratedUnits).toBe(0);
      expect(result.failedUnits).toBe(0);
    });

    it('should call progress callback for each unit', async () => {
      const mockUnits: IFullUnit[] = [
        {
          id: 'unit-1',
          chassis: 'Atlas',
          variant: 'AS7-D',
          tonnage: 100,
        } as IFullUnit,
        {
          id: 'unit-2',
          chassis: 'Marauder',
          variant: 'MAD-3R',
          tonnage: 75,
        } as IFullUnit,
      ];
      
      mockIndexedDBService.getAll.mockResolvedValue(mockUnits);
      
      const mockRepo = {
        findByName: jest.fn().mockReturnValue(null),
        create: jest.fn().mockReturnValue({ success: true }),
      };
      // @ts-expect-error - Returning interface mock instead of class instance for testing
      mockUnitRepository.mockReturnValue(createMock<IUnitRepository>(mockRepo));
      
      await service.migrateToSQLite(mockProgressCallback);
      
      expect(mockProgressCallback).toHaveBeenCalledTimes(2);
      expect(mockProgressCallback).toHaveBeenNthCalledWith(1, {
        current: 1,
        total: 2,
        currentUnit: 'Atlas AS7-D',
      });
      expect(mockProgressCallback).toHaveBeenNthCalledWith(2, {
        current: 2,
        total: 2,
        currentUnit: 'Marauder MAD-3R',
      });
    });

    it('should handle initialization errors', async () => {
      mockIndexedDBService.initialize.mockRejectedValue(new Error('Init failed'));
      
      const result = await service.migrateToSQLite();
      
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('Init failed');
    });
  });

  describe('clearIndexedDB', () => {
    it('should clear custom units store', async () => {
      await service.clearIndexedDB();
      
      expect(mockIndexedDBService.initialize).toHaveBeenCalled();
      expect(mockIndexedDBService.clear).toHaveBeenCalledWith(STORES.CUSTOM_UNITS);
      expect(mockIndexedDBService.clear).toHaveBeenCalledWith(STORES.UNIT_METADATA);
    });
  });
});

