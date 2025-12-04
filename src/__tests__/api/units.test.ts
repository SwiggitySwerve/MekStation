/**
 * Tests for /api/units endpoint
 */
import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/units';
import { canonicalUnitService } from '@/services/units/CanonicalUnitService';
import { TechBase } from '@/types/enums/TechBase';
import { Era } from '@/types/enums/Era';
import { WeightClass } from '@/types/enums/WeightClass';
import { parseSuccessResponse, parseErrorResponse } from '../helpers';

// Mock the canonical unit service
jest.mock('@/services/units/CanonicalUnitService', () => ({
  canonicalUnitService: {
    getById: jest.fn(),
    query: jest.fn(),
  },
}));

const mockGetById = canonicalUnitService.getById as jest.Mock;
const mockQuery = canonicalUnitService.query as jest.Mock;

describe('/api/units', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET method validation', () => {
    it('should reject non-GET requests', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
      const data = parseErrorResponse(res);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Method not allowed');
    });

    it('should reject PUT requests', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PUT',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
    });

    it('should reject DELETE requests', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'DELETE',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
    });
  });

  describe('GET by ID', () => {
    it('should return unit when found by ID', async () => {
      const mockUnit = {
        id: 'atlas-as7-d',
        name: 'Atlas AS7-D',
        tonnage: 100,
        techBase: TechBase.INNER_SPHERE,
      };
      mockGetById.mockResolvedValue(mockUnit);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { id: 'atlas-as7-d' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = parseSuccessResponse(res);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockUnit);
    });

    it('should return 404 when unit not found', async () => {
      mockGetById.mockResolvedValue(null);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { id: 'non-existent' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(404);
      const data = parseErrorResponse(res);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Unit not found');
    });
  });

  describe('GET with query parameters', () => {
    it('should query units without filters', async () => {
      const mockUnits = [
        { id: 'atlas-as7-d', name: 'Atlas AS7-D' },
        { id: 'locust-lct-1v', name: 'Locust LCT-1V' },
      ];
      mockQuery.mockResolvedValue(mockUnits);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {},
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = parseSuccessResponse(res);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockUnits);
      expect(data.count).toBe(2);
    });

    it('should filter by tech base', async () => {
      mockQuery.mockResolvedValue([]);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { techBase: TechBase.CLAN },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          techBase: TechBase.CLAN,
        })
      );
    });

    it('should filter by era', async () => {
      mockQuery.mockResolvedValue([]);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { era: Era.LATE_SUCCESSION_WARS },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          era: Era.LATE_SUCCESSION_WARS,
        })
      );
    });

    it('should filter by weight class', async () => {
      mockQuery.mockResolvedValue([]);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { weightClass: WeightClass.ASSAULT },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          weightClass: WeightClass.ASSAULT,
        })
      );
    });

    it('should filter by unit type', async () => {
      mockQuery.mockResolvedValue([]);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { unitType: 'BattleMech' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          unitType: 'BattleMech',
        })
      );
    });

    it('should filter by minTonnage', async () => {
      mockQuery.mockResolvedValue([]);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { minTonnage: '50' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          minTonnage: 50,
        })
      );
    });

    it('should filter by maxTonnage', async () => {
      mockQuery.mockResolvedValue([]);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { maxTonnage: '75' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          maxTonnage: 75,
        })
      );
    });

    it('should combine multiple filters', async () => {
      mockQuery.mockResolvedValue([]);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {
          techBase: TechBase.INNER_SPHERE,
          weightClass: WeightClass.HEAVY,
          minTonnage: '60',
          maxTonnage: '75',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(mockQuery).toHaveBeenCalledWith({
        techBase: TechBase.INNER_SPHERE,
        weightClass: WeightClass.HEAVY,
        minTonnage: 60,
        maxTonnage: 75,
      });
    });

    it('should ignore invalid techBase values', async () => {
      mockQuery.mockResolvedValue([]);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { techBase: 'INVALID_TECH' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(mockQuery).toHaveBeenCalledWith({});
    });

    it('should ignore invalid era values', async () => {
      mockQuery.mockResolvedValue([]);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { era: 'INVALID_ERA' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(mockQuery).toHaveBeenCalledWith({});
    });

    it('should ignore invalid weightClass values', async () => {
      mockQuery.mockResolvedValue([]);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { weightClass: 'INVALID_CLASS' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(mockQuery).toHaveBeenCalledWith({});
    });

    it('should ignore invalid unitType values', async () => {
      mockQuery.mockResolvedValue([]);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { unitType: 'InvalidType' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(mockQuery).toHaveBeenCalledWith({});
    });

    it('should handle invalid tonnage values', async () => {
      mockQuery.mockResolvedValue([]);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { minTonnage: 'not-a-number' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(mockQuery).toHaveBeenCalledWith({
        minTonnage: undefined,
      });
    });
  });

  describe('Error handling', () => {
    it('should return 500 on service error', async () => {
      mockQuery.mockRejectedValue(new Error('Database connection failed'));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {},
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = parseErrorResponse(res);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Database connection failed');
    });

    it('should handle non-Error exceptions', async () => {
      mockQuery.mockRejectedValue('Unknown error');

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {},
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = parseErrorResponse(res);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');
    });
  });
});
