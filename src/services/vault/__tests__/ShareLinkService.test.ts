/**
 * Share Link Service Tests
 *
 * Tests for share link creation, redemption, and URL handling.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import {
  ShareLinkService,
  ICreateShareLinkOptions,
} from '@/services/vault/ShareLinkService';
import type {
  IShareLink,
  IShareLinkOptions,
  IShareLinkRedeemResult,
  PermissionScopeType,
  ContentCategory,
} from '@/types/vault';

// =============================================================================
// Mock Repository
// =============================================================================

class MockShareLinkRepository {
  private links: Map<string, IShareLink> = new Map();
  private idCounter = 0;

  async create(
    scopeType: PermissionScopeType,
    scopeId: string | null,
    scopeCategory: ContentCategory | null,
    options: IShareLinkOptions
  ): Promise<IShareLink> {
    const id = `link-mock-${++this.idCounter}`;
    const token = `test-token-${this.idCounter}`;
    const createdAt = new Date().toISOString();

    const link: IShareLink = {
      id,
      token,
      scopeType,
      scopeId,
      scopeCategory,
      level: options.level,
      expiresAt: options.expiresAt || null,
      maxUses: options.maxUses || null,
      useCount: 0,
      createdAt,
      label: options.label,
      isActive: true,
    };

    this.links.set(id, link);
    return link;
  }

  async getById(id: string): Promise<IShareLink | null> {
    return this.links.get(id) || null;
  }

  async getByToken(token: string): Promise<IShareLink | null> {
    const links = Array.from(this.links.values());
    for (const link of links) {
      if (link.token === token) {
        return link;
      }
    }
    return null;
  }

  async getByItem(
    scopeType: PermissionScopeType,
    scopeId: string
  ): Promise<IShareLink[]> {
    return Array.from(this.links.values()).filter(
      (l) => l.scopeType === scopeType && l.scopeId === scopeId
    );
  }

  async getActive(): Promise<IShareLink[]> {
    return Array.from(this.links.values()).filter((l) => l.isActive);
  }

  async getAll(): Promise<IShareLink[]> {
    return Array.from(this.links.values());
  }

  async redeem(token: string): Promise<IShareLinkRedeemResult> {
    const link = await this.getByToken(token);

    if (!link) {
      return { success: false, error: { message: 'Share link not found', errorCode: 'NOT_FOUND' as const } };
    }

    if (!link.isActive) {
      return { success: false, error: { message: 'Share link is inactive', errorCode: 'INACTIVE' as const } };
    }

    if (link.expiresAt) {
      const now = new Date();
      const expiry = new Date(link.expiresAt);
      if (now > expiry) {
        return { success: false, error: { message: 'Share link has expired', errorCode: 'EXPIRED' as const } };
      }
    }

    if (link.maxUses !== null && link.useCount >= link.maxUses) {
      return { success: false, error: { message: 'Share link has reached maximum uses', errorCode: 'MAX_USES' as const } };
    }

    // Increment use count
    const updatedLink = { ...link, useCount: link.useCount + 1 };
    this.links.set(link.id, updatedLink);

    return { success: true, data: { link: updatedLink } };
  }

  async deactivate(id: string): Promise<boolean> {
    const link = this.links.get(id);
    if (!link) return false;
    this.links.set(id, { ...link, isActive: false });
    return true;
  }

  async reactivate(id: string): Promise<boolean> {
    const link = this.links.get(id);
    if (!link) return false;
    this.links.set(id, { ...link, isActive: true });
    return true;
  }

  async updateLabel(id: string, label: string | null): Promise<boolean> {
    const link = this.links.get(id);
    if (!link) return false;
    this.links.set(id, { ...link, label: label || undefined });
    return true;
  }

  async updateExpiry(id: string, expiresAt: string | null): Promise<boolean> {
    const link = this.links.get(id);
    if (!link) return false;
    this.links.set(id, { ...link, expiresAt });
    return true;
  }

  async updateMaxUses(id: string, maxUses: number | null): Promise<boolean> {
    const link = this.links.get(id);
    if (!link) return false;
    this.links.set(id, { ...link, maxUses });
    return true;
  }

  async delete(id: string): Promise<boolean> {
    return this.links.delete(id);
  }

  async deleteByItem(
    scopeType: PermissionScopeType,
    scopeId: string
  ): Promise<number> {
    let count = 0;
    const entries = Array.from(this.links.entries());
    for (const [id, link] of entries) {
      if (link.scopeType === scopeType && link.scopeId === scopeId) {
        this.links.delete(id);
        count++;
      }
    }
    return count;
  }

  async cleanupExpired(): Promise<number> {
    const now = new Date().toISOString();
    let count = 0;
    const entries = Array.from(this.links.entries());
    for (const [id, link] of entries) {
      if (link.expiresAt && link.expiresAt < now) {
        this.links.delete(id);
        count++;
      }
    }
    return count;
  }

  // Test helper
  clear(): void {
    this.links.clear();
    this.idCounter = 0;
  }
}

// =============================================================================
// Tests
// =============================================================================

describe('ShareLinkService', () => {
  let mockRepo: MockShareLinkRepository;
  let service: ShareLinkService;

  beforeEach(() => {
    mockRepo = new MockShareLinkRepository();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // ===========================================================================
  // URL Building
  // ===========================================================================

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
        const token = service.extractToken('https://example.com/share/abc123xyz');
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

  // ===========================================================================
  // Redeeming Share Links
  // ===========================================================================

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

  // ===========================================================================
  // Deactivate / Reactivate
  // ===========================================================================

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

  // ===========================================================================
  // Updating Links
  // ===========================================================================

  describe('updateLabel', () => {
    it('should update label', async () => {
      const createResult = await service.create({
        scopeType: 'item',
        scopeId: 'unit-123',
        level: 'read',
      });

      const result = await service.updateLabel(createResult.link!.id, 'New Label');

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
      const result = await service.updateExpiry(createResult.link!.id, newExpiry);

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

  // ===========================================================================
  // Deleting Links
  // ===========================================================================

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

  describe('deleteAllForItem', () => {
    it('should delete all links for item', async () => {
      await service.create({ scopeType: 'item', scopeId: 'unit-1', level: 'read' });
      await service.create({ scopeType: 'item', scopeId: 'unit-1', level: 'write' });
      await service.create({ scopeType: 'item', scopeId: 'unit-2', level: 'read' });

      const count = await service.deleteAllForItem('item', 'unit-1');

      expect(count).toBe(2);

      const remaining = await service.getAllLinks();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].scopeId).toBe('unit-2');
    });
  });

  // ===========================================================================
  // Validation Helpers
  // ===========================================================================

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
