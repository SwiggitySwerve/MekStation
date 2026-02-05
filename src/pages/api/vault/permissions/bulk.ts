/**
 * Bulk Permissions API
 *
 * POST /api/vault/permissions/bulk - Apply bulk permission operations
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import type {
  PermissionLevel,
  ShareableContentType,
  ContentCategory,
} from '@/types/vault';

import { getVaultService } from '@/services/vault/VaultService';

// =============================================================================
// Types
// =============================================================================

/**
 * Bulk operation types
 */
type BulkOperationType =
  | 'share_folder_with_contacts'
  | 'share_items_with_contact'
  | 'share_folder_contents'
  | 'share_category_with_contacts'
  | 'revoke_all_for_contact'
  | 'update_contact_level';

interface ShareFolderWithContactsRequest {
  operation: 'share_folder_with_contacts';
  folderId: string;
  contacts: Array<{
    friendCode: string;
    level: PermissionLevel;
  }>;
}

interface ShareItemsWithContactRequest {
  operation: 'share_items_with_contact';
  items: Array<{
    itemId: string;
    itemType: ShareableContentType;
  }>;
  contactFriendCode: string;
  level: PermissionLevel;
}

interface ShareFolderContentsRequest {
  operation: 'share_folder_contents';
  folderId: string;
  contactFriendCode: string;
  level: PermissionLevel;
}

interface ShareCategoryWithContactsRequest {
  operation: 'share_category_with_contacts';
  category: ContentCategory;
  contacts: Array<{
    friendCode: string;
    level: PermissionLevel;
  }>;
}

interface RevokeAllForContactRequest {
  operation: 'revoke_all_for_contact';
  contactFriendCode: string;
}

interface UpdateContactLevelRequest {
  operation: 'update_contact_level';
  contactFriendCode: string;
  newLevel: PermissionLevel;
}

type BulkRequest =
  | ShareFolderWithContactsRequest
  | ShareItemsWithContactRequest
  | ShareFolderContentsRequest
  | ShareCategoryWithContactsRequest
  | RevokeAllForContactRequest
  | UpdateContactLevelRequest;

interface BulkResponse {
  success: boolean;
  operation: BulkOperationType;
  results: {
    success?: number;
    failed?: number;
    folderShared?: boolean;
    itemsShared?: number;
    revoked?: number;
    updated?: number;
  };
}

interface ErrorResponse {
  error: string;
}

// =============================================================================
// Handler
// =============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BulkResponse | ErrorResponse>,
): Promise<void> {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body as BulkRequest;

    if (!body.operation) {
      return res.status(400).json({ error: 'Operation type is required' });
    }

    const vaultService = getVaultService();

    switch (body.operation) {
      case 'share_folder_with_contacts':
        return handleShareFolderWithContacts(body, res, vaultService);
      case 'share_items_with_contact':
        return handleShareItemsWithContact(body, res, vaultService);
      case 'share_folder_contents':
        return handleShareFolderContents(body, res, vaultService);
      case 'share_category_with_contacts':
        return handleShareCategoryWithContacts(body, res, vaultService);
      case 'revoke_all_for_contact':
        return handleRevokeAllForContact(body, res, vaultService);
      case 'update_contact_level':
        return handleUpdateContactLevel(body, res, vaultService);
      default:
        return res.status(400).json({ error: 'Unknown operation type' });
    }
  } catch (error) {
    console.error('Bulk permissions API error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}

// =============================================================================
// Handlers
// =============================================================================

async function handleShareFolderWithContacts(
  body: ShareFolderWithContactsRequest,
  res: NextApiResponse<BulkResponse | ErrorResponse>,
  vaultService: ReturnType<typeof getVaultService>,
) {
  if (!body.folderId) {
    return res.status(400).json({ error: 'Folder ID is required' });
  }
  if (!Array.isArray(body.contacts) || body.contacts.length === 0) {
    return res.status(400).json({ error: 'Contacts array is required' });
  }

  const folder = await vaultService.getFolder(body.folderId);
  if (!folder) {
    return res.status(404).json({ error: 'Folder not found' });
  }

  const result = await vaultService.shareFolderWithContacts(
    body.folderId,
    body.contacts,
  );

  return res.status(200).json({
    success: true,
    operation: 'share_folder_with_contacts',
    results: result,
  });
}

async function handleShareItemsWithContact(
  body: ShareItemsWithContactRequest,
  res: NextApiResponse<BulkResponse | ErrorResponse>,
  vaultService: ReturnType<typeof getVaultService>,
) {
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return res.status(400).json({ error: 'Items array is required' });
  }
  if (!body.contactFriendCode) {
    return res.status(400).json({ error: 'Contact friend code is required' });
  }
  if (!isValidPermissionLevel(body.level)) {
    return res.status(400).json({ error: 'Invalid permission level' });
  }

  const result = await vaultService.shareItemsWithContact(
    body.items,
    body.contactFriendCode,
    body.level,
  );

  return res.status(200).json({
    success: true,
    operation: 'share_items_with_contact',
    results: result,
  });
}

async function handleShareFolderContents(
  body: ShareFolderContentsRequest,
  res: NextApiResponse<BulkResponse | ErrorResponse>,
  vaultService: ReturnType<typeof getVaultService>,
) {
  if (!body.folderId) {
    return res.status(400).json({ error: 'Folder ID is required' });
  }
  if (!body.contactFriendCode) {
    return res.status(400).json({ error: 'Contact friend code is required' });
  }
  if (!isValidPermissionLevel(body.level)) {
    return res.status(400).json({ error: 'Invalid permission level' });
  }

  const folder = await vaultService.getFolder(body.folderId);
  if (!folder) {
    return res.status(404).json({ error: 'Folder not found' });
  }

  const result = await vaultService.shareFolderContentsWithContact(
    body.folderId,
    body.contactFriendCode,
    body.level,
  );

  return res.status(200).json({
    success: true,
    operation: 'share_folder_contents',
    results: result,
  });
}

async function handleShareCategoryWithContacts(
  body: ShareCategoryWithContactsRequest,
  res: NextApiResponse<BulkResponse | ErrorResponse>,
  vaultService: ReturnType<typeof getVaultService>,
) {
  if (!isValidCategory(body.category)) {
    return res.status(400).json({ error: 'Invalid category' });
  }
  if (!Array.isArray(body.contacts) || body.contacts.length === 0) {
    return res.status(400).json({ error: 'Contacts array is required' });
  }

  let success = 0;
  let failed = 0;

  for (const contact of body.contacts) {
    try {
      await vaultService.shareCategoryWithContact(
        body.category,
        contact.friendCode,
        contact.level,
      );
      success++;
    } catch {
      failed++;
    }
  }

  return res.status(200).json({
    success: true,
    operation: 'share_category_with_contacts',
    results: { success, failed },
  });
}

async function handleRevokeAllForContact(
  body: RevokeAllForContactRequest,
  res: NextApiResponse<BulkResponse | ErrorResponse>,
  vaultService: ReturnType<typeof getVaultService>,
) {
  if (!body.contactFriendCode) {
    return res.status(400).json({ error: 'Contact friend code is required' });
  }

  const revoked = await vaultService.revokeAllForContact(
    body.contactFriendCode,
  );

  return res.status(200).json({
    success: true,
    operation: 'revoke_all_for_contact',
    results: { revoked },
  });
}

async function handleUpdateContactLevel(
  body: UpdateContactLevelRequest,
  res: NextApiResponse<BulkResponse | ErrorResponse>,
  vaultService: ReturnType<typeof getVaultService>,
) {
  if (!body.contactFriendCode) {
    return res.status(400).json({ error: 'Contact friend code is required' });
  }
  if (!isValidPermissionLevel(body.newLevel)) {
    return res.status(400).json({ error: 'Invalid permission level' });
  }

  const updated = await vaultService.updateContactPermissionLevel(
    body.contactFriendCode,
    body.newLevel,
  );

  return res.status(200).json({
    success: true,
    operation: 'update_contact_level',
    results: { updated },
  });
}

// =============================================================================
// Helpers
// =============================================================================

function isValidPermissionLevel(level: unknown): level is PermissionLevel {
  return ['read', 'write', 'admin'].includes(level as string);
}

function isValidCategory(category: unknown): category is ContentCategory {
  return ['units', 'pilots', 'forces', 'encounters'].includes(
    category as string,
  );
}
