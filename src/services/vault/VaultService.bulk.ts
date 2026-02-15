import type { PermissionLevel, ShareableContentType } from '@/types/vault';

import { getContactRepository } from './ContactRepository';
import { getPermissionService } from './PermissionService';
import { getVaultFolderRepository } from './VaultFolderRepository';

export async function shareFolderWithContacts(
  folderId: string,
  contacts: Array<{
    friendCode: string;
    level: PermissionLevel;
  }>,
): Promise<{ success: number; failed: number }> {
  const folderRepo = getVaultFolderRepository();
  const permissionService = getPermissionService();
  const contactRepo = getContactRepository();

  let success = 0;
  let failed = 0;

  await folderRepo.setFolderShared(folderId, true);

  for (const contact of contacts) {
    try {
      const contactData = await contactRepo.getByFriendCode(contact.friendCode);
      const contactName = contactData
        ? contactData.nickname || contactData.displayName
        : contact.friendCode;

      await permissionService.grant({
        granteeId: contact.friendCode,
        granteeName: contactName,
        scopeType: 'folder',
        scopeId: folderId,
        level: contact.level,
      });
      success++;
    } catch {
      failed++;
    }
  }

  return { success, failed };
}

export async function shareItemsWithContact(
  items: Array<{
    itemId: string;
    itemType: ShareableContentType;
  }>,
  contactFriendCode: string,
  level: PermissionLevel,
): Promise<{ success: number; failed: number }> {
  const permissionService = getPermissionService();
  const contactRepo = getContactRepository();

  let success = 0;
  let failed = 0;

  const contact = await contactRepo.getByFriendCode(contactFriendCode);
  const contactName = contact
    ? contact.nickname || contact.displayName
    : contactFriendCode;

  for (const item of items) {
    try {
      await permissionService.grant({
        granteeId: contactFriendCode,
        granteeName: contactName,
        scopeType: 'item',
        scopeId: `${item.itemType}:${item.itemId}`,
        level,
      });
      success++;
    } catch {
      failed++;
    }
  }

  return { success, failed };
}

export async function shareFolderContentsWithContact(
  folderId: string,
  contactFriendCode: string,
  level: PermissionLevel,
): Promise<{ folderShared: boolean; itemsShared: number }> {
  const folderRepo = getVaultFolderRepository();
  const permissionService = getPermissionService();
  const contactRepo = getContactRepository();

  await folderRepo.setFolderShared(folderId, true);

  const contact = await contactRepo.getByFriendCode(contactFriendCode);
  const contactName = contact
    ? contact.nickname || contact.displayName
    : contactFriendCode;

  await permissionService.grant({
    granteeId: contactFriendCode,
    granteeName: contactName,
    scopeType: 'folder',
    scopeId: folderId,
    level,
  });

  const items = await folderRepo.getFolderItems(folderId);
  let itemsShared = 0;

  for (const item of items) {
    try {
      await permissionService.grant({
        granteeId: contactFriendCode,
        granteeName: contactName,
        scopeType: 'item',
        scopeId: `${item.itemType}:${item.itemId}`,
        level,
      });
      itemsShared++;
    } catch {
      // Continue
    }
  }

  return { folderShared: true, itemsShared };
}

export async function revokeAllForContact(
  contactFriendCode: string,
): Promise<number> {
  const permissionService = getPermissionService();
  return permissionService.revokeAllForGrantee(contactFriendCode);
}

export async function updateContactPermissionLevel(
  contactFriendCode: string,
  newLevel: PermissionLevel,
): Promise<number> {
  const permissionService = getPermissionService();
  const permissions =
    await permissionService.getGrantsForGrantee(contactFriendCode);
  let updated = 0;

  for (const perm of permissions) {
    const result = await permissionService.updateLevel(perm.id, newLevel);
    if (result.success) updated++;
  }

  return updated;
}
