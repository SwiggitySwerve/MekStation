/**
 * Share Link Service Tests
 *
 * Tests for share link creation, redemption, and URL handling.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type { IShareLink } from '@/types/vault';

import {
  ShareLinkService,
  ICreateShareLinkOptions,
} from '@/services/vault/ShareLinkService';

import { MockShareLinkRepository } from './shareLinkService.test-helpers';

// =============================================================================
// Mock Repository
// =============================================================================

// =============================================================================
// Tests
// =============================================================================

describe('ShareLinkService', () => {
  let mockRepo: MockShareLinkRepository;
  let service: ShareLinkService;

  beforeEach(() => {
    mockRepo = new MockShareLinkRepository();
    // oxlint-disable-next-line @typescript-eslint/no-explicit-any
    service = new ShareLinkService(mockRepo as any, 'mekstation://share');
  });

  // ===========================================================================
  // Creating Share Links
  // ===========================================================================

  describe('deleteAllForItem', () => {
    it('should delete all links for item', async () => {
      await service.create({
        scopeType: 'item',
        scopeId: 'unit-1',
        level: 'read',
      });
      await service.create({
        scopeType: 'item',
        scopeId: 'unit-1',
        level: 'write',
      });
      await service.create({
        scopeType: 'item',
        scopeId: 'unit-2',
        level: 'read',
      });

      const count = await service.deleteAllForItem('item', 'unit-1');

      expect(count).toBe(2);

      const remaining = await service.getAllLinks();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].scopeId).toBe('unit-2');
    });
  });

  describe('isLinkValid', () => {
    it('should return true for valid active link', async () => {
      const createResult = await service.create({
        scopeType: 'item',
        scopeId: 'unit-123',
        level: 'read',
      });

      expect(service.isLinkValid(createResult.link!)).toBe(true);
    });

    it('should return false for inactive link', async () => {
      const createResult = await service.create({
        scopeType: 'item',
        scopeId: 'unit-123',
        level: 'read',
      });
      await service.deactivate(createResult.link!.id);
      const link = await service.getById(createResult.link!.id);

      expect(service.isLinkValid(link!)).toBe(false);
    });

    it('should return false for expired link', () => {
      const expiredLink: IShareLink = {
        id: 'test',
        token: 'test',
        scopeType: 'item',
        scopeId: 'test',
        scopeCategory: null,
        level: 'read',
        expiresAt: new Date(Date.now() - 1000).toISOString(),
        maxUses: null,
        useCount: 0,
        createdAt: new Date().toISOString(),
        isActive: true,
      };

      expect(service.isLinkValid(expiredLink)).toBe(false);
    });

    it('should return false for max uses reached', () => {
      const maxedLink: IShareLink = {
        id: 'test',
        token: 'test',
        scopeType: 'item',
        scopeId: 'test',
        scopeCategory: null,
        level: 'read',
        expiresAt: null,
        maxUses: 5,
        useCount: 5,
        createdAt: new Date().toISOString(),
        isActive: true,
      };

      expect(service.isLinkValid(maxedLink)).toBe(false);
    });
  });

  describe('getRemainingUses', () => {
    it('should return null for unlimited', () => {
      const link: IShareLink = {
        id: 'test',
        token: 'test',
        scopeType: 'item',
        scopeId: 'test',
        scopeCategory: null,
        level: 'read',
        expiresAt: null,
        maxUses: null,
        useCount: 100,
        createdAt: new Date().toISOString(),
        isActive: true,
      };

      expect(service.getRemainingUses(link)).toBeNull();
    });

    it('should return remaining count', () => {
      const link: IShareLink = {
        id: 'test',
        token: 'test',
        scopeType: 'item',
        scopeId: 'test',
        scopeCategory: null,
        level: 'read',
        expiresAt: null,
        maxUses: 10,
        useCount: 3,
        createdAt: new Date().toISOString(),
        isActive: true,
      };

      expect(service.getRemainingUses(link)).toBe(7);
    });

    it('should return 0 when exceeded', () => {
      const link: IShareLink = {
        id: 'test',
        token: 'test',
        scopeType: 'item',
        scopeId: 'test',
        scopeCategory: null,
        level: 'read',
        expiresAt: null,
        maxUses: 5,
        useCount: 10,
        createdAt: new Date().toISOString(),
        isActive: true,
      };

      expect(service.getRemainingUses(link)).toBe(0);
    });
  });
});
