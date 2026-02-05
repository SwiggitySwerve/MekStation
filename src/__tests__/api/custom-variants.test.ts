import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Tests for /api/custom-variants endpoint
 *
 * NOTE: This endpoint is DEPRECATED and returns 410 (Gone) for all requests.
 * New code should use /api/units/custom/* endpoints instead.
 */
import { createMocks } from 'node-mocks-http';

import handler from '@/pages/api/custom-variants';

import { parseDeprecatedResponse } from '../helpers';

/**
 * Type for new API info response
 */
interface NewApiInfo {
  baseUrl: string;
  endpoints: {
    list: string;
    create: string;
    get: string;
    update: string;
    delete: string;
    versions: string;
    revert: string;
    export: string;
    import: string;
  };
}

/**
 * Extended deprecated response with new API info
 */
interface DeprecatedResponseWithApi {
  success: boolean;
  deprecated: boolean;
  message?: string;
  newApi?: NewApiInfo;
}

describe('/api/custom-variants (DEPRECATED)', () => {
  describe('Deprecation Response', () => {
    it('should return 410 Gone for GET requests', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(410);
      const data = parseDeprecatedResponse(res);
      expect(data.success).toBe(false);
      expect(data.deprecated).toBe(true);
      expect(data.message).toContain('deprecated');
      expect(data.message).toContain('/api/units/custom');
    });

    it('should return 410 Gone for POST requests', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(410);
      const data = parseDeprecatedResponse(res);
      expect(data.deprecated).toBe(true);
    });

    it('should return 410 Gone for PUT requests', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PUT',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(410);
    });

    it('should return 410 Gone for DELETE requests', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'DELETE',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(410);
    });
  });

  describe('New API Information', () => {
    it('should provide new API base URL', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      const rawData = res._getData() as string;
      const data = JSON.parse(rawData) as DeprecatedResponseWithApi;
      expect(data.newApi).toBeDefined();
      expect(data.newApi?.baseUrl).toBe('/api/units/custom');
    });

    it('should provide list of new endpoints', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      const rawData = res._getData() as string;
      const data = JSON.parse(rawData) as DeprecatedResponseWithApi;
      expect(data.newApi?.endpoints).toBeDefined();
      expect(data.newApi?.endpoints.list).toBe('GET /api/units/custom');
      expect(data.newApi?.endpoints.create).toBe('POST /api/units/custom');
      expect(data.newApi?.endpoints.get).toBe('GET /api/units/custom/[id]');
      expect(data.newApi?.endpoints.update).toBe('PUT /api/units/custom/[id]');
      expect(data.newApi?.endpoints.delete).toBe(
        'DELETE /api/units/custom/[id]',
      );
    });

    it('should provide version and export endpoints', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      const rawData = res._getData() as string;
      const data = JSON.parse(rawData) as DeprecatedResponseWithApi;
      expect(data.newApi?.endpoints.versions).toBe(
        'GET /api/units/custom/[id]/versions',
      );
      expect(data.newApi?.endpoints.revert).toBe(
        'POST /api/units/custom/[id]/revert/[version]',
      );
      expect(data.newApi?.endpoints.export).toBe(
        'GET /api/units/custom/[id]/export',
      );
      expect(data.newApi?.endpoints.import).toBe('POST /api/units/import');
    });
  });
});
