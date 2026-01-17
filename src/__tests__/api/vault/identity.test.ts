/**
 * Tests for /api/vault/identity endpoint
 *
 * Tests identity CRUD operations:
 * - GET: Check if identity exists
 * - POST: Create new identity
 * - PATCH: Update display name
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/vault/identity';
import { parseApiResponse, parseErrorResponse } from '../../helpers';

// =============================================================================
// Mocks
// =============================================================================

// Mock the identity repository
const mockHasIdentity = jest.fn();
const mockGetActive = jest.fn();
const mockSave = jest.fn();
const mockUpdate = jest.fn();

jest.mock('@/services/vault/IdentityRepository', () => ({
  getIdentityRepository: () => ({
    hasIdentity: mockHasIdentity,
    getActive: mockGetActive,
    save: mockSave,
    update: mockUpdate,
    initialize: jest.fn().mockResolvedValue(undefined),
  }),
}));

// Mock the identity service
const mockCreateIdentity = jest.fn<Promise<unknown>, unknown[]>();

jest.mock('@/services/vault/IdentityService', () => ({
  createIdentity: (...args: unknown[]): Promise<unknown> => mockCreateIdentity(...args),
}));

// =============================================================================
// Test Data
// =============================================================================

const mockStoredIdentity = {
  id: 'test-id-123',
  displayName: 'TestUser',
  publicKey: 'dGVzdC1wdWJsaWMta2V5',
  friendCode: 'ABCD-EFGH-JKLM-NPQR',
  encryptedPrivateKey: {
    ciphertext: 'encrypted',
    iv: 'iv',
    salt: 'salt',
    algorithm: 'AES-GCM-256' as const,
  },
  createdAt: '2024-01-01T00:00:00.000Z',
};

// =============================================================================
// Tests
// =============================================================================

describe('/api/vault/identity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Method Validation', () => {
    it('should reject non-allowed methods', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'DELETE',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
      const data = parseErrorResponse(res);
      expect(data.error).toContain('Method not allowed');
    });

    it('should set Allow header for 405 responses', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PUT',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
      expect(res.getHeader('Allow')).toEqual(['GET', 'POST', 'PATCH']);
    });
  });

  describe('GET - Check Identity', () => {
    it('should return hasIdentity: false when no identity exists', async () => {
      mockHasIdentity.mockResolvedValue(false);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = parseApiResponse<{ hasIdentity: boolean; publicIdentity: null }>(res);
      expect(data.hasIdentity).toBe(false);
      expect(data.publicIdentity).toBeNull();
    });

    it('should return public identity when identity exists', async () => {
      mockHasIdentity.mockResolvedValue(true);
      mockGetActive.mockResolvedValue(mockStoredIdentity);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = parseApiResponse<{
        hasIdentity: boolean;
        publicIdentity: {
          displayName: string;
          publicKey: string;
          friendCode: string;
        };
      }>(res);
      expect(data.hasIdentity).toBe(true);
      expect(data.publicIdentity.displayName).toBe('TestUser');
      expect(data.publicIdentity.publicKey).toBe(mockStoredIdentity.publicKey);
      expect(data.publicIdentity.friendCode).toBe(mockStoredIdentity.friendCode);
    });

    it('should not expose encrypted private key in response', async () => {
      mockHasIdentity.mockResolvedValue(true);
      mockGetActive.mockResolvedValue(mockStoredIdentity);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      const rawData = JSON.stringify(res._getData());
      expect(rawData).not.toContain('encryptedPrivateKey');
      expect(rawData).not.toContain('privateKey');
    });

    it('should handle repository errors', async () => {
      mockHasIdentity.mockRejectedValue(new Error('Database error'));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = parseErrorResponse(res);
      expect(data.error).toBe('Database error');
    });
  });

  describe('POST - Create Identity', () => {
    it('should create new identity with valid input', async () => {
      mockHasIdentity.mockResolvedValue(false);
      mockCreateIdentity.mockResolvedValue(mockStoredIdentity);
      mockSave.mockResolvedValue(undefined);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          displayName: 'NewUser',
          password: 'securePassword123',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(201);
      const data = parseApiResponse<{ success: boolean; publicIdentity: { displayName: string } }>(res);
      expect(data.success).toBe(true);
      expect(data.publicIdentity).toBeDefined();
      expect(mockCreateIdentity).toHaveBeenCalledWith('NewUser', 'securePassword123');
      expect(mockSave).toHaveBeenCalled();
    });

    it('should reject missing display name', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          password: 'password123',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = parseErrorResponse(res);
      expect(data.error).toContain('Display name is required');
    });

    it('should reject empty display name', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          displayName: '   ',
          password: 'password123',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = parseErrorResponse(res);
      expect(data.error).toContain('cannot be empty');
    });

    it('should reject display name too long', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          displayName: 'A'.repeat(101),
          password: 'password123',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = parseErrorResponse(res);
      expect(data.error).toContain('too long');
    });

    it('should reject missing password', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          displayName: 'TestUser',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = parseErrorResponse(res);
      expect(data.error).toContain('Password is required');
    });

    it('should reject password too short', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          displayName: 'TestUser',
          password: '1234567', // 7 chars, needs 8
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = parseErrorResponse(res);
      expect(data.error).toContain('at least 8 characters');
    });

    it('should reject if identity already exists', async () => {
      mockHasIdentity.mockResolvedValue(true);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          displayName: 'TestUser',
          password: 'password123',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(409);
      const data = parseErrorResponse(res);
      expect(data.error).toContain('already exists');
    });

    it('should trim display name', async () => {
      mockHasIdentity.mockResolvedValue(false);
      mockCreateIdentity.mockResolvedValue(mockStoredIdentity);
      mockSave.mockResolvedValue(undefined);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          displayName: '  TrimmedName  ',
          password: 'password123',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(201);
      expect(mockCreateIdentity).toHaveBeenCalledWith('TrimmedName', 'password123');
    });
  });

  describe('PATCH - Update Identity', () => {
    it('should update display name', async () => {
      mockGetActive.mockResolvedValue(mockStoredIdentity);
      mockUpdate.mockResolvedValue(undefined);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PATCH',
        body: {
          displayName: 'UpdatedName',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = parseApiResponse<{ success: boolean }>(res);
      expect(data.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith(
        mockStoredIdentity.id,
        expect.objectContaining({ displayName: 'UpdatedName' })
      );
    });

    it('should update avatar', async () => {
      mockGetActive.mockResolvedValue(mockStoredIdentity);
      mockUpdate.mockResolvedValue(undefined);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PATCH',
        body: {
          avatar: 'avatar-id-123',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(mockUpdate).toHaveBeenCalledWith(
        mockStoredIdentity.id,
        expect.objectContaining({ avatar: 'avatar-id-123' })
      );
    });

    it('should reject empty display name on update', async () => {
      mockGetActive.mockResolvedValue(mockStoredIdentity);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PATCH',
        body: {
          displayName: '',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = parseErrorResponse(res);
      expect(data.error).toContain('Invalid display name');
    });

    it('should reject display name too long on update', async () => {
      mockGetActive.mockResolvedValue(mockStoredIdentity);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PATCH',
        body: {
          displayName: 'A'.repeat(101),
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = parseErrorResponse(res);
      expect(data.error).toContain('too long');
    });

    it('should return 404 if no active identity', async () => {
      mockGetActive.mockResolvedValue(null);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PATCH',
        body: {
          displayName: 'UpdatedName',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(404);
      const data = parseErrorResponse(res);
      expect(data.error).toContain('No active identity');
    });
  });
});
