import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Tests for /api/units/custom endpoint
 */
import { createMocks } from 'node-mocks-http';

import {
  parseErrorResponse,
  parseApiResponse,
  parseUnitListResponse,
  createMock,
} from '@/__tests__/helpers';
import handler from '@/pages/api/units/custom';
import {
  getSQLiteService,
  SQLiteService,
} from '@/services/persistence/SQLiteService';
import {
  getUnitRepository,
  UnitRepository,
} from '@/services/units/UnitRepository';

// Mock dependencies
jest.mock('@/services/persistence/SQLiteService');
jest.mock('@/services/units/UnitRepository');

const mockSQLiteService = getSQLiteService as jest.MockedFunction<
  typeof getSQLiteService
>;
const mockGetUnitRepository = getUnitRepository as jest.MockedFunction<
  typeof getUnitRepository
>;

/**
 * Create response type
 */
interface CreateResponse {
  success: boolean;
  id?: string;
  version?: number;
  error?: string;
}

describe('/api/units/custom', () => {
  let mockUnitRepository: {
    list: jest.Mock;
    create: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUnitRepository = {
      list: jest.fn(),
      create: jest.fn(),
    };

    mockSQLiteService.mockReturnValue(
      createMock<SQLiteService>({
        initialize: jest.fn(),
        getDatabase: jest.fn(),
        close: jest.fn(),
        isInitialized: jest.fn().mockReturnValue(true),
      }),
    );

    mockGetUnitRepository.mockReturnValue(
      createMock<UnitRepository>(mockUnitRepository),
    );
  });

  describe('Method validation', () => {
    it('should reject unsupported methods', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PUT',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
      const data = parseErrorResponse(res);
      expect(data.error).toContain('Not Allowed');
    });
  });

  describe('GET /api/units/custom', () => {
    it('should list all custom units', async () => {
      const mockUnits = [
        {
          id: 'custom-1',
          chassis: 'Atlas',
          variant: 'AS7-X',
          tonnage: 100,
        },
        {
          id: 'custom-2',
          chassis: 'Marauder',
          variant: 'MAD-3R',
          tonnage: 75,
        },
      ];

      mockUnitRepository.list.mockReturnValue(mockUnits);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = parseUnitListResponse(res);
      expect(data.units).toEqual(mockUnits);
      expect(data.count).toBe(2);
    });

    it('should return empty array when no units exist', async () => {
      mockUnitRepository.list.mockReturnValue([]);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = parseUnitListResponse(res);
      expect(data.units).toEqual([]);
      expect(data.count).toBe(0);
    });

    it('should handle list errors', async () => {
      mockUnitRepository.list.mockImplementation(() => {
        throw new Error('Database error');
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = parseErrorResponse(res);
      expect(data.error).toBe('Database error');
    });
  });

  describe('POST /api/units/custom', () => {
    it('should create a new unit', async () => {
      const requestBody = {
        chassis: 'Atlas',
        variant: 'AS7-X',
        data: {
          id: 'temp',
          chassis: 'Atlas',
          variant: 'AS7-X',
          tonnage: 100,
        },
        notes: 'Custom variant',
      };

      mockUnitRepository.create.mockReturnValue({
        success: true,
        id: 'custom-1',
        version: 1,
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: requestBody,
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(201);
      const data = parseApiResponse<CreateResponse>(res);
      expect(data.success).toBe(true);
      expect(data.id).toBe('custom-1');
      expect(mockUnitRepository.create).toHaveBeenCalledWith(requestBody);
    });

    it('should reject missing chassis', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          variant: 'AS7-X',
          data: {},
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = parseErrorResponse(res);
      expect(data.error).toContain('Missing required fields');
    });

    it('should reject missing variant', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          chassis: 'Atlas',
          data: {},
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = parseErrorResponse(res);
      expect(data.error).toContain('Missing required fields');
    });

    it('should reject missing data', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          chassis: 'Atlas',
          variant: 'AS7-X',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = parseErrorResponse(res);
      expect(data.error).toContain('Missing required fields');
    });

    it('should handle creation failure', async () => {
      mockUnitRepository.create.mockReturnValue({
        success: false,
        error: 'Name conflict',
        errorCode: 'DUPLICATE_NAME',
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          chassis: 'Atlas',
          variant: 'AS7-D',
          data: { chassis: 'Atlas', variant: 'AS7-D' },
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = parseApiResponse<CreateResponse>(res);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Name conflict');
    });

    it('should handle creation errors', async () => {
      mockUnitRepository.create.mockImplementation(() => {
        throw new Error('Database error');
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          chassis: 'Atlas',
          variant: 'AS7-X',
          data: {},
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = parseErrorResponse(res);
      expect(data.error).toBe('Database error');
    });
  });

  describe('Database initialization', () => {
    it('should handle database initialization errors', async () => {
      mockSQLiteService.mockReturnValue(
        createMock<SQLiteService>({
          initialize: jest.fn(() => {
            throw new Error('Database init failed');
          }),
          getDatabase: jest.fn(),
          close: jest.fn(),
          isInitialized: jest.fn().mockReturnValue(false),
        }),
      );

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = parseErrorResponse(res);
      expect(data.error).toBe('Database init failed');
    });
  });
});
