import type {
  PermissionLevel,
  ShareableContentType,
  ContentCategory,
  IPermissionGrant,
} from '@/types/vault';

import type { PermissionService } from './PermissionService';
import type { VaultFolderRepository } from './VaultFolderRepository';

import { getContactRepository } from './ContactRepository';

export async function shareFolderWithContact(
  folderRepo: VaultFolderRepository,
  permissionService: PermissionService,
  folderId: string,
  contactFriendCode: string,
  level: PermissionLevel,
): Promise<boolean> {
  await folderRepo.setFolderShared(folderId, true);

  const contactRepo = getContactRepository();
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
  permissionService: PermissionService,
  itemId: string,
  itemType: ShareableContentType,
  contactFriendCode: string,
  level: PermissionLevel,
): Promise<boolean> {
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
  permissionService: PermissionService,
  category: ContentCategory,
  contactFriendCode: string,
  level: PermissionLevel,
): Promise<boolean> {
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
  folderRepo: VaultFolderRepository,
  permissionService: PermissionService,
  folderId: string,
  contactFriendCode: string,
): Promise<boolean> {
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

export async function getFolderPermissions(
  permissionService: PermissionService,
  folderId: string,
): Promise<
  Array<{
    contactId: string;
    contactName: string;
    level: PermissionLevel;
  }>
> {
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
