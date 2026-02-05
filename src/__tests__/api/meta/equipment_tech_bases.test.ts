/**
 * Tests for /api/meta/equipment_tech_bases endpoint
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { createMocks } from 'node-mocks-http';

import handler from '@/pages/api/meta/equipment_tech_bases';
import { ALL_TECH_BASES } from '@/types/enums/TechBase';

describe('/api/meta/equipment_tech_bases', () => {
  it('should return 405 for non-GET requests', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(res._getJSONData()).toEqual({ message: 'Method not allowed' });
  });

  it('should return all tech bases for GET requests', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toEqual(ALL_TECH_BASES);
  });

  it('should return an array of tech base values', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
    });

    await handler(req, res);

    const data = res._getJSONData() as string[];
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
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
