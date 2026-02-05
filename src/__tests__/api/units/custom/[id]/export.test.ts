/**
 * Tests for Unit Export API
 *
 * GET /api/units/custom/:id/export
 *
 * @spec openspec/specs/unit-services/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { createMocks } from 'node-mocks-http';

import handler from '@/pages/api/units/custom/[id]/export';

// Response types for type-safe assertions
interface ErrorResponse {
  error: string;
}

interface ExportEnvelope {
  formatVersion: string;
  savedAt: string;
  application: string;
  applicationVersion: string;
  unit: {
    chassis: string;
    variant: string;
    [key: string]: unknown;
  };
}

// Mock SQLiteService
jest.mock('@/services/persistence/SQLiteService', () => ({
  getSQLiteService: jest.fn(() => ({
    initialize: jest.fn(),
    isInitialized: jest.fn().mockReturnValue(true),
  })),
}));

// Mock UnitRepository
const mockGetById = jest.fn();

jest.mock('@/services/units/UnitRepository', () => ({
  getUnitRepository: jest.fn(() => ({
    getById: mockGetById,
  })),
}));

const mockUnit = {
  id: 'unit-1',
  chassis: 'Atlas',
  variant: 'AS7-D',
  data: JSON.stringify({
    chassis: 'Atlas',
    variant: 'AS7-D',
    tonnage: 100,
    techBase: 'Inner Sphere',
  }),
  currentVersion: 3,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-15T00:00:00.000Z',
};

describe('GET /api/units/custom/:id/export', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetById.mockReturnValue(mockUnit);
  });

  it('should return 405 for non-GET methods', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      query: { id: 'unit-1' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(res._getJSONData() as ErrorResponse).toEqual({
      error: 'Method POST Not Allowed',
    });
  });

  it('should return 400 if id is missing', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: {},
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect((res._getJSONData() as ErrorResponse).error).toContain(
      'Missing unit ID',
    );
  });

  it('should return 404 if unit not found', async () => {
    mockGetById.mockReturnValue(null);

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: { id: 'non-existent' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(404);
    expect((res._getJSONData() as ErrorResponse).error).toContain('not found');
  });

  it('should export unit as JSON envelope', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: { id: 'unit-1' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);

    const data = res._getJSONData() as ExportEnvelope;
    expect(data.formatVersion).toBeDefined();
    expect(data.savedAt).toBeDefined();
    expect(data.application).toBe('mekstation');
    expect(data.applicationVersion).toBeDefined();
    expect(data.unit).toBeDefined();
    expect(data.unit.chassis).toBe('Atlas');
    expect(data.unit.variant).toBe('AS7-D');
  });

  it('should set download headers when download=true', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: { id: 'unit-1', download: 'true' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(res.getHeader('Content-Type')).toBe('application/json');
    expect(res.getHeader('Content-Disposition')).toContain('attachment');
    expect(res.getHeader('Content-Disposition')).toContain('Atlas-AS7-D.json');
  });

  it('should sanitize filename', async () => {
    mockGetById.mockReturnValue({
      ...mockUnit,
      chassis: 'Atlas <Test>',
      variant: 'AS7-D/Modified',
    });

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: { id: 'unit-1', download: 'true' },
    });

    await handler(req, res);

    const contentDisposition = res.getHeader('Content-Disposition') as string;
    expect(contentDisposition).not.toContain('<');
    expect(contentDisposition).not.toContain('>');
    expect(contentDisposition).not.toContain('/');
  });

  it('should handle repository errors', async () => {
    mockGetById.mockImplementation(() => {
      throw new Error('Database error');
    });

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: { id: 'unit-1' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
    expect((res._getJSONData() as ErrorResponse).error).toBe('Database error');
  });

  it('should handle JSON parse errors', async () => {
    mockGetById.mockReturnValue({
      ...mockUnit,
      data: 'invalid json',
    });

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: { id: 'unit-1' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
  });

  it('should include saved timestamp', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: { id: 'unit-1' },
    });

    const beforeCall = new Date().toISOString();
    await handler(req, res);
    const afterCall = new Date().toISOString();

    const data = res._getJSONData() as ExportEnvelope;
    expect(new Date(data.savedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(beforeCall).getTime(),
    );
    expect(new Date(data.savedAt).getTime()).toBeLessThanOrEqual(
      new Date(afterCall).getTime(),
    );
  });
});
