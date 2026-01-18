/**
 * Tests for /api/vault/share endpoints
 *
 * Tests share link CRUD and redemption:
 * - GET: List share links
 * - POST: Create share link
 * - PATCH: Update share link
 * - DELETE: Delete share link
 * - POST /redeem: Redeem share link
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';
import indexHandler from '@/pages/api/vault/share/index';
import idHandler from '@/pages/api/vault/share/[id]';
import redeemHandler from '@/pages/api/vault/share/redeem';
import { parseApiResponse, parseErrorResponse } from '../../helpers';

// =============================================================================
// Response Types for Type-Safe Assertions
// =============================================================================

interface ShareLink {
  id: string;
  token: string;
  scopeType: string;
  scopeId: string | null;
  scopeCategory: string | null;
  level: string;
  expiresAt: string | null;
  maxUses: number | null;
  useCount: number;
  createdAt: string;
  label: string | null;
  isActive: boolean;
}

interface ListLinksResponse {
  links: ShareLink[];
  count: number;
}

interface CreateLinkResponse {
  success: boolean;
  link: ShareLink;
  url: string;
}

interface GetLinkResponse {
  link: ShareLink;
  url: string;
  isValid: boolean;
}

interface RedeemResponse {
  success: boolean;
  link: ShareLink;
}

// =============================================================================
// Mocks
// =============================================================================

// Mock the share link service
const mockCreate = jest.fn();
const mockGetById = jest.fn();
const mockGetActiveLinks = jest.fn();
const mockGetAllLinks = jest.fn();
const mockDeactivate = jest.fn();
const mockReactivate = jest.fn();
const mockUpdateLabel = jest.fn();
const mockUpdateExpiry = jest.fn();
const mockUpdateMaxUses = jest.fn();
const mockDelete = jest.fn();
const mockRedeem = jest.fn();
const mockRedeemByUrl = jest.fn();
const mockBuildUrl = jest.fn((token: string) => `mekstation://share/${token}`);
const mockBuildWebUrl = jest.fn((token: string) => `/share/${token}`);
const mockIsLinkValid = jest.fn();
const mockGetRemainingUses = jest.fn();

jest.mock('@/services/vault/ShareLinkService', () => ({
  getShareLinkService: () => ({
    create: mockCreate,
    getById: mockGetById,
    getActiveLinks: mockGetActiveLinks,
    getAllLinks: mockGetAllLinks,
    deactivate: mockDeactivate,
    reactivate: mockReactivate,
    updateLabel: mockUpdateLabel,
    updateExpiry: mockUpdateExpiry,
    updateMaxUses: mockUpdateMaxUses,
    delete: mockDelete,
    redeem: mockRedeem,
    redeemByUrl: mockRedeemByUrl,
    buildUrl: mockBuildUrl,
    buildWebUrl: mockBuildWebUrl,
    isLinkValid: mockIsLinkValid,
    getRemainingUses: mockGetRemainingUses,
  }),
}));

// =============================================================================
// Test Data
// =============================================================================

const mockShareLink = {
  id: 'link-test-123',
  token: 'test-token-abc123xyz',
  scopeType: 'item',
  scopeId: 'unit-456',
  scopeCategory: null,
  level: 'read',
  expiresAt: null,
  maxUses: null,
  useCount: 0,
  createdAt: '2024-01-01T00:00:00.000Z',
  label: 'Test Link',
  isActive: true,
};

// =============================================================================
// Tests
// =============================================================================

describe('/api/vault/share', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // Index Handler (GET/POST)
  // ===========================================================================

  describe('GET /api/vault/share', () => {
    it('should list all share links', async () => {
      mockGetAllLinks.mockResolvedValue([mockShareLink]);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await indexHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = parseApiResponse<ListLinksResponse>(res);
      expect(data.links).toHaveLength(1);
      expect(data.count).toBe(1);
    });

    it('should filter to active links when requested', async () => {
      mockGetActiveLinks.mockResolvedValue([mockShareLink]);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { active: 'true' },
      });

      await indexHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(mockGetActiveLinks).toHaveBeenCalled();
      expect(mockGetAllLinks).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/vault/share', () => {
    it('should create a share link', async () => {
      mockCreate.mockResolvedValue({
        success: true,
        link: mockShareLink,
        url: 'mekstation://share/test-token-abc123xyz',
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          scopeType: 'item',
          scopeId: 'unit-456',
          level: 'read',
        },
      });

      await indexHandler(req, res);

      expect(res._getStatusCode()).toBe(201);
      const data = parseApiResponse<CreateLinkResponse>(res);
      expect(data.success).toBe(true);
      expect(data.link).toBeDefined();
      expect(data.url).toContain('mekstation://share/');
    });

    it('should validate scopeType', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          scopeType: 'invalid',
          level: 'read',
        },
      });

      await indexHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = parseErrorResponse(res);
      expect(data.error).toContain('scopeType');
    });

    it('should validate level', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          scopeType: 'item',
          scopeId: 'unit-123',
          level: 'superadmin',
        },
      });

      await indexHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = parseErrorResponse(res);
      expect(data.error).toContain('level');
    });

    it('should require scopeId for item scope', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          scopeType: 'item',
          level: 'read',
        },
      });

      await indexHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = parseErrorResponse(res);
      expect(data.error).toContain('scopeId');
    });

    it('should require scopeCategory for category scope', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          scopeType: 'category',
          level: 'read',
        },
      });

      await indexHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = parseErrorResponse(res);
      expect(data.error).toContain('scopeCategory');
    });

    it('should validate expiresAt format', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          scopeType: 'item',
          scopeId: 'unit-123',
          level: 'read',
          expiresAt: 'not-a-date',
        },
      });

      await indexHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = parseErrorResponse(res);
      expect(data.error).toContain('expiresAt');
    });

    it('should validate maxUses is positive', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          scopeType: 'item',
          scopeId: 'unit-123',
          level: 'read',
          maxUses: -5,
        },
      });

      await indexHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = parseErrorResponse(res);
      expect(data.error).toContain('maxUses');
    });

    it('should reject non-allowed methods', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PUT',
      });

      await indexHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
    });
  });

  // ===========================================================================
  // ID Handler (GET/PATCH/DELETE)
  // ===========================================================================

  describe('GET /api/vault/share/[id]', () => {
    it('should get share link by id', async () => {
      mockGetById.mockResolvedValue(mockShareLink);
      mockIsLinkValid.mockReturnValue(true);
      mockGetRemainingUses.mockReturnValue(null);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { id: 'link-test-123' },
      });

      await idHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = parseApiResponse<GetLinkResponse>(res);
      expect(data.link).toBeDefined();
      expect(data.url).toBeDefined();
      expect(data.isValid).toBe(true);
    });

    it('should return 404 for non-existent link', async () => {
      mockGetById.mockResolvedValue(null);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { id: 'non-existent' },
      });

      await idHandler(req, res);

      expect(res._getStatusCode()).toBe(404);
    });
  });

  describe('PATCH /api/vault/share/[id]', () => {
    it('should update label', async () => {
      mockGetById.mockResolvedValue(mockShareLink);
      mockUpdateLabel.mockResolvedValue({ success: true });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PATCH',
        query: { id: 'link-test-123' },
        body: { label: 'New Label' },
      });

      await idHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(mockUpdateLabel).toHaveBeenCalledWith('link-test-123', 'New Label');
    });

    it('should update isActive (deactivate)', async () => {
      mockGetById.mockResolvedValue(mockShareLink);
      mockDeactivate.mockResolvedValue({ success: true });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PATCH',
        query: { id: 'link-test-123' },
        body: { isActive: false },
      });

      await idHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(mockDeactivate).toHaveBeenCalledWith('link-test-123');
    });

    it('should update isActive (reactivate)', async () => {
      mockGetById.mockResolvedValue(mockShareLink);
      mockReactivate.mockResolvedValue({ success: true });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PATCH',
        query: { id: 'link-test-123' },
        body: { isActive: true },
      });

      await idHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(mockReactivate).toHaveBeenCalledWith('link-test-123');
    });

    it('should return 404 for non-existent link', async () => {
      mockGetById.mockResolvedValue(null);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PATCH',
        query: { id: 'non-existent' },
        body: { label: 'New Label' },
      });

      await idHandler(req, res);

      expect(res._getStatusCode()).toBe(404);
    });
  });

  describe('DELETE /api/vault/share/[id]', () => {
    it('should delete share link', async () => {
      mockDelete.mockResolvedValue({ success: true });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'DELETE',
        query: { id: 'link-test-123' },
      });

      await idHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(mockDelete).toHaveBeenCalledWith('link-test-123');
    });

    it('should return 404 for non-existent link', async () => {
      mockDelete.mockResolvedValue({ success: false, error: 'Share link not found' });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'DELETE',
        query: { id: 'non-existent' },
      });

      await idHandler(req, res);

      expect(res._getStatusCode()).toBe(404);
    });
  });

  // ===========================================================================
  // Redeem Handler
  // ===========================================================================

  describe('POST /api/vault/share/redeem', () => {
    it('should redeem valid token', async () => {
      mockRedeem.mockResolvedValue({
        success: true,
        link: { ...mockShareLink, useCount: 1 },
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: { token: 'test-token-abc123xyz' },
      });

      await redeemHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = parseApiResponse<RedeemResponse>(res);
      expect(data.success).toBe(true);
      expect(data.link.useCount).toBe(1);
    });

    it('should redeem by URL', async () => {
      mockRedeemByUrl.mockResolvedValue({
        success: true,
        link: mockShareLink,
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: { url: 'mekstation://share/test-token' },
      });

      await redeemHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(mockRedeemByUrl).toHaveBeenCalledWith('mekstation://share/test-token');
    });

    it('should return 404 for non-existent token', async () => {
      mockRedeem.mockResolvedValue({
        success: false,
        error: 'Share link not found',
        errorCode: 'NOT_FOUND',
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: { token: 'non-existent' },
      });

      await redeemHandler(req, res);

      expect(res._getStatusCode()).toBe(404);
    });

    it('should return 410 for expired link', async () => {
      mockRedeem.mockResolvedValue({
        success: false,
        error: 'Share link has expired',
        errorCode: 'EXPIRED',
        link: mockShareLink,
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: { token: 'expired-token' },
      });

      await redeemHandler(req, res);

      expect(res._getStatusCode()).toBe(410);
    });

    it('should return 410 for max uses reached', async () => {
      mockRedeem.mockResolvedValue({
        success: false,
        error: 'Share link has reached maximum uses',
        errorCode: 'MAX_USES',
        link: mockShareLink,
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: { token: 'maxed-token' },
      });

      await redeemHandler(req, res);

      expect(res._getStatusCode()).toBe(410);
    });

    it('should require token or url', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {},
      });

      await redeemHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = parseErrorResponse(res);
      expect(data.error).toContain('token or url');
    });

    it('should reject non-POST methods', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await redeemHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
    });
  });
});
