/**
 * Vault Folder Sharing API
 *
 * GET /api/vault/folders/[id]/share - List who folder is shared with
 * POST /api/vault/folders/[id]/share - Share folder with contact(s)
 * DELETE /api/vault/folders/[id]/share - Unshare folder from contact
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import type { PermissionLevel } from '@/types/vault';

import {
  rejectMissingQueryString,
  rejectUnexpectedMethod as rejectFolderShareMethod,
  sendLoggedApiError,
  type ApiErrorResponse,
} from '@/pages-modules/api/routeHelpers';
import { getVaultService } from '@/services/vault/VaultService';

// =============================================================================
// Types
// =============================================================================

interface ShareRequest {
  contactFriendCode: string;
  level: PermissionLevel;
}

interface BulkShareRequest {
  contacts: Array<{
    friendCode: string;
    level: PermissionLevel;
  }>;
}

interface UnshareRequest {
  contactFriendCode: string;
}

interface SharesResponse {
  shares: Array<{
    contactId: string;
    contactName: string;
    level: PermissionLevel;
  }>;
}

interface SuccessResponse {
  success: boolean;
  shared?: number;
  failed?: number;
}

// =============================================================================
// Handler
// =============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SharesResponse | SuccessResponse | ApiErrorResponse>,
): Promise<void> {
  const id = rejectMissingQueryString(req, res, 'id', 'Invalid folder ID');
  if (!id) return;
  if (
    rejectFolderShareMethod(req, res, ['GET', 'POST', 'DELETE'], () => ({
      error: 'Method not allowed',
    }))
  )
    return;

  try {
    const vaultService = getVaultService();

    // Verify folder exists
    const folder = await vaultService.getFolder(id);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    switch (req.method) {
      case 'GET':
        return handleList(id, res, vaultService);
      case 'POST':
        return handleShare(id, req, res, vaultService);
      case 'DELETE':
        return handleUnshare(id, req, res, vaultService);
    }
  } catch (error) {
    sendLoggedApiError(res, 'Folder share API error:', error);
    return;
  }
}

// =============================================================================
// Handlers
// =============================================================================

async function handleList(
  folderId: string,
  res: NextApiResponse<SharesResponse | ApiErrorResponse>,
  vaultService: ReturnType<typeof getVaultService>,
) {
  const folderWithPermissions =
    await vaultService.getFolderWithPermissions(folderId);

  if (!folderWithPermissions) {
    return res.status(404).json({ error: 'Folder not found' });
  }

  return res.status(200).json({
    shares: folderWithPermissions.sharedWith,
  });
}

async function handleShare(
  folderId: string,
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ApiErrorResponse>,
  vaultService: ReturnType<typeof getVaultService>,
) {
  const body = req.body as ShareRequest | BulkShareRequest;

  // Handle bulk share
  if ('contacts' in body && Array.isArray(body.contacts)) {
    const results = await Promise.all(
      body.contacts.map(async (contact) => {
        if (!isValidPermissionLevel(contact.level)) {
          return false;
        }
        try {
          await vaultService.shareFolderWithContact(
            folderId,
            contact.friendCode,
            contact.level,
          );
          return true;
        } catch {
          return false;
        }
      }),
    );

    const shared = results.filter(Boolean).length;
    const failed = results.length - shared;

    return res.status(200).json({ success: true, shared, failed });
  }

  // Handle single share
  const { contactFriendCode, level } = body as ShareRequest;

  if (!contactFriendCode || typeof contactFriendCode !== 'string') {
    return res.status(400).json({ error: 'Contact friend code is required' });
  }

  if (!isValidPermissionLevel(level)) {
    return res.status(400).json({ error: 'Invalid permission level' });
  }

  await vaultService.shareFolderWithContact(folderId, contactFriendCode, level);

  return res.status(200).json({ success: true });
}

async function handleUnshare(
  folderId: string,
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ApiErrorResponse>,
  vaultService: ReturnType<typeof getVaultService>,
) {
  const { contactFriendCode } = req.body as UnshareRequest;

  if (!contactFriendCode || typeof contactFriendCode !== 'string') {
    return res.status(400).json({ error: 'Contact friend code is required' });
  }

  await vaultService.unshareFolder(folderId, contactFriendCode);

  return res.status(200).json({ success: true });
}

// =============================================================================
// Helpers
// =============================================================================

function isValidPermissionLevel(level: unknown): level is PermissionLevel {
  return ['read', 'write', 'admin'].includes(level as string);
}
