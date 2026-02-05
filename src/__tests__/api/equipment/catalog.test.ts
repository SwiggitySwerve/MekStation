import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Tests for /api/equipment/catalog endpoint
 */
import { createMocks } from 'node-mocks-http';

import handler from '@/pages/api/equipment/catalog';

import { parseSuccessResponse, parseErrorResponse } from '../../helpers';

// Mock the equipment lookup service
jest.mock('@/services/equipment/EquipmentLookupService', () => ({
  equipmentLookupService: {
    initialize: jest.fn().mockResolvedValue(undefined),
    getAllEquipment: jest.fn(),
    getAllWeapons: jest.fn(),
    getAllAmmunition: jest.fn(),
    getDataSource: jest.fn().mockReturnValue('json'),
  },
}));

// Type for the mocked service
interface MockEquipmentLookupService {
  initialize: jest.Mock;
  getAllEquipment: jest.Mock;
  getAllWeapons: jest.Mock;
  getAllAmmunition: jest.Mock;
  getDataSource: jest.Mock;
}

// Import after mocking to get mock references
// oxlint-disable-next-line @typescript-eslint/no-require-imports
const { equipmentLookupService } =
  require('@/services/equipment/EquipmentLookupService') as {
    equipmentLookupService: MockEquipmentLookupService;
  };

const mockGetAllEquipment = equipmentLookupService.getAllEquipment;
const mockGetAllWeapons = equipmentLookupService.getAllWeapons;
const mockGetAllAmmunition = equipmentLookupService.getAllAmmunition;

describe('/api/equipment/catalog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-setup initialize mock after clearing
    equipmentLookupService.initialize.mockResolvedValue(undefined);
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
  });

  describe('GET all equipment', () => {
    it('should return all equipment when no type specified', async () => {
      const mockEquipment = [
        { id: 'medium-laser', name: 'Medium Laser', category: 'weapon' },
        { id: 'srm-ammo', name: 'SRM Ammo', category: 'ammunition' },
        { id: 'heat-sink', name: 'Heat Sink', category: 'equipment' },
      ];
      mockGetAllEquipment.mockReturnValue(mockEquipment);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {},
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = parseSuccessResponse(res);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockEquipment);
      expect(data.count).toBe(3);
      expect(mockGetAllEquipment).toHaveBeenCalled();
    });
  });

  describe('GET weapons only', () => {
    it('should return only weapons when type=weapons', async () => {
      const mockWeapons = [
        { id: 'medium-laser', name: 'Medium Laser' },
        { id: 'ppc', name: 'PPC' },
      ];
      mockGetAllWeapons.mockReturnValue(mockWeapons);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { type: 'weapons' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = parseSuccessResponse(res);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockWeapons);
      expect(data.count).toBe(2);
      expect(mockGetAllWeapons).toHaveBeenCalled();
      expect(mockGetAllEquipment).not.toHaveBeenCalled();
    });
  });

  describe('GET ammunition only', () => {
    it('should return only ammunition when type=ammunition', async () => {
      const mockAmmunition = [
        { id: 'srm-ammo', name: 'SRM Ammo' },
        { id: 'lrm-ammo', name: 'LRM Ammo' },
      ];
      mockGetAllAmmunition.mockReturnValue(mockAmmunition);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { type: 'ammunition' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = parseSuccessResponse(res);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockAmmunition);
      expect(data.count).toBe(2);
      expect(mockGetAllAmmunition).toHaveBeenCalled();
      expect(mockGetAllEquipment).not.toHaveBeenCalled();
    });
  });

  describe('Search filtering', () => {
    it('should filter by search term', async () => {
      const mockEquipment = [
        { id: 'medium-laser', name: 'Medium Laser' },
        { id: 'large-laser', name: 'Large Laser' },
        { id: 'ppc', name: 'PPC' },
      ];
      mockGetAllEquipment.mockReturnValue(mockEquipment);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { search: 'laser' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = parseSuccessResponse<Array<{ id: string; name: string }>>(
        res,
      );
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.data).toEqual([
        { id: 'medium-laser', name: 'Medium Laser' },
        { id: 'large-laser', name: 'Large Laser' },
      ]);
      expect(data.count).toBe(2);
    });

    it('should be case-insensitive in search', async () => {
      const mockEquipment = [
        { id: 'medium-laser', name: 'Medium Laser' },
        { id: 'ppc', name: 'PPC' },
      ];
      mockGetAllEquipment.mockReturnValue(mockEquipment);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { search: 'LASER' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = parseSuccessResponse<Array<{ id: string; name: string }>>(
        res,
      );
      expect(data.data).toHaveLength(1);
      expect(data.data?.[0].name).toBe('Medium Laser');
    });

    it('should return empty array when no matches found', async () => {
      const mockEquipment = [{ id: 'medium-laser', name: 'Medium Laser' }];
      mockGetAllEquipment.mockReturnValue(mockEquipment);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { search: 'gauss' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = parseSuccessResponse(res);
      expect(data.data).toHaveLength(0);
      expect(data.count).toBe(0);
    });

    it('should combine type and search filters', async () => {
      const mockWeapons = [
        { id: 'medium-laser', name: 'Medium Laser' },
        { id: 'large-laser', name: 'Large Laser' },
        { id: 'ppc', name: 'PPC' },
      ];
      mockGetAllWeapons.mockReturnValue(mockWeapons);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { type: 'weapons', search: 'laser' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = parseSuccessResponse(res);
      expect(data.data).toHaveLength(2);
      expect(mockGetAllWeapons).toHaveBeenCalled();
    });

    it('should handle items without name property', async () => {
      const mockEquipment = [
        { id: 'medium-laser', name: 'Medium Laser' },
        { id: 'no-name' }, // No name property
      ];
      mockGetAllEquipment.mockReturnValue(mockEquipment);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { search: 'laser' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = parseSuccessResponse<Array<{ id: string; name?: string }>>(
        res,
      );
      expect(data.data).toHaveLength(1);
      expect(data.data?.[0].id).toBe('medium-laser');
    });
  });

  describe('Error handling', () => {
    it('should return 500 on service error', async () => {
      mockGetAllEquipment.mockImplementation(() => {
        throw new Error('Service unavailable');
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {},
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = parseErrorResponse(res);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Service unavailable');
    });

    it('should handle non-Error exceptions', async () => {
      mockGetAllEquipment.mockImplementation(() => {
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
