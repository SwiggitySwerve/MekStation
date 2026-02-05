/**
 * Tests for /api/vault/sign endpoint
 *
 * Tests bundle signing operations:
 * - POST: Create and sign a bundle
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { createMocks } from 'node-mocks-http';

import handler from '@/pages/api/vault/sign';

import { parseApiResponse, parseErrorResponse } from '../../helpers';

// =============================================================================
// Mocks
// =============================================================================

const mockGetActive = jest.fn<Promise<unknown>, unknown[]>();
const mockUnlockIdentity = jest.fn<Promise<unknown>, unknown[]>();
const mockSignMessage = jest.fn<Promise<string>, unknown[]>();
const mockGetPublicIdentity = jest.fn<unknown, unknown[]>();

jest.mock('@/services/vault/IdentityRepository', () => ({
  getIdentityRepository: () => ({
    getActive: mockGetActive,
    initialize: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('@/services/vault/IdentityService', () => ({
  unlockIdentity: (...args: unknown[]): Promise<unknown> =>
    mockUnlockIdentity(...args),
  signMessage: (...args: unknown[]): Promise<string> =>
    mockSignMessage(...args),
  getPublicIdentity: (...args: unknown[]): unknown =>
    mockGetPublicIdentity(...args),
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

const mockUnlockedIdentity = {
  ...mockStoredIdentity,
  privateKey: 'decrypted-private-key',
};

const mockPublicIdentity = {
  displayName: 'TestUser',
  publicKey: 'dGVzdC1wdWJsaWMta2V5',
  friendCode: 'ABCD-EFGH-JKLM-NPQR',
};

const mockUnits = [
  { id: 'unit-1', name: 'Atlas AS7-D', tonnage: 100 },
  { id: 'unit-2', name: 'Locust LCT-1V', tonnage: 20 },
];

// =============================================================================
// Tests
// =============================================================================

describe('/api/vault/sign', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPublicIdentity.mockReturnValue(mockPublicIdentity);
    mockSignMessage.mockResolvedValue('mock-signature-base64');
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

    it('should set Allow header for 405 responses', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PUT',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
      expect(res.getHeader('Allow')).toEqual(['POST']);
    });
  });

  describe('POST - Sign Bundle', () => {
    it('should create and sign a bundle with valid input', async () => {
      mockGetActive.mockResolvedValue(mockStoredIdentity);
      mockUnlockIdentity.mockResolvedValue(mockUnlockedIdentity);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          password: 'correctPassword',
          contentType: 'unit',
          items: mockUnits,
          description: 'Test bundle',
          tags: ['test'],
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = parseApiResponse<{
        success: boolean;
        bundle: {
          metadata: {
            version: string;
            contentType: string;
            itemCount: number;
            author: { displayName: string };
            description?: string;
            tags?: string[];
          };
          payload: string;
          signature: string;
        };
        suggestedFilename: string;
      }>(res);

      expect(data.success).toBe(true);
      expect(data.bundle).toBeDefined();
      expect(data.bundle.metadata.version).toBe('1.0.0');
      expect(data.bundle.metadata.contentType).toBe('unit');
      expect(data.bundle.metadata.itemCount).toBe(2);
      expect(data.bundle.metadata.author.displayName).toBe('TestUser');
      expect(data.bundle.metadata.description).toBe('Test bundle');
      expect(data.bundle.metadata.tags).toEqual(['test']);
      expect(data.bundle.signature).toBe('mock-signature-base64');
      expect(data.suggestedFilename).toBeDefined();
      expect(data.suggestedFilename).toContain('.mekbundle');
    });

    it('should reject missing password', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          contentType: 'unit',
          items: mockUnits,
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = parseErrorResponse(res);
      expect(data.error).toContain('Password is required');
    });

    it('should reject invalid content type', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          password: 'password',
          contentType: 'invalid',
          items: mockUnits,
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = parseErrorResponse(res);
      expect(data.error).toContain('Invalid content type');
    });

    it('should accept all valid content types', async () => {
      mockGetActive.mockResolvedValue(mockStoredIdentity);
      mockUnlockIdentity.mockResolvedValue(mockUnlockedIdentity);

      const contentTypes = ['unit', 'pilot', 'force', 'encounter'];

      for (const contentType of contentTypes) {
        const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'POST',
          body: {
            password: 'password',
            contentType,
            items: [{ id: '1', name: 'Test' }],
          },
        });

        await handler(req, res);

        expect(res._getStatusCode()).toBe(200);
      }
    });

    it('should reject empty items array', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          password: 'password',
          contentType: 'unit',
          items: [],
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = parseErrorResponse(res);
      expect(data.error).toContain('Items array is required');
    });

    it('should reject missing items', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          password: 'password',
          contentType: 'unit',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = parseErrorResponse(res);
      expect(data.error).toContain('Items array is required');
    });

    it('should return 404 if no identity found', async () => {
      mockGetActive.mockResolvedValue(null);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          password: 'password',
          contentType: 'unit',
          items: mockUnits,
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
          contentType: 'unit',
          items: mockUnits,
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(401);
      const data = parseErrorResponse(res);
      expect(data.error).toContain('Invalid password');
    });

    it('should generate filename from single item name', async () => {
      mockGetActive.mockResolvedValue(mockStoredIdentity);
      mockUnlockIdentity.mockResolvedValue(mockUnlockedIdentity);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          password: 'password',
          contentType: 'unit',
          items: [{ id: 'unit-1', name: 'Atlas AS7-D' }],
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = parseApiResponse<{ suggestedFilename: string }>(res);
      expect(data.suggestedFilename).toMatch(/^atlas-as7-d-\d{8}\.mekbundle$/);
    });

    it('should generate filename with count for multiple items', async () => {
      mockGetActive.mockResolvedValue(mockStoredIdentity);
      mockUnlockIdentity.mockResolvedValue(mockUnlockedIdentity);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          password: 'password',
          contentType: 'unit',
          items: mockUnits,
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = parseApiResponse<{ suggestedFilename: string }>(res);
      expect(data.suggestedFilename).toMatch(/^units-2-\d{8}\.mekbundle$/);
    });

    it('should include payload with items', async () => {
      mockGetActive.mockResolvedValue(mockStoredIdentity);
      mockUnlockIdentity.mockResolvedValue(mockUnlockedIdentity);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          password: 'password',
          contentType: 'unit',
          items: mockUnits,
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = parseApiResponse<{ bundle: { payload: string } }>(res);

      const payload = JSON.parse(data.bundle.payload) as typeof mockUnits;
      expect(payload).toHaveLength(2);
      expect(payload[0].id).toBe('unit-1');
      expect(payload[1].id).toBe('unit-2');
    });

    it('should handle signing errors', async () => {
      mockGetActive.mockResolvedValue(mockStoredIdentity);
      mockUnlockIdentity.mockResolvedValue(mockUnlockedIdentity);
      mockSignMessage.mockRejectedValue(new Error('Signing failed'));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          password: 'password',
          contentType: 'unit',
          items: mockUnits,
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = parseErrorResponse(res);
      expect(data.error).toBe('Signing failed');
    });

    it('should allow optional description and tags', async () => {
      mockGetActive.mockResolvedValue(mockStoredIdentity);
      mockUnlockIdentity.mockResolvedValue(mockUnlockedIdentity);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          password: 'password',
          contentType: 'unit',
          items: mockUnits,
          // No description or tags
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = parseApiResponse<{
        bundle: { metadata: { description?: string; tags?: string[] } };
      }>(res);

      expect(data.bundle.metadata.description).toBeUndefined();
      expect(data.bundle.metadata.tags).toBeUndefined();
    });
  });
});
