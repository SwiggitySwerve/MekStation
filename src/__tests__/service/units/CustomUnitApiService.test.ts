import { CustomUnitApiService } from '@/services/units/CustomUnitApiService';
import { canonicalUnitService } from '@/services/units/CanonicalUnitService';
import { IFullUnit } from '@/services/units/CanonicalUnitService';

// Mock dependencies
jest.mock('@/services/units/CanonicalUnitService');

const mockCanonicalUnitService = canonicalUnitService as jest.Mocked<typeof canonicalUnitService>;

// Mock fetch globally
global.fetch = jest.fn();

describe('CustomUnitApiService', () => {
  let service: CustomUnitApiService;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    service = new CustomUnitApiService();
    mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('should list all custom units', async () => {
      const mockUnits = [
        { id: 'custom-1', chassis: 'Atlas', variant: 'AS7-X' },
        { id: 'custom-2', chassis: 'Marauder', variant: 'MAD-3R' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ units: mockUnits }),
      } as Response);

      const result = await service.list();

      expect(result).toEqual(mockUnits);
      expect(mockFetch).toHaveBeenCalledWith('/api/units/custom');
    });

    it('should throw on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      } as Response);

      await expect(service.list()).rejects.toThrow('Failed to list units');
    });
  });

  describe('getById', () => {
    it('should get unit by ID', async () => {
      const mockUnit = {
        id: 'custom-1',
        chassis: 'Atlas',
        variant: 'AS7-X',
        parsedData: { id: 'custom-1', chassis: 'Atlas', variant: 'AS7-X', tonnage: 100 },
        currentVersion: 1,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUnit,
      } as Response);

      const result = await service.getById('custom-1');

      expect(result).toEqual({
        ...mockUnit.parsedData,
        id: 'custom-1',
        chassis: 'Atlas',
        variant: 'AS7-X',
        currentVersion: 1,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
      });
      expect(mockFetch).toHaveBeenCalledWith('/api/units/custom/custom-1');
    });

    it('should return null for 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      const result = await service.getById('non-existent');

      expect(result).toBeNull();
    });

    it('should throw on other errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      await expect(service.getById('custom-1')).rejects.toThrow('Failed to get unit');
    });
  });

  describe('create', () => {
    it('should create a new unit', async () => {
      const unit: IFullUnit = {
        id: 'temp',
        chassis: 'Atlas',
        variant: 'AS7-X',
        tonnage: 100,
      } as IFullUnit;

      // Mock findByName to return null (no conflict)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ units: [] }),
      } as Response);

      // Mock create API call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'custom-1', version: 1 }),
      } as Response);

      const result = await service.create(unit, 'Atlas', 'AS7-X');

      expect(result.success).toBe(true);
      expect(result.id).toBe('custom-1');
      expect(result.version).toBe(1);
    });

    it('should reject duplicate names', async () => {
      const unit: IFullUnit = {
        id: 'temp',
        chassis: 'Atlas',
        variant: 'AS7-X',
        tonnage: 100,
      } as IFullUnit;

      // Mock findByName to return existing unit
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          units: [{ id: 'custom-1', chassis: 'Atlas', variant: 'AS7-X' }],
        }),
      } as Response);

      // Mock suggestCloneName
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          chassis: 'Atlas',
          variant: 'AS7-X',
          suggestedVariant: 'AS7-X-Custom-1',
        }),
      } as Response);

      const result = await service.create(unit, 'Atlas', 'AS7-X');

      expect(result.success).toBe(false);
      expect(result.requiresRename).toBe(true);
      expect(result.suggestedName).toBeDefined();
    });

    it('should handle API errors', async () => {
      const unit: IFullUnit = {
        id: 'temp',
        chassis: 'Atlas',
        variant: 'AS7-X',
        tonnage: 100,
      } as IFullUnit;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ units: [] }),
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Database error' }),
      } as Response);

      const result = await service.create(unit, 'Atlas', 'AS7-X');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('save', () => {
    it('should save an existing unit', async () => {
      const unit: IFullUnit = {
        id: 'custom-1',
        chassis: 'Atlas',
        variant: 'AS7-X',
        tonnage: 100,
      } as IFullUnit;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'custom-1', version: 2 }),
      } as Response);

      const result = await service.save('custom-1', unit);

      expect(result.success).toBe(true);
      expect(result.version).toBe(2);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/units/custom/custom-1',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });
  });

  describe('delete', () => {
    it('should delete a unit', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'custom-1' }),
      } as Response);

      const result = await service.delete('custom-1');

      expect(result.success).toBe(true);
      expect(result.id).toBe('custom-1');
    });

    it('should handle delete errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Not found' }),
      } as Response);

      const result = await service.delete('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not found');
    });
  });

  describe('isCanonical', () => {
    it('should check if unit is canonical', async () => {
      mockCanonicalUnitService.getIndex.mockResolvedValue([
        {
          id: 'canon-1',
          chassis: 'Atlas',
          variant: 'AS7-D',
        } as { id: string; chassis: string; variant: string },
      ]);

      const result = await service.isCanonical('Atlas', 'AS7-D');
      expect(result).toBe(true);

      const result2 = await service.isCanonical('Custom', 'Mech');
      expect(result2).toBe(false);
    });
  });

  describe('checkSaveAllowed', () => {
    it('should allow saving existing custom units', async () => {
      const unit: IFullUnit = {
        id: 'custom-1',
        chassis: 'Atlas',
        variant: 'AS7-X',
        tonnage: 100,
      } as IFullUnit;

      const result = await service.checkSaveAllowed(unit, 'custom-1');

      expect(result.success).toBe(true);
    });

    it('should block canonical units', async () => {
      const unit: IFullUnit = {
        id: 'canon-1',
        chassis: 'Atlas',
        variant: 'AS7-D',
        tonnage: 100,
      } as IFullUnit;

      mockCanonicalUnitService.getIndex.mockResolvedValue([
        {
          id: 'canon-1',
          chassis: 'Atlas',
          variant: 'AS7-D',
        } as { id: string; chassis: string; variant: string },
      ]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          chassis: 'Atlas',
          variant: 'AS7-D',
          suggestedVariant: 'AS7-D-Custom-1',
        }),
      } as Response);

      const result = await service.checkSaveAllowed(unit);

      expect(result.success).toBe(false);
      expect(result.requiresRename).toBe(true);
      expect(result.suggestedName).toBeDefined();
    });

    it('should allow new custom units', async () => {
      const unit: IFullUnit = {
        id: 'temp',
        chassis: 'Custom',
        variant: 'Mech',
        tonnage: 50,
      } as IFullUnit;

      mockCanonicalUnitService.getIndex.mockResolvedValue([]);

      const result = await service.checkSaveAllowed(unit);

      expect(result.success).toBe(true);
    });
  });

  describe('getVersionHistory', () => {
    it('should get version history', async () => {
      const mockVersions = [
        { version: 1, savedAt: '2024-01-01', notes: 'Initial' },
        { version: 2, savedAt: '2024-01-02', notes: 'Updated' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ versions: mockVersions }),
      } as Response);

      const result = await service.getVersionHistory('custom-1');

      expect(result).toEqual(mockVersions);
    });
  });

  describe('getVersion', () => {
    it('should get specific version', async () => {
      const mockVersion = {
        version: 2,
        savedAt: '2024-01-02',
        notes: 'Updated',
        revertSource: null,
        parsedData: { id: 'custom-1', chassis: 'Atlas', variant: 'AS7-X' },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockVersion,
      } as Response);

      const result = await service.getVersion('custom-1', 2);

      expect(result).toEqual({
        version: 2,
        savedAt: '2024-01-02',
        notes: 'Updated',
        revertSource: null,
        data: mockVersion.parsedData,
      });
    });

    it('should return null for 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      const result = await service.getVersion('custom-1', 999);

      expect(result).toBeNull();
    });
  });

  describe('revert', () => {
    it('should revert to previous version', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'custom-1', version: 3 }),
      } as Response);

      const result = await service.revert('custom-1', 2, 'Reverted to version 2');

      expect(result.success).toBe(true);
      expect(result.version).toBe(3);
    });
  });

  describe('exportUnit', () => {
    it('should export unit', async () => {
      const mockEnvelope = {
        unit: { id: 'custom-1', chassis: 'Atlas', variant: 'AS7-X' },
        metadata: { version: 1 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEnvelope,
      } as Response);

      const result = await service.exportUnit('custom-1');

      expect(result).toEqual(mockEnvelope);
    });

    it('should return null for 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      const result = await service.exportUnit('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('importUnit', () => {
    it('should import unit', async () => {
      const mockEnvelope = {
        unit: { id: 'temp', chassis: 'Atlas', variant: 'AS7-X' },
        metadata: { version: 1 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ unitId: 'custom-1' }),
      } as Response);

      const result = await service.importUnit(mockEnvelope);

      expect(result.success).toBe(true);
      expect(result.id).toBe('custom-1');
    });

    it('should handle conflicts', async () => {
      const mockEnvelope = {
        unit: { id: 'temp', chassis: 'Atlas', variant: 'AS7-D' },
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          error: 'Duplicate name',
          suggestedName: 'AS7-D-Custom-1',
        }),
      } as Response);

      const result = await service.importUnit(mockEnvelope);

      expect(result.success).toBe(false);
      expect(result.requiresRename).toBe(true);
      expect(result.suggestedName).toBeDefined();
    });
  });
});

