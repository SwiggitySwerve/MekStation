/**
 * Units API Route Tests
 * 
 * Integration tests for /api/units endpoint.
 * 
 * @spec openspec/specs/unit-services/spec.md
 */

import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/units';

// Mock the canonical unit service
jest.mock('@/services/units/CanonicalUnitService', () => ({
  canonicalUnitService: {
    getById: jest.fn().mockImplementation((id: string) => {
      if (id === 'atlas-as7-d') {
        return Promise.resolve({
          id: 'atlas-as7-d',
          chassis: 'Atlas',
          variant: 'AS7-D',
          tonnage: 100,
          techBase: 'Inner Sphere',
        });
      }
      return Promise.resolve(null);
    }),
    query: jest.fn().mockImplementation(() => {
      return Promise.resolve([
        { id: 'locust-lct-1v', chassis: 'Locust', variant: 'LCT-1V', tonnage: 20 },
        { id: 'atlas-as7-d', chassis: 'Atlas', variant: 'AS7-D', tonnage: 100 },
      ]);
    }),
  },
}));

describe('/api/units', () => {
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
      expect(JSON.parse(res._getData()).error).toContain('Method not allowed');
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

  // ============================================================================
  // Get Single Unit by ID
  // ============================================================================
  describe('GET /api/units?id=<id>', () => {
    it('should return unit when found', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { id: 'atlas-as7-d' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('atlas-as7-d');
      expect(data.data.chassis).toBe('Atlas');
    });

    it('should return 404 when unit not found', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { id: 'non-existent-unit' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(404);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toContain('Unit not found');
    });
  });

  // ============================================================================
  // Query Units
  // ============================================================================
  describe('GET /api/units (query)', () => {
    it('should return list of units', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {},
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.count).toBe(data.data.length);
    });

    it('should include count in response', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {},
      });

      await handler(req, res);

      const data = JSON.parse(res._getData());
      expect(data.count).toBeDefined();
      expect(typeof data.count).toBe('number');
    });
  });

  // ============================================================================
  // Response Format
  // ============================================================================
  describe('Response Format', () => {
    it('should return JSON', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(() => JSON.parse(res._getData())).not.toThrow();
    });

    it('should have success field', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('success');
      expect(typeof data.success).toBe('boolean');
    });

    it('should have data field on success', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data).toHaveProperty('data');
    });

    it('should have error field on failure', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { id: 'non-existent' },
      });

      await handler(req, res);

      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data).toHaveProperty('error');
    });
  });
});

