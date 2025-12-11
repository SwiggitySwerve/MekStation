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

  afterEach(() => {
    jest.restoreAllMocks();
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
        json: async () => ({ success: true, data: mockUnit }),
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

  describe('suggestCloneName', () => {
    it('should fall back when API suggestion fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Server error',
        json: async () => ({}),
      } as Response);

      const suggestion = await service.suggestCloneName('Atlas', 'AS7-D');

      expect(suggestion).toEqual({
        chassis: 'Atlas',
        variant: 'AS7-D',
        suggestedVariant: 'AS7-D-Custom-1',
      });
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

  describe('save error handling', () => {
    it('should surface save API errors', async () => {
      const unit: IFullUnit = {
        id: 'custom-1',
        chassis: 'Atlas',
        variant: 'AS7-X',
        tonnage: 100,
      } as IFullUnit;

      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
        json: async () => ({ error: 'Validation failed' }),
      } as Response);

      const result = await service.save('custom-1', unit);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Validation failed');
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

    it('should throw on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Server failure',
      } as Response);

      await expect(service.getVersionHistory('custom-1')).rejects.toThrow(
        'Failed to get version history: Server failure'
      );
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

    it('should throw on non-404 error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Boom',
      } as Response);

      await expect(service.getVersion('custom-1', 3)).rejects.toThrow(
        'Failed to get version: Boom'
      );
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

    it('should return failure details when revert is rejected', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Forbidden' }),
      } as Response);

      const result = await service.revert('custom-1', 2);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Forbidden');
      expect(result.version).toBeUndefined();
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

    it('should throw on export failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Down',
      } as Response);

      await expect(service.exportUnit('custom-1')).rejects.toThrow(
        'Failed to export unit: Down'
      );
    });
  });

  describe('downloadUnit', () => {
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;

    const ensureBlobHelpers = (): void => {
      if (typeof URL.createObjectURL !== 'function') {
        Object.defineProperty(URL, 'createObjectURL', {
          configurable: true,
          writable: true,
          value: () => 'blob:default',
        });
      }
      if (typeof URL.revokeObjectURL !== 'function') {
        Object.defineProperty(URL, 'revokeObjectURL', {
          configurable: true,
          writable: true,
          value: () => undefined,
        });
      }
    };

    afterEach(() => {
      Object.defineProperty(URL, 'createObjectURL', {
        configurable: true,
        writable: true,
        value: originalCreateObjectURL,
      });
      Object.defineProperty(URL, 'revokeObjectURL', {
        configurable: true,
        writable: true,
        value: originalRevokeObjectURL,
      });
    });

    it('should download exported unit with sanitized filename', async () => {
      const mockEnvelope = {
        unit: { id: 'custom-1', chassis: 'Atlas', variant: 'AS7 D' },
        metadata: { version: 1 },
      };

      ensureBlobHelpers();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEnvelope,
      } as Response);

      const createObjectURLSpy = jest
        .spyOn(URL, 'createObjectURL')
        .mockReturnValue('blob:mock');
      const revokeObjectURLSpy = jest.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
      const clickSpy = jest
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(() => undefined);
      let appendedNode: Node | null = null;
      const appendSpy = jest
        .spyOn(document.body, 'appendChild')
        .mockImplementation((node: Node) => {
          appendedNode = node;
          return node;
        });
      const removeSpy = jest
        .spyOn(document.body, 'removeChild')
        .mockImplementation((node: Node) => node);

      await service.downloadUnit('custom-1');

      expect(mockFetch).toHaveBeenCalledWith('/api/units/custom/custom-1/export');
      expect(createObjectURLSpy).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      expect(appendSpy).toHaveBeenCalled();
      expect(removeSpy).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalled();
      const anchor = appendedNode as HTMLAnchorElement;
      expect(anchor.download).toBe('Atlas-AS7-D.json');
    });

    it('should throw when export returns null', async () => {
      ensureBlobHelpers();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({}),
      } as Response);

      await expect(service.downloadUnit('missing')).rejects.toThrow('Unit not found');
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

    it('should return error details for non-conflict failures', async () => {
      const mockEnvelope = {
        unit: { id: 'temp', chassis: 'Atlas', variant: 'AS7-D' },
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Invalid payload',
        }),
      } as Response);

      const result = await service.importUnit(mockEnvelope);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid payload');
      expect(result.requiresRename).toBe(false);
      expect(result.suggestedName).toBeUndefined();
    });
  });
});

