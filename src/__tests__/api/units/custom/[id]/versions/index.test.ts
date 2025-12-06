/**
 * Tests for Unit Versions API
 * 
 * GET /api/units/custom/:id/versions
 * 
 * @spec openspec/specs/unit-versioning/spec.md
 */

import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/units/custom/[id]/versions';

// Response types for type-safe assertions
interface ErrorResponse {
  error: string;
}

interface VersionEntry {
  unitId: string;
  version: number;
  createdAt: string;
  description: string;
  changeType: string;
}

interface VersionHistoryResponse {
  unitId: string;
  currentVersion: number;
  versions: VersionEntry[];
  count: number;
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

// Mock VersionRepository
const mockGetVersionHistory = jest.fn();

jest.mock('@/services/units/VersionRepository', () => ({
  getVersionRepository: jest.fn(() => ({
    getVersionHistory: mockGetVersionHistory,
  })),
}));

const mockUnit = {
  id: 'unit-1',
  chassis: 'Atlas',
  variant: 'AS7-D',
  currentVersion: 3,
};

const mockVersions = [
  {
    unitId: 'unit-1',
    version: 1,
    createdAt: '2024-01-01T00:00:00.000Z',
    description: 'Initial version',
    changeType: 'create',
  },
  {
    unitId: 'unit-1',
    version: 2,
    createdAt: '2024-01-05T00:00:00.000Z',
    description: 'Updated armor',
    changeType: 'update',
  },
  {
    unitId: 'unit-1',
    version: 3,
    createdAt: '2024-01-10T00:00:00.000Z',
    description: 'Added weapons',
    changeType: 'update',
  },
];

describe('GET /api/units/custom/:id/versions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetById.mockReturnValue(mockUnit);
    mockGetVersionHistory.mockReturnValue(mockVersions);
  });

  it('should return 405 for non-GET methods', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      query: { id: 'unit-1' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(res._getJSONData()).toEqual({ error: 'Method POST Not Allowed' });
  });

  it('should return 400 if id is missing', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: {},
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect((res._getJSONData() as ErrorResponse).error).toContain('Missing unit ID');
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

  it('should return version history', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: { id: 'unit-1' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    
    const data = res._getJSONData() as VersionHistoryResponse;
    expect(data.unitId).toBe('unit-1');
    expect(data.currentVersion).toBe(3);
    expect(data.versions).toEqual(mockVersions);
    expect(data.count).toBe(3);
  });

  it('should return empty versions array for new unit', async () => {
    mockGetVersionHistory.mockReturnValue([]);

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: { id: 'unit-1' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    
    const data = res._getJSONData() as VersionHistoryResponse;
    expect(data.versions).toEqual([]);
    expect(data.count).toBe(0);
  });

  it('should handle repository errors', async () => {
    mockGetVersionHistory.mockImplementation(() => {
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

  it('should call getVersionHistory with correct unit id', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: { id: 'test-unit-123' },
    });

    await handler(req, res);

    expect(mockGetVersionHistory).toHaveBeenCalledWith('test-unit-123');
  });

  it('should return current version from unit', async () => {
    mockGetById.mockReturnValue({
      ...mockUnit,
      currentVersion: 7,
    });

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: { id: 'unit-1' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect((res._getJSONData() as VersionHistoryResponse).currentVersion).toBe(7);
  });

  it('should handle non-string id', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: { id: ['array', 'value'] },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect((res._getJSONData() as ErrorResponse).error).toContain('Missing unit ID');
  });
});
