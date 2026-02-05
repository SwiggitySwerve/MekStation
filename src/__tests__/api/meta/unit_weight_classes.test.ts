import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Tests for /api/meta/unit_weight_classes endpoint
 */
import { createMocks } from 'node-mocks-http';

import handler from '@/pages/api/meta/unit_weight_classes';
import {
  STANDARD_WEIGHT_CLASSES,
  WeightClass,
} from '@/types/enums/WeightClass';

import { parseApiResponse } from '../../helpers';

/**
 * Message response type
 */
interface MessageResponse {
  message: string;
}

describe('/api/meta/unit_weight_classes', () => {
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

  describe('GET weight classes', () => {
    it('should return an array of weight classes', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = parseApiResponse<string[]>(res);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should return STANDARD_WEIGHT_CLASSES', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      const data = parseApiResponse<string[]>(res);
      expect(data).toEqual(STANDARD_WEIGHT_CLASSES);
    });

    it('should include LIGHT, MEDIUM, HEAVY, ASSAULT', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      const data = parseApiResponse<string[]>(res);
      expect(data).toContain(WeightClass.LIGHT);
      expect(data).toContain(WeightClass.MEDIUM);
      expect(data).toContain(WeightClass.HEAVY);
      expect(data).toContain(WeightClass.ASSAULT);
    });

    it('should have 4 weight classes', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      const data = parseApiResponse<string[]>(res);
      expect(data.length).toBe(4);
    });
  });
});
