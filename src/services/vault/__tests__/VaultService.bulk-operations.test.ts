/**
 * Vault Service Tests
 *
 * Tests for vault folder management and sharing functionality.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import { VaultService } from '@/services/vault/VaultService';

import {
  MockPermissionService,
  MockVaultFolderRepository,
  mockContacts,
} from './vaultService.test-helpers';

// =============================================================================
// Tests
// =============================================================================

describe('VaultService', () => {
  let service: VaultService;
  let mockFolderRepo: MockVaultFolderRepository;
  let mockPermissionService: MockPermissionService;

  beforeEach(() => {
    mockFolderRepo = new MockVaultFolderRepository();
    mockPermissionService = new MockPermissionService();
    service = new VaultService(
      mockFolderRepo as never,
      mockPermissionService as never,
    );
  });

  // ===========================================================================
  // Folder Management
  // ===========================================================================

  describe('Bulk Operations', () => {
    beforeEach(() => {
      mockContacts.clear();
      mockPermissionService.clear();
    });

    it('should share folder with multiple contacts', async () => {
      const folder = await service.createFolder('Shared');

      const result = await service.shareFolderWithContacts(folder.id, [
        { friendCode: 'PEER-1', level: 'read' },
        { friendCode: 'PEER-2', level: 'write' },
        { friendCode: 'PEER-3', level: 'admin' },
      ]);

      expect(result.success).toBe(3);
      expect(result.failed).toBe(0);
    });

    it('should share multiple items with contact', async () => {
      const result = await service.shareItemsWithContact(
        [
          { itemId: 'unit-1', itemType: 'unit' },
          { itemId: 'pilot-1', itemType: 'pilot' },
          { itemId: 'force-1', itemType: 'force' },
        ],
        'PEER-1234-ABCD',
        'read',
      );

      expect(result.success).toBe(3);
      expect(result.failed).toBe(0);
    });

    it('should share folder contents with contact', async () => {
      const folder = await service.createFolder('Units');
      await service.addItemToFolder(folder.id, 'unit-1', 'unit');
      await service.addItemToFolder(folder.id, 'unit-2', 'unit');

      const result = await service.shareFolderContentsWithContact(
        folder.id,
        'PEER-1234-ABCD',
        'read',
      );

      expect(result.folderShared).toBe(true);
      expect(result.itemsShared).toBe(2);
    });

    it('should revoke all permissions for contact', async () => {
      mockPermissionService.seedPermission({
        id: 'perm-1',
        granteeId: 'PEER-1234-ABCD',
        scopeType: 'folder',
        scopeId: 'folder-1',
        level: 'read',
      });
      mockPermissionService.seedPermission({
        id: 'perm-2',
        granteeId: 'PEER-1234-ABCD',
        scopeType: 'item',
        scopeId: 'unit:unit-1',
        level: 'write',
      });

      const revoked = await service.revokeAllForContact('PEER-1234-ABCD');

      expect(revoked).toBe(2);
    });

    it('should update permission level for all contact shares', async () => {
      mockPermissionService.seedPermission({
        id: 'perm-1',
        granteeId: 'PEER-1234-ABCD',
        scopeType: 'folder',
        scopeId: 'folder-1',
        level: 'read',
      });
      mockPermissionService.seedPermission({
        id: 'perm-2',
        granteeId: 'PEER-1234-ABCD',
        scopeType: 'item',
        scopeId: 'unit:unit-1',
        level: 'read',
      });

      const updated = await service.updateContactPermissionLevel(
        'PEER-1234-ABCD',
        'write',
      );

      expect(updated).toBe(2);
    });
  });

  describe('Access Checking', () => {
    beforeEach(() => {
      mockPermissionService.clear();
    });

    it('should check folder access', async () => {
      const folder = await service.createFolder('Protected');
      mockPermissionService.seedPermission({
        id: 'perm-1',
        granteeId: 'PEER-1234-ABCD',
        scopeType: 'folder',
        scopeId: folder.id,
        level: 'read',
      });

      const level = await service.canAccessFolder(folder.id, 'PEER-1234-ABCD');

      expect(level).toBe('read');
    });

    it('should return null for no folder access', async () => {
      const folder = await service.createFolder('Protected');

      const level = await service.canAccessFolder(folder.id, 'UNKNOWN-PEER');

      expect(level).toBeNull();
    });

    it('should check item access via direct permission', async () => {
      mockPermissionService.seedPermission({
        id: 'perm-1',
        granteeId: 'PEER-1234-ABCD',
        scopeType: 'item',
        scopeId: 'unit:unit-123',
        level: 'write',
      });

      const level = await service.canAccessItem(
        'unit-123',
        'unit',
        'PEER-1234-ABCD',
      );

      expect(level).toBe('write');
    });

    it('should check item access via folder permission', async () => {
      const folder = await service.createFolder('Units');
      await service.addItemToFolder(folder.id, 'unit-123', 'unit');
      mockPermissionService.seedPermission({
        id: 'perm-1',
        granteeId: 'PEER-1234-ABCD',
        scopeType: 'folder',
        scopeId: folder.id,
        level: 'admin',
      });

      const level = await service.canAccessItem(
        'unit-123',
        'unit',
        'PEER-1234-ABCD',
      );

      expect(level).toBe('admin');
    });

    it('should check item access via category permission', async () => {
      mockPermissionService.seedPermission({
        id: 'perm-1',
        granteeId: 'PEER-1234-ABCD',
        scopeType: 'category',
        scopeId: null,
        scopeCategory: 'units',
        level: 'read',
      });

      const level = await service.canAccessItem(
        'unit-123',
        'unit',
        'PEER-1234-ABCD',
      );

      expect(level).toBe('read');
    });

    it('should get shared content for user', async () => {
      mockPermissionService.seedPermission({
        id: 'perm-1',
        granteeId: 'MY-FRIEND-CODE',
        scopeType: 'folder',
        scopeId: 'folder-1',
        level: 'read',
      });

      const shared = await service.getSharedWithMe('MY-FRIEND-CODE');

      expect(shared).toHaveLength(1);
      expect(shared[0].scopeType).toBe('folder');
      expect(shared[0].level).toBe('read');
    });

    it('should exclude public permissions from shared with me', async () => {
      mockPermissionService.seedPermission({
        id: 'perm-1',
        granteeId: 'public',
        scopeType: 'item',
        scopeId: 'unit:unit-1',
        level: 'read',
      });

      const shared = await service.getSharedWithMe('MY-FRIEND-CODE');

      expect(shared).toHaveLength(0);
    });
  });

  describe('Public Sharing', () => {
    beforeEach(() => {
      mockPermissionService.clear();
    });

    it('should make item public', async () => {
      const result = await service.makePublic('unit-123', 'unit', 'read');

      expect(result).toBe(true);
    });

    it('should make item public with default level', async () => {
      const result = await service.makePublic('unit-123', 'unit');

      expect(result).toBe(true);
    });

    it('should make folder public', async () => {
      const folder = await service.createFolder('Public Folder');

      const result = await service.makeFolderPublic(folder.id, 'read');

      expect(result).toBe(true);
      const updated = await service.getFolder(folder.id);
      expect(updated?.isShared).toBe(true);
    });

    it('should make category public', async () => {
      const result = await service.makeCategoryPublic('units', 'read');

      expect(result).toBe(true);
    });

    it('should remove public access from item', async () => {
      await service.makePublic('unit-123', 'unit');
      mockPermissionService.seedPermission({
        id: 'public-perm',
        granteeId: 'public',
        scopeType: 'item',
        scopeId: 'unit:unit-123',
        level: 'read',
      });

      const result = await service.removePublicAccess('unit-123', 'unit');

      expect(result).toBe(true);
    });

    it('should remove public access from folder', async () => {
      const folder = await service.createFolder('Was Public');
      await service.makeFolderPublic(folder.id);
      mockPermissionService.seedPermission({
        id: 'public-perm',
        granteeId: 'public',
        scopeType: 'folder',
        scopeId: folder.id,
        level: 'read',
      });

      const result = await service.removeFolderPublicAccess(folder.id);

      expect(result).toBe(true);
    });

    it('should check if item is public', async () => {
      mockPermissionService.seedPermission({
        id: 'public-perm',
        granteeId: 'public',
        scopeType: 'item',
        scopeId: 'unit:unit-123',
        level: 'read',
      });

      const level = await service.isPublic('unit-123', 'unit');

      expect(level).toBe('read');
    });

    it('should return null for non-public item', async () => {
      const level = await service.isPublic('unit-123', 'unit');

      expect(level).toBeNull();
    });

    it('should check if folder is public', async () => {
      const folder = await service.createFolder('Public');
      mockPermissionService.seedPermission({
        id: 'public-perm',
        granteeId: 'public',
        scopeType: 'folder',
        scopeId: folder.id,
        level: 'write',
      });

      const level = await service.isFolderPublic(folder.id);

      expect(level).toBe('write');
    });

    it('should get all public items', async () => {
      mockPermissionService.seedPermission({
        id: 'pub-1',
        granteeId: 'public',
        scopeType: 'item',
        scopeId: 'unit:unit-1',
        level: 'read',
      });
      mockPermissionService.seedPermission({
        id: 'pub-2',
        granteeId: 'public',
        scopeType: 'folder',
        scopeId: 'folder-1',
        level: 'read',
      });

      const items = await service.getPublicItems();

      expect(items).toHaveLength(2);
    });
  });

  describe('Delete Folder with Permissions', () => {
    beforeEach(() => {
      mockPermissionService.clear();
    });

    it('should revoke permissions when deleting folder', async () => {
      const folder = await service.createFolder('To Delete');
      mockPermissionService.seedPermission({
        id: 'perm-1',
        granteeId: 'PEER-1',
        scopeType: 'folder',
        scopeId: folder.id,
        level: 'read',
      });
      mockPermissionService.seedPermission({
        id: 'perm-2',
        granteeId: 'PEER-2',
        scopeType: 'folder',
        scopeId: folder.id,
        level: 'write',
      });

      await service.deleteFolder(folder.id);

      const perms = await mockPermissionService.getGrantsForItem(
        'folder',
        folder.id,
      );
      expect(perms).toHaveLength(0);
    });
  });
});
