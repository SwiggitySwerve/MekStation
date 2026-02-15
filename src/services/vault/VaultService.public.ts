import type {
  PermissionLevel,
  ShareableContentType,
  ContentCategory,
  IPermissionGrant,
} from '@/types/vault';

import type { PermissionService } from './PermissionService';
import type { VaultFolderRepository } from './VaultFolderRepository';

export async function makePublic(
  permissionService: PermissionService,
  itemId: string,
  itemType: ShareableContentType,
  level: PermissionLevel = 'read',
): Promise<boolean> {
  await permissionService.grant({
    granteeId: 'public',
    granteeName: 'Public',
    scopeType: 'item',
    scopeId: `${itemType}:${itemId}`,
    level,
  });
  return true;
}

export async function makeFolderPublic(
  folderRepo: VaultFolderRepository,
  permissionService: PermissionService,
  folderId: string,
  level: PermissionLevel = 'read',
): Promise<boolean> {
  await folderRepo.setFolderShared(folderId, true);
  await permissionService.grant({
    granteeId: 'public',
    granteeName: 'Public',
    scopeType: 'folder',
    scopeId: folderId,
    level,
  });
  return true;
}

export async function makeCategoryPublic(
  permissionService: PermissionService,
  category: ContentCategory,
  level: PermissionLevel = 'read',
): Promise<boolean> {
  await permissionService.grant({
    granteeId: 'public',
    granteeName: 'Public',
    scopeType: 'category',
    scopeCategory: category,
    level,
  });
  return true;
}

export async function removePublicAccess(
  permissionService: PermissionService,
  itemId: string,
  itemType: ShareableContentType,
): Promise<boolean> {
  const scopeId = `${itemType}:${itemId}`;
  const grants = await permissionService.getGrantsForItem('item', scopeId);

  for (const grant of grants) {
    if (grant.granteeId === 'public') {
      await permissionService.revoke(grant.id);
    }
  }

  return true;
}

export async function removeFolderPublicAccess(
  folderRepo: VaultFolderRepository,
  permissionService: PermissionService,
  folderId: string,
): Promise<boolean> {
  const grants = await permissionService.getGrantsForItem('folder', folderId);

  for (const grant of grants) {
    if (grant.granteeId === 'public') {
      await permissionService.revoke(grant.id);
    }
  }

  const remaining = await permissionService.getGrantsForItem(
    'folder',
    folderId,
  );
  if (remaining.length === 0) {
    await folderRepo.setFolderShared(folderId, false);
  }

  return true;
}

export async function isPublic(
  permissionService: PermissionService,
  itemId: string,
  itemType: ShareableContentType,
): Promise<PermissionLevel | null> {
  const result = await permissionService.check(
    'public',
    'item',
    `${itemType}:${itemId}`,
  );
  return result.level;
}

export async function isFolderPublic(
  permissionService: PermissionService,
  folderId: string,
): Promise<PermissionLevel | null> {
  const result = await permissionService.check('public', 'folder', folderId);
  return result.level;
}

export async function getPublicItems(
  permissionService: PermissionService,
): Promise<IPermissionGrant[]> {
  return permissionService.getGrantsForGrantee('public');
}
