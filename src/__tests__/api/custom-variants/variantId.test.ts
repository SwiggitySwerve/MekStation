/**
 * Tests for /api/custom-variants/[variantId] endpoint
 * 
 * NOTE: This endpoint is DEPRECATED and returns 410 (Gone) for all requests.
 * New code should use /api/units/custom/[id] endpoints instead.
 */
import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/custom-variants/[variantId]';

describe('/api/custom-variants/[variantId] (DEPRECATED)', () => {
  describe('Deprecation Response', () => {
    it('should return 410 Gone for GET requests', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { variantId: 'test-variant-123' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(410);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.deprecated).toBe(true);
      expect(data.message).toContain('deprecated');
      expect(data.message).toContain('/api/units/custom');
    });

    it('should return 410 Gone for POST requests', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        query: { variantId: 'test-variant-123' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(410);
      const data = JSON.parse(res._getData());
      expect(data.deprecated).toBe(true);
    });

    it('should return 410 Gone for PUT requests', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PUT',
        query: { variantId: 'test-variant-123' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(410);
    });

    it('should return 410 Gone for DELETE requests', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'DELETE',
        query: { variantId: 'test-variant-123' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(410);
    });

    it('should return 410 even without variantId', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {},
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(410);
      const data = JSON.parse(res._getData());
      expect(data.deprecated).toBe(true);
    });

    it('should return 410 for array variantId', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { variantId: ['id1', 'id2'] },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(410);
      const data = JSON.parse(res._getData());
      expect(data.deprecated).toBe(true);
    });
  });

  describe('Redirect Information', () => {
    it('should provide redirect URL with variantId', async () => {
      const variantId = 'atlas-custom-1';
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { variantId },
      });

      await handler(req, res);

      const data = JSON.parse(res._getData());
      expect(data.redirect).toBe(`/api/units/custom/${variantId}`);
    });

    it('should handle empty variantId in redirect', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { variantId: '' },
      });

      await handler(req, res);

      const data = JSON.parse(res._getData());
      expect(data.redirect).toBe('/api/units/custom/');
    });

    it('should handle special characters in variantId', async () => {
      const variantId = 'test-variant_123';
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { variantId },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(410);
      const data = JSON.parse(res._getData());
      expect(data.redirect).toBe(`/api/units/custom/${variantId}`);
    });
  });
});
