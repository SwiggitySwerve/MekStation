/**
 * Tests for /api/vault/identity/unlock endpoint
 *
 * Tests identity unlock operations:
 * - POST: Verify password and return public identity
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/vault/identity/unlock';
import { parseApiResponse, parseErrorResponse } from '../../helpers';

// =============================================================================
// Mocks
// =============================================================================

const mockGetActive = jest.fn<Promise<unknown>, unknown[]>();
const mockUnlockIdentity = jest.fn<Promise<unknown>, unknown[]>();

jest.mock('@/services/vault/IdentityRepository', () => ({
  getIdentityRepository: () => ({
    getActive: mockGetActive,
    initialize: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('@/services/vault/IdentityService', () => ({
  unlockIdentity: (...args: unknown[]): Promise<unknown> => mockUnlockIdentity(...args),
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
  avatar: 'test-avatar',
};

const mockUnlockedIdentity = {
  ...mockStoredIdentity,
  privateKey: 'decrypted-private-key',
};

// =============================================================================
// Tests
// =============================================================================

describe('/api/vault/identity/unlock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Method Validation', () => {
    it('should reject GET requests', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
      const data = parseErrorResponse(res);
      expect(data.error).toContain('Method not allowed');
    });

    it('should reject PUT requests', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PUT',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
    });

    it('should set Allow header for 405 responses', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'DELETE',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
      expect(res.getHeader('Allow')).toEqual(['POST']);
    });
  });

  describe('POST - Unlock Identity', () => {
    it('should unlock identity with correct password', async () => {
      mockGetActive.mockResolvedValue(mockStoredIdentity);
      mockUnlockIdentity.mockResolvedValue(mockUnlockedIdentity);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          password: 'correctPassword',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = parseApiResponse<{
        success: boolean;
        publicIdentity: {
          displayName: string;
          publicKey: string;
          friendCode: string;
          avatar?: string;
        };
      }>(res);

      expect(data.success).toBe(true);
      expect(data.publicIdentity).toBeDefined();
      expect(data.publicIdentity.displayName).toBe('TestUser');
      expect(data.publicIdentity.publicKey).toBe(mockStoredIdentity.publicKey);
      expect(data.publicIdentity.friendCode).toBe(mockStoredIdentity.friendCode);
      expect(data.publicIdentity.avatar).toBe(mockStoredIdentity.avatar);
    });

    it('should not expose private key in unlock response', async () => {
      mockGetActive.mockResolvedValue(mockStoredIdentity);
      mockUnlockIdentity.mockResolvedValue(mockUnlockedIdentity);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          password: 'correctPassword',
        },
      });

      await handler(req, res);

      const rawData = JSON.stringify(res._getData());
      expect(rawData).not.toContain('privateKey');
      expect(rawData).not.toContain('encryptedPrivateKey');
      expect(rawData).not.toContain('decrypted-private-key');
    });

    it('should reject missing password', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {},
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = parseErrorResponse(res);
      expect(data.error).toContain('Password is required');
    });

    it('should reject non-string password', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          password: 12345,
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = parseErrorResponse(res);
      expect(data.error).toContain('Password is required');
    });

    it('should return 404 if no identity found', async () => {
      mockGetActive.mockResolvedValue(null);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          password: 'somePassword',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(404);
      const data = parseErrorResponse(res);
      expect(data.error).toContain('No identity found');
    });

    it('should return 401 for wrong password', async () => {
      mockGetActive.mockResolvedValue(mockStoredIdentity);
      mockUnlockIdentity.mockRejectedValue(new Error('Decryption failed'));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          password: 'wrongPassword',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(401);
      const data = parseErrorResponse(res);
      expect(data.error).toContain('Invalid password');
    });

    it('should handle repository errors', async () => {
      mockGetActive.mockRejectedValue(new Error('Database connection failed'));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          password: 'somePassword',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = parseErrorResponse(res);
      expect(data.error).toBe('Database connection failed');
    });
  });
});
