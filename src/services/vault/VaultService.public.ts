import type {
  PermissionLevel,
  ShareableContentType,
  ContentCategory,
  IPermissionGrant,
} from '@/types/vault';

import { getPermissionService } from './PermissionService';
import { getVaultFolderRepository } from './VaultFolderRepository';

export async function makePublic(
  itemId: string,
  itemType: ShareableContentType,
  level: PermissionLevel = 'read',
): Promise<boolean> {
  const permissionService = getPermissionService();
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
  folderId: string,
  level: PermissionLevel = 'read',
): Promise<boolean> {
  const folderRepo = getVaultFolderRepository();
  const permissionService = getPermissionService();

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
  category: ContentCategory,
  level: PermissionLevel = 'read',
): Promise<boolean> {
  const permissionService = getPermissionService();
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
  itemId: string,
  itemType: ShareableContentType,
): Promise<boolean> {
  const permissionService = getPermissionService();
  const permissions = await permissionService.getGrantsForItem(
    'item',
    `${itemType}:${itemId}`,
  );

  for (const perm of permissions) {
    if (perm.granteeId === 'public') {
      await permissionService.revoke(perm.id);
    }
  }

  return true;
}

export async function removeFolderPublicAccess(
  folderId: string,
): Promise<boolean> {
  const permissionService = getPermissionService();
  const permissions = await permissionService.getGrantsForItem(
    'folder',
    folderId,
  );

  for (const perm of permissions) {
    if (perm.granteeId === 'public') {
      await permissionService.revoke(perm.id);
    }
  }

  return true;
}

export async function isPublic(
  itemId: string,
  itemType: ShareableContentType,
): Promise<PermissionLevel | null> {
  const permissionService = getPermissionService();
  const result = await permissionService.check(
    'public',
    'item',
    `${itemType}:${itemId}`,
  );
  return result.level;
}

export async function isFolderPublic(
  folderId: string,
): Promise<PermissionLevel | null> {
  const permissionService = getPermissionService();
  const result = await permissionService.check('public', 'folder', folderId);
  return result.level;
}

export async function getPublicItems(): Promise<IPermissionGrant[]> {
  const permissionService = getPermissionService();
  return permissionService.getGrantsForGrantee('public');
}
