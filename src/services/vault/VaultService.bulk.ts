import type {
  PermissionLevel,
  ShareableContentType,
  IFolderItem,
} from '@/types/vault';

import type { PermissionService } from './PermissionService';
import type { VaultFolderRepository } from './VaultFolderRepository';

import {
  shareFolderWithContact,
  shareItemWithContact,
} from './VaultService.sharing';

export async function shareFolderWithContacts(
  folderRepo: VaultFolderRepository,
  permissionService: PermissionService,
  folderId: string,
  contacts: Array<{
    friendCode: string;
    level: PermissionLevel;
  }>,
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const contact of contacts) {
    try {
      await shareFolderWithContact(
        folderRepo,
        permissionService,
        folderId,
        contact.friendCode,
        contact.level,
      );
      success++;
    } catch {
      failed++;
    }
  }

  return { success, failed };
}

export async function shareItemsWithContact(
  permissionService: PermissionService,
  items: Array<{
    itemId: string;
    itemType: ShareableContentType;
  }>,
  contactFriendCode: string,
  level: PermissionLevel,
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const item of items) {
    try {
      await shareItemWithContact(
        permissionService,
        item.itemId,
        item.itemType,
        contactFriendCode,
        level,
      );
      success++;
    } catch {
      failed++;
    }
  }

  return { success, failed };
}

export async function shareFolderContentsWithContact(
  folderRepo: VaultFolderRepository,
  permissionService: PermissionService,
  folderId: string,
  contactFriendCode: string,
  level: PermissionLevel,
): Promise<{ folderShared: boolean; itemsShared: number }> {
  await shareFolderWithContact(
    folderRepo,
    permissionService,
    folderId,
    contactFriendCode,
    level,
  );

  const items: IFolderItem[] = await folderRepo.getFolderItems(folderId);
  let itemsShared = 0;

  for (const item of items) {
    try {
      await shareItemWithContact(
        permissionService,
        item.itemId,
        item.itemType,
        contactFriendCode,
        level,
      );
      itemsShared++;
    } catch {
      // Continue with other items
    }
  }

  return { folderShared: true, itemsShared };
}

export async function revokeAllForContact(
  permissionService: PermissionService,
  contactFriendCode: string,
): Promise<number> {
  return permissionService.revokeAllForGrantee(contactFriendCode);
}

export async function updateContactPermissionLevel(
  permissionService: PermissionService,
  contactFriendCode: string,
  newLevel: PermissionLevel,
): Promise<number> {
  const permissions =
    await permissionService.getGrantsForGrantee(contactFriendCode);
  let updated = 0;

  for (const perm of permissions) {
    const result = await permissionService.updateLevel(perm.id, newLevel);
    if (result.success) updated++;
  }

  return updated;
}
