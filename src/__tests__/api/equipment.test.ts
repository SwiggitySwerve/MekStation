import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Tests for /api/equipment endpoint
 */
import { createMocks } from 'node-mocks-http';

import handler from '@/pages/api/equipment';
import { equipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory } from '@/types/equipment';

import { parseSuccessResponse, parseErrorResponse } from '../helpers';

// Mock the equipment lookup service
jest.mock('@/services/equipment/EquipmentLookupService', () => ({
  equipmentLookupService: {
    getById: jest.fn(),
    query: jest.fn(),
  },
}));

const mockGetById = equipmentLookupService.getById as jest.Mock;
const mockQuery = equipmentLookupService.query as jest.Mock;

describe('/api/equipment', () => {
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
    it('should return equipment when found by ID', async () => {
      const mockEquipment = {
        id: 'medium-laser',
        name: 'Medium Laser',
        category: EquipmentCategory.ENERGY_WEAPON,
      };
      mockGetById.mockReturnValue(mockEquipment);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { id: 'medium-laser' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = parseSuccessResponse(res);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockEquipment);
    });

    it('should return 404 when equipment not found', async () => {
      mockGetById.mockReturnValue(null);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { id: 'non-existent' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(404);
      const data = parseErrorResponse(res);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Equipment not found');
    });
  });

  describe('GET with query parameters', () => {
    it('should query equipment without filters', async () => {
      const mockEquipment = [
        { id: 'medium-laser', name: 'Medium Laser' },
        { id: 'ppc', name: 'PPC' },
      ];
      mockQuery.mockReturnValue(mockEquipment);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {},
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = parseSuccessResponse(res);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockEquipment);
      expect(data.count).toBe(2);
    });

    it('should filter by category', async () => {
      mockQuery.mockReturnValue([]);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { category: EquipmentCategory.ENERGY_WEAPON },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          category: EquipmentCategory.ENERGY_WEAPON,
        }),
      );
    });

    it('should filter by tech base', async () => {
      mockQuery.mockReturnValue([]);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { techBase: TechBase.CLAN },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          techBase: TechBase.CLAN,
        }),
      );
    });

    it('should filter by rules level', async () => {
      mockQuery.mockReturnValue([]);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { rulesLevel: RulesLevel.STANDARD },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          rulesLevel: RulesLevel.STANDARD,
        }),
      );
    });

    it('should filter by year', async () => {
      mockQuery.mockReturnValue([]);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { year: '3025' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          year: 3025,
        }),
      );
    });

    it('should filter by search term', async () => {
      mockQuery.mockReturnValue([]);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { search: 'laser' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          nameQuery: 'laser',
        }),
      );
    });

    it('should filter by maxWeight', async () => {
      mockQuery.mockReturnValue([]);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { maxWeight: '5.5' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          maxWeight: 5.5,
        }),
      );
    });

    it('should filter by maxSlots', async () => {
      mockQuery.mockReturnValue([]);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { maxSlots: '3' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          maxSlots: 3,
        }),
      );
    });

    it('should combine multiple filters', async () => {
      mockQuery.mockReturnValue([]);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {
          category: EquipmentCategory.BALLISTIC_WEAPON,
          techBase: TechBase.INNER_SPHERE,
          year: '3050',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(mockQuery).toHaveBeenCalledWith({
        category: EquipmentCategory.BALLISTIC_WEAPON,
        techBase: TechBase.INNER_SPHERE,
        year: 3050,
      });
    });

    it('should ignore invalid category values', async () => {
      mockQuery.mockReturnValue([]);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { category: 'INVALID_CATEGORY' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(mockQuery).toHaveBeenCalledWith({});
    });

    it('should ignore invalid techBase values', async () => {
      mockQuery.mockReturnValue([]);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { techBase: 'INVALID_TECH' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(mockQuery).toHaveBeenCalledWith({});
    });

    it('should ignore invalid rulesLevel values', async () => {
      mockQuery.mockReturnValue([]);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { rulesLevel: 'INVALID_LEVEL' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(mockQuery).toHaveBeenCalledWith({});
    });

    it('should handle invalid year values', async () => {
      mockQuery.mockReturnValue([]);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { year: 'not-a-number' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(mockQuery).toHaveBeenCalledWith({
        year: undefined,
      });
    });
  });

  describe('Error handling', () => {
    it('should return 500 on service error', async () => {
      mockQuery.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

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
      mockQuery.mockImplementation(() => {
        throw 'Unknown error';
      });

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
