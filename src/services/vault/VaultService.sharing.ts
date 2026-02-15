import type {
  PermissionLevel,
  ShareableContentType,
  ContentCategory,
  IPermissionGrant,
} from '@/types/vault';

import { getContactRepository } from './ContactRepository';
import { getPermissionService } from './PermissionService';
import { getVaultFolderRepository } from './VaultFolderRepository';

export async function shareFolderWithContact(
  folderId: string,
  contactFriendCode: string,
  level: PermissionLevel,
): Promise<boolean> {
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

  return true;
}

export async function shareItemWithContact(
  itemId: string,
  itemType: ShareableContentType,
  contactFriendCode: string,
  level: PermissionLevel,
): Promise<boolean> {
  const permissionService = getPermissionService();
  const contactRepo = getContactRepository();

  const contact = await contactRepo.getByFriendCode(contactFriendCode);
  const contactName = contact
    ? contact.nickname || contact.displayName
    : contactFriendCode;

  await permissionService.grant({
    granteeId: contactFriendCode,
    granteeName: contactName,
    scopeType: 'item',
    scopeId: `${itemType}:${itemId}`,
    level,
  });

  return true;
}

export async function shareCategoryWithContact(
  category: ContentCategory,
  contactFriendCode: string,
  level: PermissionLevel,
): Promise<boolean> {
  const permissionService = getPermissionService();
  const contactRepo = getContactRepository();

  const contact = await contactRepo.getByFriendCode(contactFriendCode);
  const contactName = contact
    ? contact.nickname || contact.displayName
    : contactFriendCode;

  await permissionService.grant({
    granteeId: contactFriendCode,
    granteeName: contactName,
    scopeType: 'category',
    scopeCategory: category,
    level,
  });

  return true;
}

export async function unshareFolder(
  folderId: string,
  contactFriendCode: string,
): Promise<boolean> {
  const folderRepo = getVaultFolderRepository();
  const permissionService = getPermissionService();

  const permissions =
    await permissionService.getGrantsForGrantee(contactFriendCode);

  for (const perm of permissions) {
    if (perm.scopeType === 'folder' && perm.scopeId === folderId) {
      await permissionService.revoke(perm.id);
    }
  }

  const folderPerms = await permissionService.getGrantsForItem(
    'folder',
    folderId,
  );
  if (folderPerms.length === 0) {
    await folderRepo.setFolderShared(folderId, false);
  }

  return true;
}

export async function getFolderPermissions(folderId: string): Promise<
  Array<{
    contactId: string;
    contactName: string;
    level: PermissionLevel;
  }>
> {
  const permissionService = getPermissionService();
  const permissions = await permissionService.getGrantsForItem(
    'folder',
    folderId,
  );

  return permissions.map((p: IPermissionGrant) => ({
    contactId: p.granteeId,
    contactName: p.granteeName || p.granteeId,
    level: p.level,
  }));
}
