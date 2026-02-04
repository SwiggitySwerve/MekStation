/**
 * Tests for /api/units/custom/[id] endpoint
 */
import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/units/custom/[id]';
import { getSQLiteService, SQLiteService } from '@/services/persistence/SQLiteService';
import { getUnitRepository, UnitRepository } from '@/services/units/UnitRepository';
import { parseErrorResponse, parseApiResponse, parseUnitResponse, createMock } from '../../../helpers';

// Mock dependencies
jest.mock('@/services/persistence/SQLiteService');
jest.mock('@/services/units/UnitRepository');

const mockSQLiteService = getSQLiteService as jest.MockedFunction<typeof getSQLiteService>;
const mockGetUnitRepository = getUnitRepository as jest.MockedFunction<typeof getUnitRepository>;

interface UpdateResponse {
  success: boolean;
  data?: { id: string; version?: number };
  error?: { message: string; errorCode?: string };
}

interface DeleteResponse {
  success: boolean;
  data?: { id: string };
  error?: { message: string; errorCode?: string };
}

describe('/api/units/custom/[id]', () => {
  let mockUnitRepository: {
    getById: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUnitRepository = {
      getById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    
    mockSQLiteService.mockReturnValue(createMock<SQLiteService>({
      initialize: jest.fn(),
      getDatabase: jest.fn(),
      close: jest.fn(),
      isInitialized: jest.fn().mockReturnValue(true),
    }));
    
    mockGetUnitRepository.mockReturnValue(createMock<UnitRepository>(mockUnitRepository));
  });

  describe('ID validation', () => {
    it('should reject missing ID', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {},
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = parseErrorResponse(res);
      expect(data.error).toBe('Missing unit ID');
    });

    it('should reject non-string ID', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { id: ['array', 'id'] },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
    });
  });

  describe('GET /api/units/custom/[id]', () => {
    it('should get unit by ID', async () => {
      const mockUnit = {
        id: 'custom-1',
        chassis: 'Atlas',
        variant: 'AS7-X',
        data: JSON.stringify({ id: 'custom-1', chassis: 'Atlas', variant: 'AS7-X', tonnage: 100 }),
        currentVersion: 1,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
      };

      mockUnitRepository.getById.mockReturnValue(mockUnit);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { id: 'custom-1' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = parseUnitResponse(res);
      expect(data.id).toBe('custom-1');
      expect(data.chassis).toBe('Atlas');
      expect(data.parsedData).toEqual({ id: 'custom-1', chassis: 'Atlas', variant: 'AS7-X', tonnage: 100 });
    });

    it('should return 404 when unit not found', async () => {
      mockUnitRepository.getById.mockReturnValue(null);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { id: 'non-existent' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(404);
      const data = parseErrorResponse(res);
      expect(data.error).toContain('not found');
    });

    it('should handle JSON parse errors', async () => {
      const mockUnit = {
        id: 'custom-1',
        chassis: 'Atlas',
        variant: 'AS7-X',
        data: 'invalid json',
        currentVersion: 1,
      };

      mockUnitRepository.getById.mockReturnValue(mockUnit);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { id: 'custom-1' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = parseErrorResponse(res);
      expect(data.error).toBeDefined();
    });
  });

  describe('PUT /api/units/custom/[id]', () => {
    it('should update unit', async () => {
      const requestBody = {
        data: {
          id: 'custom-1',
          chassis: 'Atlas',
          variant: 'AS7-X',
          tonnage: 100,
        },
        notes: 'Updated variant',
      };

      mockUnitRepository.update.mockReturnValue({
        success: true,
        data: { id: 'custom-1', version: 2 },
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PUT',
        query: { id: 'custom-1' },
        body: requestBody,
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = parseApiResponse<UpdateResponse>(res);
      expect(data.success).toBe(true);
      expect(data.data?.version).toBe(2);
      expect(mockUnitRepository.update).toHaveBeenCalledWith('custom-1', requestBody);
    });

    it('should reject missing data field', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PUT',
        query: { id: 'custom-1' },
        body: {
          notes: 'Update',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = parseErrorResponse(res);
      expect(data.error).toContain('Missing required field: data');
    });

    it('should return 404 for not found errors', async () => {
      mockUnitRepository.update.mockReturnValue({
        success: false,
        error: { message: 'Unit not found', errorCode: 'NOT_FOUND' },
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PUT',
        query: { id: 'non-existent' },
        body: {
          data: {},
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(404);
    });

    it('should handle update errors', async () => {
      mockUnitRepository.update.mockImplementation(() => {
        throw new Error('Database error');
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PUT',
        query: { id: 'custom-1' },
        body: {
          data: {},
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = parseErrorResponse(res);
      expect(data.error).toBe('Database error');
    });
  });

  describe('DELETE /api/units/custom/[id]', () => {
    it('should delete unit', async () => {
      mockUnitRepository.delete.mockReturnValue({
        success: true,
        data: { id: 'custom-1' },
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'DELETE',
        query: { id: 'custom-1' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = parseApiResponse<DeleteResponse>(res);
      expect(data.success).toBe(true);
      expect(data.data?.id).toBe('custom-1');
      expect(mockUnitRepository.delete).toHaveBeenCalledWith('custom-1');
    });

    it('should handle delete failure', async () => {
      mockUnitRepository.delete.mockReturnValue({
        success: false,
        error: { message: 'Delete failed' },
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'DELETE',
        query: { id: 'custom-1' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = parseApiResponse<DeleteResponse>(res);
      expect(data.success).toBe(false);
    });

    it('should handle delete errors', async () => {
      mockUnitRepository.delete.mockImplementation(() => {
        throw new Error('Database error');
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'DELETE',
        query: { id: 'custom-1' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = parseErrorResponse(res);
      expect(data.error).toBe('Database error');
    });
  });

  describe('Method validation', () => {
    it('should reject unsupported methods', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PATCH',
        query: { id: 'custom-1' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
      const data = parseErrorResponse(res);
      expect(data.error).toContain('Not Allowed');
    });
  });

  describe('Database initialization', () => {
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
        method: 'GET',
        query: { id: 'custom-1' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = parseErrorResponse(res);
      expect(data.error).toBe('Database init failed');
    });
  });
});
