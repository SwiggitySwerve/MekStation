import { FileService } from '@/services/persistence/FileService';

describe('FileService', () => {
  let service: FileService;
  let mockCreateElement: jest.SpyInstance;
  let mockCreateObjectURL: jest.SpyInstance;
  let mockRevokeObjectURL: jest.SpyInstance;
  let mockClick: jest.Mock;

  beforeEach(() => {
    service = new FileService();

    // Mock DOM APIs
    mockClick = jest.fn();
    // Create mock anchor with minimal properties needed for testing
    const mockAnchor: Partial<HTMLAnchorElement> = {
      href: '',
      download: '',
      click: mockClick,
    };
    const mockAnchorElement = mockAnchor as HTMLAnchorElement;

    mockCreateElement = jest
      .spyOn(document, 'createElement')
      .mockReturnValue(
        mockAnchorElement as unknown as ReturnType<
          typeof document.createElement
        >,
      );
    jest
      .spyOn(document.body, 'appendChild')
      .mockImplementation(() => mockAnchorElement);
    jest
      .spyOn(document.body, 'removeChild')
      .mockImplementation(() => mockAnchorElement);

    // Mock URL methods
    const urlMock = {
      createObjectURL: jest.fn().mockReturnValue('blob:mock-url'),
      revokeObjectURL: jest.fn(),
    };
    global.URL.createObjectURL = urlMock.createObjectURL;
    global.URL.revokeObjectURL = urlMock.revokeObjectURL;
    mockCreateObjectURL = urlMock.createObjectURL;
    mockRevokeObjectURL = urlMock.revokeObjectURL;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('exportUnit', () => {
    it('should export unit with generated filename', () => {
      const unit = {
        chassis: 'Atlas',
        variant: 'AS7-D',
        tonnage: 100,
      };

      service.exportUnit(unit);

      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });

    it('should use custom filename when provided', () => {
      const unit = { chassis: 'Atlas', variant: 'AS7-D' };
      const customFilename = 'custom-name.json';

      service.exportUnit(unit, customFilename);

      const anchor = mockCreateElement.mock.results[0].value as {
        download: string;
      };
      expect(anchor.download).toBe(customFilename);
    });

    it('should generate safe filename from unit data', () => {
      const unit = {
        chassis: 'Atlas AS7',
        variant: 'D-Variant',
        tonnage: 100,
      };

      service.exportUnit(unit);

      const anchor = mockCreateElement.mock.results[0].value as {
        download: string;
        href: string;
      };
      expect(anchor.download).toMatch(/^atlas-as7-d-variant\.json$/);
    });

    it('should handle units without chassis or variant', () => {
      const unit = { tonnage: 100 };

      service.exportUnit(unit);

      const anchor = mockCreateElement.mock.results[0].value as {
        download: string;
        href: string;
      };
      expect(anchor.download).toMatch(/^unknown-variant\.json$/);
    });
  });

  describe('exportBatch', () => {
    it('should export multiple units as JSON array', async () => {
      const units = [
        { id: '1', chassis: 'Atlas', variant: 'AS7-D' },
        { id: '2', chassis: 'Marauder', variant: 'MAD-3R' },
      ];

      await service.exportBatch(units);

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
    });

    it('should use default filename for batch export', async () => {
      const units = [{ id: '1' }];

      await service.exportBatch(units);

      const anchor = mockCreateElement.mock.results[0].value as {
        download: string;
        href: string;
      };
      expect(anchor.download).toBe('units-export.json');
    });

    it('should use custom filename for batch export', async () => {
      const units = [{ id: '1' }];
      const customFilename = 'my-units.json';

      await service.exportBatch(units, customFilename);

      const anchor = mockCreateElement.mock.results[0].value as {
        download: string;
        href: string;
      };
      expect(anchor.download).toBe(customFilename);
    });
  });

  describe('importUnit', () => {
    it('should successfully import valid unit file', async () => {
      const unitData = {
        id: 'unit-1',
        chassis: 'Atlas',
        variant: 'AS7-D',
        tonnage: 100,
      };
      const file = new File([JSON.stringify(unitData)], 'atlas.json', {
        type: 'application/json',
      });

      const result = await service.importUnit(file);

      expect(result.success).toBe(true);
      expect(result.filename).toBe('atlas.json');
      expect(result.unit).toEqual(unitData);
      expect(result.errors).toBeUndefined();
    });

    it('should reject invalid JSON', async () => {
      const file = new File(['invalid json'], 'test.json', {
        type: 'application/json',
      });

      const result = await service.importUnit(file);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid JSON in test.json');
    });

    it('should reject unit without id or chassis', async () => {
      const unitData = { tonnage: 100 };
      const file = new File([JSON.stringify(unitData)], 'test.json', {
        type: 'application/json',
      });

      const result = await service.importUnit(file);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Unit must have an id or chassis field');
    });

    it('should reject unit with invalid tonnage type', async () => {
      const unitData = {
        id: 'unit-1',
        tonnage: '100', // string instead of number
      };
      const file = new File([JSON.stringify(unitData)], 'test.json', {
        type: 'application/json',
      });

      const result = await service.importUnit(file);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Tonnage must be a number');
    });

    it('should handle file read errors', async () => {
      const file = new File([''], 'test.json', { type: 'application/json' });

      // Mock FileReader to fail using a class definition
      const originalFileReader = global.FileReader;
      class MockFileReaderError {
        onerror: ((err: ProgressEvent<FileReader>) => void) | null = null;
        readAsText(): void {
          setTimeout(() => {
            const event = new ProgressEvent(
              'error',
            ) as ProgressEvent<FileReader>;
            this.onerror?.(event);
          }, 0);
        }
      }
      // @ts-expect-error - Mocking FileReader class for error testing
      global.FileReader = MockFileReaderError;

      const result = await service.importUnit(file);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();

      global.FileReader = originalFileReader;
    });
  });

  describe('importBatch', () => {
    it('should import multiple files', async () => {
      const unit1 = { id: '1', chassis: 'Atlas', variant: 'AS7-D' };
      const unit2 = { id: '2', chassis: 'Marauder', variant: 'MAD-3R' };

      const files = [
        new File([JSON.stringify(unit1)], 'atlas.json', {
          type: 'application/json',
        }),
        new File([JSON.stringify(unit2)], 'marauder.json', {
          type: 'application/json',
        }),
      ];

      const results = await service.importBatch(files);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    it('should handle mixed success and failure', async () => {
      const validUnit = { id: '1', chassis: 'Atlas', variant: 'AS7-D' };
      const invalidUnit = { tonnage: 100 }; // missing id/chassis

      const files = [
        new File([JSON.stringify(validUnit)], 'valid.json', {
          type: 'application/json',
        }),
        new File([JSON.stringify(invalidUnit)], 'invalid.json', {
          type: 'application/json',
        }),
      ];

      const results = await service.importBatch(files);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
    });
  });

  describe('validateFile', () => {
    it('should validate valid unit file', async () => {
      const unitData = {
        id: 'unit-1',
        chassis: 'Atlas',
        variant: 'AS7-D',
        tonnage: 100,
      };
      const file = new File([JSON.stringify(unitData)], 'atlas.json', {
        type: 'application/json',
      });

      const result = await service.validateFile(file);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject non-JSON files', async () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });

      const result = await service.validateFile(file);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INVALID_EXTENSION',
          message: 'File must have .json extension',
        }),
      );
    });

    it('should reject files that are too large', async () => {
      const largeContent = 'x'.repeat(11 * 1024 * 1024); // 11MB
      const file = new File([largeContent], 'large.json', {
        type: 'application/json',
      });

      const result = await service.validateFile(file);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'FILE_TOO_LARGE',
          message: 'File exceeds maximum size of 10MB',
        }),
      );
    });

    it('should reject invalid JSON', async () => {
      const file = new File(['invalid json'], 'test.json', {
        type: 'application/json',
      });

      const result = await service.validateFile(file);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INVALID_JSON',
        }),
      );
    });

    it('should reject non-object JSON', async () => {
      const file = new File(['"string"'], 'test.json', {
        type: 'application/json',
      });

      const result = await service.validateFile(file);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INVALID_STRUCTURE',
          message: 'File must contain a JSON object',
        }),
      );
    });

    it('should reject null JSON', async () => {
      const file = new File(['null'], 'test.json', {
        type: 'application/json',
      });

      const result = await service.validateFile(file);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INVALID_STRUCTURE',
        }),
      );
    });

    it('should handle file read errors', async () => {
      const file = new File([''], 'test.json', { type: 'application/json' });

      // Mock FileReader to fail using a class definition
      const originalFileReader = global.FileReader;
      class MockFileReaderValidateError {
        onerror: ((err: ProgressEvent<FileReader>) => void) | null = null;
        readAsText(): void {
          setTimeout(() => {
            const event = new ProgressEvent(
              'error',
            ) as ProgressEvent<FileReader>;
            this.onerror?.(event);
          }, 0);
        }
      }
      // @ts-expect-error - Mocking FileReader class for error testing
      global.FileReader = MockFileReaderValidateError;

      const result = await service.validateFile(file);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'READ_ERROR',
        }),
      );

      global.FileReader = originalFileReader;
    });
  });
});
