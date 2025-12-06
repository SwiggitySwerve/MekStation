/**
 * Tests for Suggest Clone Name API
 * 
 * POST /api/units/custom/suggest-name
 * 
 * @spec openspec/specs/unit-services/spec.md
 */

import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/units/custom/suggest-name';

// Response types for type-safe assertions
interface ErrorResponse {
  error: string;
}

interface SuggestNameResponse {
  suggestedChassis: string;
  suggestedVariant: string;
  isOriginalAvailable: boolean;
}

// Mock SQLiteService
jest.mock('@/services/persistence/SQLiteService', () => ({
  getSQLiteService: jest.fn(() => ({
    initialize: jest.fn(),
    isInitialized: jest.fn().mockReturnValue(true),
  })),
}));

// Mock UnitRepository
const mockNameExists = jest.fn();
const mockSuggestCloneName = jest.fn();

jest.mock('@/services/units/UnitRepository', () => ({
  getUnitRepository: jest.fn(() => ({
    nameExists: mockNameExists,
    suggestCloneName: mockSuggestCloneName,
  })),
}));

describe('POST /api/units/custom/suggest-name', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNameExists.mockReturnValue(false);
    mockSuggestCloneName.mockReturnValue({
      suggestedChassis: 'Atlas',
      suggestedVariant: 'AS7-D Custom',
    });
  });

  it('should return 405 for non-POST methods', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(res._getJSONData()).toEqual({ error: 'Method GET Not Allowed' });
  });

  it('should return 400 if chassis is missing', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: { variant: 'AS7-D' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect((res._getJSONData() as ErrorResponse).error).toContain('Missing required fields');
  });

  it('should return 400 if variant is missing', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: { chassis: 'Atlas' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect((res._getJSONData() as ErrorResponse).error).toContain('Missing required fields');
  });

  it('should return name suggestion when original is available', async () => {
    mockNameExists.mockReturnValue(false);
    mockSuggestCloneName.mockReturnValue({
      suggestedChassis: 'Atlas',
      suggestedVariant: 'AS7-D Custom',
    });

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: { chassis: 'Atlas', variant: 'AS7-D' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData() as SuggestNameResponse).toEqual({
      suggestedChassis: 'Atlas',
      suggestedVariant: 'AS7-D Custom',
      isOriginalAvailable: true,
    });
  });

  it('should return name suggestion when original is not available', async () => {
    mockNameExists.mockReturnValue(true);
    mockSuggestCloneName.mockReturnValue({
      suggestedChassis: 'Atlas',
      suggestedVariant: 'AS7-D (2)',
    });

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: { chassis: 'Atlas', variant: 'AS7-D' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData() as SuggestNameResponse).toEqual({
      suggestedChassis: 'Atlas',
      suggestedVariant: 'AS7-D (2)',
      isOriginalAvailable: false,
    });
  });

  it('should handle repository errors', async () => {
    mockSuggestCloneName.mockImplementation(() => {
      throw new Error('Database error');
    });

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: { chassis: 'Atlas', variant: 'AS7-D' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
    expect((res._getJSONData() as ErrorResponse).error).toBe('Database error');
  });

  it('should call nameExists with correct parameters', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: { chassis: 'Marauder', variant: 'MAD-3R' },
    });

    await handler(req, res);

    expect(mockNameExists).toHaveBeenCalledWith('Marauder', 'MAD-3R');
  });

  it('should call suggestCloneName with correct parameters', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: { chassis: 'Timber Wolf', variant: 'Prime' },
    });

    await handler(req, res);

    expect(mockSuggestCloneName).toHaveBeenCalledWith('Timber Wolf', 'Prime');
  });
});
