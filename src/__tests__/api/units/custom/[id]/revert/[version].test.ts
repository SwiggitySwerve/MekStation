/**
 * Tests for Unit Revert API
 * 
 * POST /api/units/custom/:id/revert/:version
 * 
 * @spec openspec/specs/unit-versioning/spec.md
 */

import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/units/custom/[id]/revert/[version]';

// Response types for type-safe assertions
interface ErrorResponse {
  error: string;
}

// Mock SQLiteService
jest.mock('@/services/persistence/SQLiteService', () => ({
  getSQLiteService: jest.fn(() => ({
    initialize: jest.fn(),
    isInitialized: jest.fn().mockReturnValue(true),
  })),
}));

// Mock VersionRepository
const mockRevert = jest.fn();

jest.mock('@/services/units/VersionRepository', () => ({
  getVersionRepository: jest.fn(() => ({
    revert: mockRevert,
  })),
}));

describe('POST /api/units/custom/:id/revert/:version', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRevert.mockReturnValue({
      success: true,
      unitId: 'unit-1',
      newVersion: 4,
    });
  });

  it('should return 405 for non-POST methods', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: { id: 'unit-1', version: '2' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(res._getJSONData()).toEqual({ error: 'Method GET Not Allowed' });
  });

  it('should return 400 if id is missing', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      query: { version: '2' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect((res._getJSONData() as ErrorResponse).error).toContain('Missing unit ID');
  });

  it('should return 400 if version is missing', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      query: { id: 'unit-1' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect((res._getJSONData() as ErrorResponse).error).toContain('Missing version number');
  });

  it('should return 400 for invalid version number', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      query: { id: 'unit-1', version: 'invalid' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect((res._getJSONData() as ErrorResponse).error).toContain('Invalid version number');
  });

  it('should return 400 for version 0', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      query: { id: 'unit-1', version: '0' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect((res._getJSONData() as ErrorResponse).error).toContain('Invalid version number');
  });

  it('should return 400 for negative version', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      query: { id: 'unit-1', version: '-1' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect((res._getJSONData() as ErrorResponse).error).toContain('Invalid version number');
  });

  it('should revert to previous version successfully', async () => {
    mockRevert.mockReturnValue({
      success: true,
      unitId: 'unit-1',
      newVersion: 4,
    });

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      query: { id: 'unit-1', version: '2' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toEqual({
      success: true,
      unitId: 'unit-1',
      newVersion: 4,
    });
  });

  it('should pass notes to revert function', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      query: { id: 'unit-1', version: '2' },
      body: { notes: 'Reverting to fix bug' },
    });

    await handler(req, res);

    expect(mockRevert).toHaveBeenCalledWith('unit-1', 2, 'Reverting to fix bug');
  });

  it('should handle missing notes', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      query: { id: 'unit-1', version: '3' },
    });

    await handler(req, res);

    expect(mockRevert).toHaveBeenCalledWith('unit-1', 3, undefined);
  });

  it('should return 404 if unit not found', async () => {
    mockRevert.mockReturnValue({
      success: false,
      errorCode: 'NOT_FOUND',
      error: 'Unit not found',
    });

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      query: { id: 'non-existent', version: '1' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(404);
  });

  it('should return 404 if version not found', async () => {
    mockRevert.mockReturnValue({
      success: false,
      errorCode: 'VERSION_NOT_FOUND',
      error: 'Version not found',
    });

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      query: { id: 'unit-1', version: '99' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(404);
  });

  it('should return 400 for other errors', async () => {
    mockRevert.mockReturnValue({
      success: false,
      errorCode: 'INVALID_OPERATION',
      error: 'Cannot revert to current version',
    });

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      query: { id: 'unit-1', version: '3' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
  });

  it('should handle repository errors', async () => {
    mockRevert.mockImplementation(() => {
      throw new Error('Database error');
    });

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      query: { id: 'unit-1', version: '2' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
    expect((res._getJSONData() as ErrorResponse).error).toBe('Database error');
  });

  it('should parse version as integer', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      query: { id: 'unit-1', version: '5' },
    });

    await handler(req, res);

    expect(mockRevert).toHaveBeenCalledWith('unit-1', 5, undefined);
  });

  it('should handle array id values', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      query: { id: ['a', 'b'], version: '2' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
  });

  it('should handle array version values', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      query: { id: 'unit-1', version: ['1', '2'] },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
  });
});
