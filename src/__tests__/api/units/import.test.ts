/**
 * Tests for /api/units/import endpoint
 */
import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/units/import';
import { getSQLiteService, SQLiteService } from '@/services/persistence/SQLiteService';
import { getUnitRepository, UnitRepository } from '@/services/units/UnitRepository';
import { parseErrorResponse, parseImportResponse, parseApiResponse, createMock } from '../../helpers';

// Mock dependencies
jest.mock('@/services/persistence/SQLiteService');
jest.mock('@/services/units/UnitRepository');

const mockSQLiteService = getSQLiteService as jest.MockedFunction<typeof getSQLiteService>;
const mockGetUnitRepository = getUnitRepository as jest.MockedFunction<typeof getUnitRepository>;

/**
 * Extended import response with suggested name
 */
interface ImportConflictResponse {
  success: boolean;
  error?: { message: string; suggestedName?: string };
}

describe('/api/units/import', () => {
  let mockUnitRepository: {
    nameExists: jest.Mock;
    suggestCloneName: jest.Mock;
    create: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUnitRepository = {
      nameExists: jest.fn(),
      suggestCloneName: jest.fn(),
      create: jest.fn(),
    };
    
    mockSQLiteService.mockReturnValue(createMock<SQLiteService>({
      initialize: jest.fn(),
      getDatabase: jest.fn(),
      close: jest.fn(),
      isInitialized: jest.fn().mockReturnValue(true),
    }));
    
    mockGetUnitRepository.mockReturnValue(createMock<UnitRepository>(mockUnitRepository));
  });

  describe('Method validation', () => {
    it('should reject non-POST requests', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
      const data = parseErrorResponse(res);
      expect(data.error).toContain('Not Allowed');
    });
  });

  describe('Request validation', () => {
    it('should reject missing request body', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
      });
      // Explicitly set body to null using proper type narrowing
      // NextApiRequest body can be set to null directly
      req.body = null;

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = parseErrorResponse(res);
      expect(data.error).toBe('Missing request body');
    });

    it('should reject missing chassis', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          variant: 'AS7-D',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = parseImportResponse(res);
      expect(data.success).toBe(false);
      expect(data.error?.validationErrors).toContain('Missing or invalid field: chassis');
    });

    it('should reject missing variant and model', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          chassis: 'Atlas',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = parseImportResponse(res);
      expect(data.error?.validationErrors).toContain('Missing field: variant or model');
    });

    it('should accept variant field', async () => {
      mockUnitRepository.nameExists.mockReturnValue(false);
      mockUnitRepository.create.mockReturnValue({
        success: true,
        data: { id: 'custom-1' },
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          chassis: 'Atlas',
          variant: 'AS7-D',
          tonnage: 100,
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(201);
      const data = parseImportResponse(res);
      expect(data.success).toBe(true);
    });

    it('should accept model field', async () => {
      mockUnitRepository.nameExists.mockReturnValue(false);
      mockUnitRepository.create.mockReturnValue({
        success: true,
        data: { id: 'custom-1' },
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          chassis: 'Atlas',
          model: 'AS7-D',
          tonnage: 100,
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(201);
    });
  });

  describe('Envelope format', () => {
    it('should handle envelope format with formatVersion', async () => {
      mockUnitRepository.nameExists.mockReturnValue(false);
      mockUnitRepository.create.mockReturnValue({
        success: true,
        data: { id: 'custom-1' },
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          formatVersion: '1.0.0',
          unit: {
            chassis: 'Atlas',
            variant: 'AS7-D',
            tonnage: 100,
          },
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(201);
      expect(mockUnitRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          chassis: 'Atlas',
          variant: 'AS7-D',
        })
      );
    });

    it('should reject unsupported format version', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          formatVersion: '2.0.0',
          unit: {
            chassis: 'Atlas',
            variant: 'AS7-D',
          },
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = parseImportResponse(res);
      expect(data.success).toBe(false);
      expect(data.error?.message).toContain('Unsupported format version');
    });
  });

  describe('Name conflict handling', () => {
    it('should reject duplicate names', async () => {
      mockUnitRepository.nameExists.mockReturnValue(true);
      mockUnitRepository.suggestCloneName.mockReturnValue({
        chassis: 'Atlas',
        suggestedVariant: 'AS7-D-Custom-1',
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          chassis: 'Atlas',
          variant: 'AS7-D',
          tonnage: 100,
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(409);
      const data = parseApiResponse<ImportConflictResponse>(res);
      expect(data.success).toBe(false);
      expect(data.error?.message).toContain('already exists');
      expect(data.error?.suggestedName).toBeDefined();
    });
  });

  describe('Unit creation', () => {
    it('should create unit successfully', async () => {
      mockUnitRepository.nameExists.mockReturnValue(false);
      mockUnitRepository.create.mockReturnValue({
        success: true,
        data: { id: 'custom-1' },
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          chassis: 'Atlas',
          variant: 'AS7-D',
          tonnage: 100,
          techBase: 'Inner Sphere',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(201);
      const data = parseImportResponse(res);
      expect(data.success).toBe(true);
      expect(data.data?.unitId).toBe('custom-1');
      expect(mockUnitRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          chassis: 'Atlas',
          variant: 'AS7-D',
          notes: 'Imported from JSON file',
        })
      );
    });

    it('should handle creation failure', async () => {
      mockUnitRepository.nameExists.mockReturnValue(false);
      mockUnitRepository.create.mockReturnValue({
        success: false,
        error: { message: 'Database error' },
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          chassis: 'Atlas',
          variant: 'AS7-D',
          tonnage: 100,
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = parseImportResponse(res);
      expect(data.success).toBe(false);
      expect(data.error?.message).toBe('Database error');
    });
  });

  describe('Error handling', () => {
    it('should handle database initialization errors', async () => {
      mockSQLiteService.mockReturnValue(createMock<SQLiteService>({
        initialize: jest.fn(() => {
          throw new Error('Database init failed');
        }),
        getDatabase: jest.fn(),
        close: jest.fn(),
        isInitialized: jest.fn().mockReturnValue(false),
      }));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          chassis: 'Atlas',
          variant: 'AS7-D',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = parseErrorResponse(res);
      expect(data.error).toBe('Database init failed');
    });

    it('should handle unexpected errors', async () => {
      mockUnitRepository.nameExists.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          chassis: 'Atlas',
          variant: 'AS7-D',
          tonnage: 100,
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = parseErrorResponse(res);
      expect(data.error).toBe('Unexpected error');
    });
  });
});
