/**
 * Tests for /api/meta/unit_tech_bases endpoint
 */
import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/meta/unit_tech_bases';
import { ALL_TECH_BASES, TechBase } from '@/types/enums/TechBase';
import { parseApiResponse } from '../../helpers';

/**
 * Message response type
 */
interface MessageResponse {
  message: string;
}

describe('/api/meta/unit_tech_bases', () => {
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

  describe('GET unit tech bases', () => {
    it('should return an array of tech bases', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = parseApiResponse<string[]>(res);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should return ALL_TECH_BASES from the enum', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      const data = parseApiResponse<string[]>(res);
      expect(data).toEqual(ALL_TECH_BASES);
    });

    it('should include INNER_SPHERE tech base', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      const data = parseApiResponse<string[]>(res);
      expect(data).toContain(TechBase.INNER_SPHERE);
    });

    it('should include CLAN tech base', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      const data = parseApiResponse<string[]>(res);
      expect(data).toContain(TechBase.CLAN);
    });

    it('should only include binary tech bases (per spec VAL-ENUM-001)', async () => {
      // Per spec: Valid TechBase values are INNER_SPHERE and CLAN only
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      const data = parseApiResponse<string[]>(res);
      expect(data).toContain(TechBase.INNER_SPHERE);
      expect(data).toContain(TechBase.CLAN);
      expect(data.length).toBe(2); // Only IS and Clan
    });

    it('should have correct number of tech bases', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      const data = parseApiResponse<string[]>(res);
      expect(data.length).toBe(Object.values(TechBase).length); // Should be 2
    });
  });
});
