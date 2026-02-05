import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Tests for /api/meta/unit_eras endpoint
 */
import { createMocks } from 'node-mocks-http';

import handler from '@/pages/api/meta/unit_eras';
import { ALL_ERAS, Era } from '@/types/enums/Era';

import { parseApiResponse } from '../../helpers';

/**
 * Message response type
 */
interface MessageResponse {
  message: string;
}

describe('/api/meta/unit_eras', () => {
  describe('GET method validation', () => {
    it('should reject non-GET requests', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
      const data = parseApiResponse<MessageResponse>(res);
      expect(data.message).toBe('Method not allowed');
    });

    it('should reject PUT requests', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PUT',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
    });
  });

  describe('GET unit eras', () => {
    it('should return an array of eras', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = parseApiResponse<string[]>(res);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should return ALL_ERAS from the enum', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      const data = parseApiResponse<string[]>(res);
      expect(data).toEqual(ALL_ERAS);
    });

    it('should include all Era enum values', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      const data = parseApiResponse<string[]>(res);
      Object.values(Era).forEach((era) => {
        expect(data).toContain(era);
      });
    });

    it('should have correct number of eras', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      const data = parseApiResponse<string[]>(res);
      expect(data.length).toBe(Object.values(Era).length);
    });
  });
});
