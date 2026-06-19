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

  describe('create', () => {
    it('should create item share link', async () => {
      const options: ICreateShareLinkOptions = {
        scopeType: 'item',
        scopeId: 'unit-123',
        level: 'read',
      };

      const result = await service.create(options);

      expect(result.success).toBe(true);
      expect(result.link).toBeDefined();
      expect(result.link?.scopeType).toBe('item');
      expect(result.link?.scopeId).toBe('unit-123');
      expect(result.link?.level).toBe('read');
      expect(result.link?.isActive).toBe(true);
      expect(result.url).toContain('mekstation://share/');
    });

    it('should create category share link', async () => {
      const options: ICreateShareLinkOptions = {
        scopeType: 'category',
        scopeCategory: 'units',
        level: 'write',
      };

      const result = await service.create(options);

      expect(result.success).toBe(true);
      expect(result.link?.scopeType).toBe('category');
      expect(result.link?.scopeCategory).toBe('units');
    });

    it('should create link with expiry', async () => {
      const expiresAt = new Date(Date.now() + 86400000).toISOString();
      const options: ICreateShareLinkOptions = {
        scopeType: 'item',
        scopeId: 'unit-123',
        level: 'read',
        expiresAt,
      };

      const result = await service.create(options);

      expect(result.success).toBe(true);
      expect(result.link?.expiresAt).toBe(expiresAt);
    });

    it('should create link with max uses', async () => {
      const options: ICreateShareLinkOptions = {
        scopeType: 'item',
        scopeId: 'unit-123',
        level: 'read',
        maxUses: 5,
      };

      const result = await service.create(options);

      expect(result.success).toBe(true);
      expect(result.link?.maxUses).toBe(5);
      expect(result.link?.useCount).toBe(0);
    });

    it('should create link with label', async () => {
      const options: ICreateShareLinkOptions = {
        scopeType: 'item',
        scopeId: 'unit-123',
        level: 'read',
        label: 'For Discord',
      };

      const result = await service.create(options);

      expect(result.success).toBe(true);
      expect(result.link?.label).toBe('For Discord');
    });

    it('should fail without level', async () => {
      const options = {
        scopeType: 'item',
        scopeId: 'unit-123',
      } as ICreateShareLinkOptions;

      const result = await service.create(options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('level');
    });

    it('should fail item scope without scope ID', async () => {
      const options: ICreateShareLinkOptions = {
        scopeType: 'item',
        level: 'read',
      };

      const result = await service.create(options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Scope ID');
    });

    it('should fail category scope without category', async () => {
      const options: ICreateShareLinkOptions = {
        scopeType: 'category',
        level: 'read',
      };

      const result = await service.create(options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Category');
    });
  });

  describe('URL handling', () => {
    it('should build custom protocol URL', () => {
      const url = service.buildUrl('test-token-123');
      expect(url).toBe('mekstation://share/test-token-123');
    });

    it('should build web URL', () => {
      const url = service.buildWebUrl('test-token-123');
      expect(url).toBe('/share/test-token-123');
    });

    it('should build web URL with host', () => {
      const url = service.buildWebUrl('test-token-123', 'example.com');
      expect(url).toBe('https://example.com/share/test-token-123');
    });

    describe('extractToken', () => {
      it('should extract from custom protocol URL', () => {
        const token = service.extractToken('mekstation://share/abc123xyz');
        expect(token).toBe('abc123xyz');
      });

      it('should extract from web URL', () => {
        const token = service.extractToken(
          'https://example.com/share/abc123xyz',
        );
        expect(token).toBe('abc123xyz');
      });

      it('should extract from path-only URL', () => {
        const token = service.extractToken('/share/abc123xyz');
        expect(token).toBe('abc123xyz');
      });

      it('should accept bare token (24+ chars)', () => {
        const token = service.extractToken('ABCDEFGHJKLMNPQRSTUVWXYZab');
        expect(token).toBe('ABCDEFGHJKLMNPQRSTUVWXYZab');
      });

      it('should return null for invalid URL', () => {
        expect(service.extractToken('invalid')).toBeNull();
        expect(service.extractToken('')).toBeNull();
        expect(service.extractToken('http://example.com/other')).toBeNull();
      });
    });
  });

  describe('redeem', () => {
    it('should redeem valid link', async () => {
      const createResult = await service.create({
        scopeType: 'item',
        scopeId: 'unit-123',
        level: 'read',
      });

      const result = await service.redeem(createResult.link!.token);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.link.useCount).toBe(1);
      }
    });

    it('should increment use count', async () => {
      const createResult = await service.create({
        scopeType: 'item',
        scopeId: 'unit-123',
        level: 'read',
      });

      await service.redeem(createResult.link!.token);
      await service.redeem(createResult.link!.token);
      const result = await service.redeem(createResult.link!.token);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.link.useCount).toBe(3);
      }
    });

    it('should fail for non-existent token', async () => {
      const result = await service.redeem('non-existent-token');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errorCode).toBe('NOT_FOUND');
      }
    });

    it('should fail for inactive link', async () => {
      const createResult = await service.create({
        scopeType: 'item',
        scopeId: 'unit-123',
        level: 'read',
      });
      await service.deactivate(createResult.link!.id);

      const result = await service.redeem(createResult.link!.token);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errorCode).toBe('INACTIVE');
      }
    });

    it('should fail for expired link', async () => {
      const expiredAt = new Date(Date.now() - 1000).toISOString();
      const createResult = await service.create({
        scopeType: 'item',
        scopeId: 'unit-123',
        level: 'read',
        expiresAt: expiredAt,
      });

      const result = await service.redeem(createResult.link!.token);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errorCode).toBe('EXPIRED');
      }
    });

    it('should fail when max uses reached', async () => {
      const createResult = await service.create({
        scopeType: 'item',
        scopeId: 'unit-123',
        level: 'read',
        maxUses: 2,
      });

      await service.redeem(createResult.link!.token);
      await service.redeem(createResult.link!.token);
      const result = await service.redeem(createResult.link!.token);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errorCode).toBe('MAX_USES');
      }
    });
  });

  describe('redeemByUrl', () => {
    it('should redeem from valid URL', async () => {
      const createResult = await service.create({
        scopeType: 'item',
        scopeId: 'unit-123',
        level: 'read',
      });

      const url = createResult.url!;
      const result = await service.redeemByUrl(url);

      expect(result.success).toBe(true);
    });

    it('should fail for invalid URL', async () => {
      const result = await service.redeemByUrl('invalid-url');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errorCode).toBe('INVALID');
      }
    });
  });

  describe('deactivate', () => {
    it('should deactivate link', async () => {
      const createResult = await service.create({
        scopeType: 'item',
        scopeId: 'unit-123',
        level: 'read',
      });

      const result = await service.deactivate(createResult.link!.id);

      expect(result.success).toBe(true);
      expect(result.link?.isActive).toBe(false);
    });

    it('should fail for non-existent link', async () => {
      const result = await service.deactivate('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('reactivate', () => {
    it('should reactivate link', async () => {
      const createResult = await service.create({
        scopeType: 'item',
        scopeId: 'unit-123',
        level: 'read',
      });
      await service.deactivate(createResult.link!.id);

      const result = await service.reactivate(createResult.link!.id);

      expect(result.success).toBe(true);
      expect(result.link?.isActive).toBe(true);
    });
  });

  describe('updateLabel', () => {
    it('should update label', async () => {
      const createResult = await service.create({
        scopeType: 'item',
        scopeId: 'unit-123',
        level: 'read',
      });

      const result = await service.updateLabel(
        createResult.link!.id,
        'New Label',
      );

      expect(result.success).toBe(true);
      expect(result.link?.label).toBe('New Label');
    });

    it('should clear label with null', async () => {
      const createResult = await service.create({
        scopeType: 'item',
        scopeId: 'unit-123',
        level: 'read',
        label: 'Original',
      });

      const result = await service.updateLabel(createResult.link!.id, null);

      expect(result.success).toBe(true);
      expect(result.link?.label).toBeUndefined();
    });
  });

  describe('updateExpiry', () => {
    it('should update expiry', async () => {
      const createResult = await service.create({
        scopeType: 'item',
        scopeId: 'unit-123',
        level: 'read',
      });

      const newExpiry = new Date(Date.now() + 86400000).toISOString();
      const result = await service.updateExpiry(
        createResult.link!.id,
        newExpiry,
      );

      expect(result.success).toBe(true);
      expect(result.link?.expiresAt).toBe(newExpiry);
    });
  });

  describe('updateMaxUses', () => {
    it('should update max uses', async () => {
      const createResult = await service.create({
        scopeType: 'item',
        scopeId: 'unit-123',
        level: 'read',
      });

      const result = await service.updateMaxUses(createResult.link!.id, 10);

      expect(result.success).toBe(true);
      expect(result.link?.maxUses).toBe(10);
    });
  });

  describe('delete', () => {
    it('should delete link', async () => {
      const createResult = await service.create({
        scopeType: 'item',
        scopeId: 'unit-123',
        level: 'read',
      });

      const result = await service.delete(createResult.link!.id);

      expect(result.success).toBe(true);

      const links = await service.getAllLinks();
      expect(links).toHaveLength(0);
    });

    it('should fail for non-existent link', async () => {
      const result = await service.delete('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });
});
