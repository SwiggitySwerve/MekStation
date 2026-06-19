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

  describe('revokeAllForGrantee', () => {
    it('should revoke all permissions for a grantee', async () => {
      await service.grant({
        granteeId: 'ABCD-EFGH-JKLM-NPQR',
        scopeType: 'item',
        scopeId: 'unit-1',
        level: 'read',
      });
      await service.grant({
        granteeId: 'ABCD-EFGH-JKLM-NPQR',
        scopeType: 'item',
        scopeId: 'unit-2',
        level: 'write',
      });
      await service.grant({
        granteeId: 'OTHER-USER-CODE',
        scopeType: 'item',
        scopeId: 'unit-1',
        level: 'read',
      });

      const count = await service.revokeAllForGrantee('ABCD-EFGH-JKLM-NPQR');

      expect(count).toBe(2);

      const remaining = await service.getAllGrants();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].granteeId).toBe('OTHER-USER-CODE');
    });
  });

  describe('revokeAllForItem', () => {
    it('should revoke all permissions for an item', async () => {
      await service.grant({
        granteeId: 'user-1',
        scopeType: 'item',
        scopeId: 'unit-123',
        level: 'read',
      });
      await service.grant({
        granteeId: 'user-2',
        scopeType: 'item',
        scopeId: 'unit-123',
        level: 'write',
      });
      await service.grant({
        granteeId: 'user-1',
        scopeType: 'item',
        scopeId: 'unit-456',
        level: 'read',
      });

      const count = await service.revokeAllForItem('item', 'unit-123');

      expect(count).toBe(2);

      const remaining = await service.getAllGrants();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].scopeId).toBe('unit-456');
    });
  });

  describe('cleanupExpired', () => {
    it('should remove expired permissions', async () => {
      const expiredAt = new Date(Date.now() - 1000).toISOString();
      const futureAt = new Date(Date.now() + 86400000).toISOString();

      await service.grant({
        granteeId: 'user-1',
        scopeType: 'item',
        scopeId: 'unit-1',
        level: 'read',
        expiresAt: expiredAt,
      });
      await service.grant({
        granteeId: 'user-2',
        scopeType: 'item',
        scopeId: 'unit-2',
        level: 'read',
        expiresAt: futureAt,
      });
      await service.grant({
        granteeId: 'user-3',
        scopeType: 'item',
        scopeId: 'unit-3',
        level: 'read',
        // No expiry
      });

      const count = await service.cleanupExpired();

      expect(count).toBe(1);

      const remaining = await service.getAllGrants();
      expect(remaining).toHaveLength(2);
    });
  });
});
