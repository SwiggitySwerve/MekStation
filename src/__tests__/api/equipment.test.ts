/**
 * Equipment API Route Tests
 * 
 * Integration tests for /api/equipment endpoint.
 * 
 * @spec openspec/specs/equipment-services/spec.md
 */

import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/equipment';

// Mock the equipment lookup service
jest.mock('@/services/equipment/EquipmentLookupService', () => ({
  equipmentLookupService: {
    getById: jest.fn().mockImplementation((id: string) => {
      if (id === 'medium-laser') {
        return {
          id: 'medium-laser',
          name: 'Medium Laser',
          weight: 1,
          criticalSlots: 1,
          damage: 5,
          heat: 3,
          techBase: 'Inner Sphere',
          category: 'ENERGY_WEAPON',
        };
      }
      return undefined;
    }),
    query: jest.fn().mockImplementation(() => {
      return [
        { id: 'small-laser', name: 'Small Laser', weight: 0.5 },
        { id: 'medium-laser', name: 'Medium Laser', weight: 1 },
        { id: 'large-laser', name: 'Large Laser', weight: 5 },
      ];
    }),
  },
}));

describe('/api/equipment', () => {
  // ============================================================================
  // Method Handling
  // ============================================================================
  describe('HTTP Methods', () => {
    it('should accept GET requests', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
    });

    it('should reject POST requests', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
    });

    it('should reject PUT requests', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PUT',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
    });
  });

  // ============================================================================
  // Get Single Equipment by ID
  // ============================================================================
  describe('GET /api/equipment?id=<id>', () => {
    it('should return equipment when found', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { id: 'medium-laser' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('medium-laser');
      expect(data.data.name).toBe('Medium Laser');
    });

    it('should return 404 when equipment not found', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { id: 'non-existent-weapon' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(404);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toContain('Equipment not found');
    });
  });

  // ============================================================================
  // Query Equipment
  // ============================================================================
  describe('GET /api/equipment (query)', () => {
    it('should return list of equipment', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {},
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('should include count in response', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {},
      });

      await handler(req, res);

      const data = JSON.parse(res._getData());
      expect(data.count).toBeDefined();
      expect(data.count).toBe(data.data.length);
    });
  });

  // ============================================================================
  // Query Parameters
  // ============================================================================
  describe('Query Parameters', () => {
    it('should accept category filter', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { category: 'ENERGY_WEAPON' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
    });

    it('should accept techBase filter', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { techBase: 'Inner Sphere' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
    });

    it('should accept year filter', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { year: '3050' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
    });

    it('should accept search filter', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { search: 'laser' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
    });

    it('should accept maxWeight filter', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { maxWeight: '5' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
    });

    it('should accept maxSlots filter', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { maxSlots: '3' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
    });

    it('should accept multiple filters', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {
          category: 'ENERGY_WEAPON',
          techBase: 'Inner Sphere',
          maxWeight: '5',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
    });
  });

  // ============================================================================
  // Response Format
  // ============================================================================
  describe('Response Format', () => {
    it('should return valid JSON', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(() => JSON.parse(res._getData())).not.toThrow();
    });

    it('should include success field', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('success');
    });

    it('should include data field on success', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data).toHaveProperty('data');
    });
  });

  // ============================================================================
  // Error Handling
  // ============================================================================
  describe('Error Handling', () => {
    it('should handle invalid numeric parameters gracefully', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { maxWeight: 'invalid' },
      });

      await handler(req, res);

      // Should not crash, should return data
      expect(res._getStatusCode()).toBe(200);
    });
  });
});

