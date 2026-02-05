import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Tests for /api/catalog endpoint
 */
import { createMocks } from 'node-mocks-http';

import type { IUnitMetadata } from '@/types/unit/BattleMechInterfaces';

import handler from '@/pages/api/catalog';
import { canonicalUnitService } from '@/services/units/CanonicalUnitService';

interface ApiResponse {
  success: boolean;
  data?: IUnitMetadata[];
  error?: string;
  count?: number;
}

// Mock the canonical unit service
jest.mock('@/services/units/CanonicalUnitService', () => ({
  canonicalUnitService: {
    getIndex: jest.fn(),
  },
}));

const mockGetIndex = canonicalUnitService.getIndex as jest.Mock;

describe('/api/catalog', () => {
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
      const data = JSON.parse(res._getData() as string) as {
        success: boolean;
        error: string;
      };
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

  describe('GET full catalog', () => {
    it('should return full unit index', async () => {
      const mockIndex = [
        { id: '1', name: 'Atlas AS7-D', chassis: 'Atlas', variant: 'AS7-D' },
        {
          id: '2',
          name: 'Locust LCT-1V',
          chassis: 'Locust',
          variant: 'LCT-1V',
        },
      ];
      mockGetIndex.mockResolvedValue(mockIndex);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {},
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData() as string) as {
        success: boolean;
        data: unknown[];
        count: number;
      };
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockIndex);
      expect(data.count).toBe(2);
    });
  });

  describe('GET with search', () => {
    it('should filter by name', async () => {
      const mockIndex = [
        { id: '1', name: 'Atlas AS7-D', chassis: 'Atlas', variant: 'AS7-D' },
        {
          id: '2',
          name: 'Locust LCT-1V',
          chassis: 'Locust',
          variant: 'LCT-1V',
        },
        {
          id: '3',
          name: 'Marauder MAD-3R',
          chassis: 'Marauder',
          variant: 'MAD-3R',
        },
      ];
      mockGetIndex.mockResolvedValue(mockIndex);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { search: 'atlas' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData() as string) as ApiResponse;
      expect(data.count).toBe(1);
      expect(data.data?.[0].chassis).toBe('Atlas');
    });

    it('should be case-insensitive', async () => {
      const mockIndex = [
        { id: '1', name: 'Atlas AS7-D', chassis: 'Atlas', variant: 'AS7-D' },
      ];
      mockGetIndex.mockResolvedValue(mockIndex);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { search: 'ATLAS' },
      });

      await handler(req, res);

      const data = JSON.parse(res._getData() as string) as ApiResponse;
      expect(data.count).toBe(1);
    });

    it('should search by chassis', async () => {
      const mockIndex = [
        { id: '1', name: 'Atlas AS7-D', chassis: 'Atlas', variant: 'AS7-D' },
        { id: '2', name: 'Atlas AS7-K', chassis: 'Atlas', variant: 'AS7-K' },
        {
          id: '3',
          name: 'Marauder MAD-3R',
          chassis: 'Marauder',
          variant: 'MAD-3R',
        },
      ];
      mockGetIndex.mockResolvedValue(mockIndex);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { search: 'atlas' },
      });

      await handler(req, res);

      const data = JSON.parse(res._getData() as string) as ApiResponse;
      expect(data.count).toBe(2);
    });

    it('should search by variant', async () => {
      const mockIndex = [
        { id: '1', name: 'Atlas AS7-D', chassis: 'Atlas', variant: 'AS7-D' },
        {
          id: '2',
          name: 'Marauder MAD-3R',
          chassis: 'Marauder',
          variant: 'MAD-3R',
        },
      ];
      mockGetIndex.mockResolvedValue(mockIndex);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { search: 'MAD' },
      });

      await handler(req, res);

      const data = JSON.parse(res._getData() as string) as ApiResponse;
      expect(data.count).toBe(1);
      expect(data.data?.[0].variant).toBe('MAD-3R');
    });

    it('should return empty array when no matches', async () => {
      const mockIndex = [
        { id: '1', name: 'Atlas AS7-D', chassis: 'Atlas', variant: 'AS7-D' },
      ];
      mockGetIndex.mockResolvedValue(mockIndex);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { search: 'nonexistent' },
      });

      await handler(req, res);

      const data = JSON.parse(res._getData() as string) as ApiResponse;
      expect(data.count).toBe(0);
      expect(data.data).toHaveLength(0);
    });
  });

  describe('Error handling', () => {
    it('should return 500 on service error', async () => {
      mockGetIndex.mockRejectedValue(new Error('Service unavailable'));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {},
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData() as string) as ApiResponse;
      expect(data.success).toBe(false);
      expect(data.error).toBe('Service unavailable');
    });

    it('should handle non-Error exceptions', async () => {
      mockGetIndex.mockRejectedValue('Unknown error');

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {},
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData() as string) as ApiResponse;
      expect(data.error).toBe('Internal server error');
    });
  });
});
