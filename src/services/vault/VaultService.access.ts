import type {
  PermissionLevel,
  ShareableContentType,
  ContentCategory,
} from '@/types/vault';

import { getPermissionService } from './PermissionService';
import { getVaultFolderRepository } from './VaultFolderRepository';

export interface ISharedContent {
  fromContact: {
    id: string;
    friendCode: string;
    displayName: string;
  };
  level: PermissionLevel;
  scopeType: 'item' | 'folder' | 'category' | 'all';
  scopeId: string | null;
  category: ContentCategory | null;
}

export async function canAccessFolder(
  folderId: string,
  friendCode: string,
): Promise<PermissionLevel | null> {
  const permissionService = getPermissionService();
  const result = await permissionService.check(friendCode, 'folder', folderId);
  return result.level;
}

export async function canAccessItem(
  itemId: string,
  itemType: ShareableContentType,
  friendCode: string,
): Promise<PermissionLevel | null> {
  const permissionService = getPermissionService();
  const folderRepo = getVaultFolderRepository();

  const itemResult = await permissionService.check(
    friendCode,
    'item',
    `${itemType}:${itemId}`,
  );
  if (itemResult.level) return itemResult.level;

  const folders = await folderRepo.getItemFolders(itemId, itemType);
  for (const folder of folders) {
    const folderLevel = await canAccessFolder(folder.id, friendCode);
    if (folderLevel) return folderLevel;
  }

  const categoryMap: Record<ShareableContentType, ContentCategory> = {
    unit: 'units',
    pilot: 'pilots',
    force: 'forces',
    encounter: 'encounters',
  };

  const categoryResult = await permissionService.check(
    friendCode,
    'category',
    null,
    categoryMap[itemType],
  );
  return categoryResult.level;
}

export async function getSharedWithMe(
  myFriendCode: string,
): Promise<ISharedContent[]> {
  const permissionService = getPermissionService();
  const permissions = await permissionService.getGrantsForGrantee(myFriendCode);

  const result: ISharedContent[] = [];

  for (const perm of permissions) {
    if (perm.granteeId === 'public') continue;

    result.push({
      fromContact: {
        id: 'owner',
        friendCode: 'OWNER',
        displayName: 'Vault Owner',
      },
      level: perm.level,
      scopeType: perm.scopeType,
      scopeId: perm.scopeId,
      category: perm.scopeCategory,
    });
  }

  return result;
}
