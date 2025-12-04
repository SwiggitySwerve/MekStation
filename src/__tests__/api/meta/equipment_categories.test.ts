/**
 * Tests for /api/meta/equipment_categories endpoint
 */
import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/meta/equipment_categories';
import { EquipmentCategory } from '@/types/equipment';
import { parseApiResponse } from '../../helpers';

/**
 * Message response type
 */
interface MessageResponse {
  message: string;
}

describe('/api/meta/equipment_categories', () => {
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

  describe('GET equipment categories', () => {
    it('should return an array of categories', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = parseApiResponse<string[]>(res);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should include all EquipmentCategory enum values', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      const data = parseApiResponse<string[]>(res);
      Object.values(EquipmentCategory).forEach((category) => {
        expect(data).toContain(category);
      });
    });

    it('should have correct number of categories', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      const data = parseApiResponse<string[]>(res);
      expect(data.length).toBe(Object.values(EquipmentCategory).length);
    });
  });
});
