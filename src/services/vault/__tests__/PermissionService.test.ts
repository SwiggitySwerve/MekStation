/**
 * Permission Service Tests
 *
 * Tests for permission management including granting, revoking,
 * and checking permissions with inheritance.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import {
  PermissionService,
  IGrantPermissionOptions,
} from '@/services/vault/PermissionService';

import { MockPermissionRepository } from './permissionService.test-helpers';

// =============================================================================
// Mock Repository
// =============================================================================

// =============================================================================
// Tests
// =============================================================================

describe('PermissionService', () => {
  let mockRepo: MockPermissionRepository;
  let service: PermissionService;

  beforeEach(() => {
    mockRepo = new MockPermissionRepository();
    // oxlint-disable-next-line @typescript-eslint/no-explicit-any
    service = new PermissionService(mockRepo as any);
  });

  // ===========================================================================
  // Granting Permissions
  // ===========================================================================

  describe('grant', () => {
    it('should grant item permission', async () => {
      const options: IGrantPermissionOptions = {
        granteeId: 'ABCD-EFGH-JKLM-NPQR',
        scopeType: 'item',
        scopeId: 'unit-123',
        level: 'read',
        granteeName: 'Test User',
      };

      const result = await service.grant(options);

      expect(result.success).toBe(true);
      expect(result.grant).toBeDefined();
      expect(result.grant?.granteeId).toBe('ABCD-EFGH-JKLM-NPQR');
      expect(result.grant?.scopeType).toBe('item');
      expect(result.grant?.scopeId).toBe('unit-123');
      expect(result.grant?.level).toBe('read');
      expect(result.grant?.granteeName).toBe('Test User');
    });

    it('should grant category permission', async () => {
      const options: IGrantPermissionOptions = {
        granteeId: 'ABCD-EFGH-JKLM-NPQR',
        scopeType: 'category',
        scopeCategory: 'units',
        level: 'write',
      };

      const result = await service.grant(options);

      expect(result.success).toBe(true);
      expect(result.grant?.scopeType).toBe('category');
      expect(result.grant?.scopeCategory).toBe('units');
      expect(result.grant?.level).toBe('write');
    });

    it('should grant vault-wide permission', async () => {
      const options: IGrantPermissionOptions = {
        granteeId: 'ABCD-EFGH-JKLM-NPQR',
        scopeType: 'all',
        level: 'admin',
      };

      const result = await service.grant(options);

      expect(result.success).toBe(true);
      expect(result.grant?.scopeType).toBe('all');
      expect(result.grant?.level).toBe('admin');
    });

    it('should grant public permission', async () => {
      const options: IGrantPermissionOptions = {
        granteeId: 'public',
        scopeType: 'item',
        scopeId: 'unit-public',
        level: 'read',
      };

      const result = await service.grant(options);

      expect(result.success).toBe(true);
      expect(result.grant?.granteeId).toBe('public');
    });

    it('should grant permission with expiry', async () => {
      const expiresAt = new Date(Date.now() + 86400000).toISOString(); // +1 day
      const options: IGrantPermissionOptions = {
        granteeId: 'ABCD-EFGH-JKLM-NPQR',
        scopeType: 'item',
        scopeId: 'unit-123',
        level: 'read',
        expiresAt,
      };

      const result = await service.grant(options);

      expect(result.success).toBe(true);
      expect(result.grant?.expiresAt).toBe(expiresAt);
    });

    it('should fail without grantee ID', async () => {
      const options: IGrantPermissionOptions = {
        granteeId: '',
        scopeType: 'item',
        scopeId: 'unit-123',
        level: 'read',
      };

      const result = await service.grant(options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Grantee ID');
    });

    it('should fail without level', async () => {
      const options = {
        granteeId: 'ABCD-EFGH-JKLM-NPQR',
        scopeType: 'item',
        scopeId: 'unit-123',
      } as IGrantPermissionOptions;

      const result = await service.grant(options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('level');
    });

    it('should fail item scope without scope ID', async () => {
      const options: IGrantPermissionOptions = {
        granteeId: 'ABCD-EFGH-JKLM-NPQR',
        scopeType: 'item',
        level: 'read',
      };

      const result = await service.grant(options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Scope ID');
    });

    it('should fail category scope without category', async () => {
      const options: IGrantPermissionOptions = {
        granteeId: 'ABCD-EFGH-JKLM-NPQR',
        scopeType: 'category',
        level: 'read',
      };

      const result = await service.grant(options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Category');
    });
  });

  describe('revoke', () => {
    it('should revoke existing permission', async () => {
      const grantResult = await service.grant({
        granteeId: 'ABCD-EFGH-JKLM-NPQR',
        scopeType: 'item',
        scopeId: 'unit-123',
        level: 'read',
      });

      const revokeResult = await service.revoke(grantResult.grant!.id);

      expect(revokeResult.success).toBe(true);

      const grants = await service.getAllGrants();
      expect(grants).toHaveLength(0);
    });

    it('should fail for non-existent permission', async () => {
      const result = await service.revoke('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('check', () => {
    it('should find item permission', async () => {
      await service.grant({
        granteeId: 'ABCD-EFGH-JKLM-NPQR',
        scopeType: 'item',
        scopeId: 'unit-123',
        level: 'read',
      });

      const result = await service.check(
        'ABCD-EFGH-JKLM-NPQR',
        'item',
        'unit-123',
      );

      expect(result.hasAccess).toBe(true);
      expect(result.level).toBe('read');
    });

    it('should inherit from category', async () => {
      await service.grant({
        granteeId: 'ABCD-EFGH-JKLM-NPQR',
        scopeType: 'category',
        scopeCategory: 'units',
        level: 'write',
      });

      const result = await service.check(
        'ABCD-EFGH-JKLM-NPQR',
        'item',
        'unit-123',
        'units',
      );

      expect(result.hasAccess).toBe(true);
      expect(result.level).toBe('write');
    });

    it('should inherit from vault-wide', async () => {
      await service.grant({
        granteeId: 'ABCD-EFGH-JKLM-NPQR',
        scopeType: 'all',
        level: 'admin',
      });

      const result = await service.check(
        'ABCD-EFGH-JKLM-NPQR',
        'item',
        'unit-123',
      );

      expect(result.hasAccess).toBe(true);
      expect(result.level).toBe('admin');
    });

    it('should inherit from public', async () => {
      await service.grant({
        granteeId: 'public',
        scopeType: 'item',
        scopeId: 'unit-123',
        level: 'read',
      });

      const result = await service.check('OTHER-USER-CODE', 'item', 'unit-123');

      expect(result.hasAccess).toBe(true);
      expect(result.level).toBe('read');
    });

    it('should return no access when no permission', async () => {
      const result = await service.check(
        'ABCD-EFGH-JKLM-NPQR',
        'item',
        'unit-123',
      );

      expect(result.hasAccess).toBe(false);
      expect(result.level).toBeNull();
    });

    it('should respect expiry', async () => {
      const expiredAt = new Date(Date.now() - 1000).toISOString(); // 1 second ago

      await service.grant({
        granteeId: 'ABCD-EFGH-JKLM-NPQR',
        scopeType: 'item',
        scopeId: 'unit-123',
        level: 'read',
        expiresAt: expiredAt,
      });

      const result = await service.check(
        'ABCD-EFGH-JKLM-NPQR',
        'item',
        'unit-123',
      );

      expect(result.hasAccess).toBe(false);
    });
  });

  describe('canPerformAction', () => {
    beforeEach(async () => {
      await service.grant({
        granteeId: 'reader',
        scopeType: 'item',
        scopeId: 'unit-123',
        level: 'read',
      });

      await service.grant({
        granteeId: 'writer',
        scopeType: 'item',
        scopeId: 'unit-123',
        level: 'write',
      });

      await service.grant({
        granteeId: 'admin',
        scopeType: 'item',
        scopeId: 'unit-123',
        level: 'admin',
      });
    });

    it('should allow read with any permission level', async () => {
      expect(
        await service.canPerformAction('reader', 'read', 'item', 'unit-123'),
      ).toBe(true);
      expect(
        await service.canPerformAction('writer', 'read', 'item', 'unit-123'),
      ).toBe(true);
      expect(
        await service.canPerformAction('admin', 'read', 'item', 'unit-123'),
      ).toBe(true);
    });

    it('should allow write with write or admin', async () => {
      expect(
        await service.canPerformAction('reader', 'write', 'item', 'unit-123'),
      ).toBe(false);
      expect(
        await service.canPerformAction('writer', 'write', 'item', 'unit-123'),
      ).toBe(true);
      expect(
        await service.canPerformAction('admin', 'write', 'item', 'unit-123'),
      ).toBe(true);
    });

    it('should allow admin only with admin', async () => {
      expect(
        await service.canPerformAction('reader', 'admin', 'item', 'unit-123'),
      ).toBe(false);
      expect(
        await service.canPerformAction('writer', 'admin', 'item', 'unit-123'),
      ).toBe(false);
      expect(
        await service.canPerformAction('admin', 'admin', 'item', 'unit-123'),
      ).toBe(true);
    });

    it('should deny with no permission', async () => {
      expect(
        await service.canPerformAction('nobody', 'read', 'item', 'unit-123'),
      ).toBe(false);
    });
  });

  describe('updateLevel', () => {
    it('should update permission level', async () => {
      const grantResult = await service.grant({
        granteeId: 'ABCD-EFGH-JKLM-NPQR',
        scopeType: 'item',
        scopeId: 'unit-123',
        level: 'read',
      });

      const updateResult = await service.updateLevel(
        grantResult.grant!.id,
        'write',
      );

      expect(updateResult.success).toBe(true);
      expect(updateResult.grant?.level).toBe('write');
    });

    it('should fail for non-existent permission', async () => {
      const result = await service.updateLevel('non-existent', 'write');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('updateExpiry', () => {
    it('should update permission expiry', async () => {
      const grantResult = await service.grant({
        granteeId: 'ABCD-EFGH-JKLM-NPQR',
        scopeType: 'item',
        scopeId: 'unit-123',
        level: 'read',
      });

      const newExpiry = new Date(Date.now() + 86400000).toISOString();
      const updateResult = await service.updateExpiry(
        grantResult.grant!.id,
        newExpiry,
      );

      expect(updateResult.success).toBe(true);
      expect(updateResult.grant?.expiresAt).toBe(newExpiry);
    });

    it('should clear expiry with null', async () => {
      const grantResult = await service.grant({
        granteeId: 'ABCD-EFGH-JKLM-NPQR',
        scopeType: 'item',
        scopeId: 'unit-123',
        level: 'read',
        expiresAt: new Date().toISOString(),
      });

      const updateResult = await service.updateExpiry(
        grantResult.grant!.id,
        null,
      );

      expect(updateResult.success).toBe(true);
      expect(updateResult.grant?.expiresAt).toBeNull();
    });
  });
});
