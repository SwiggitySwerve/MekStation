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

interface ErrorResponse {
  error: string;
}

// =============================================================================
// Handler
// =============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SharesResponse | SuccessResponse | ErrorResponse>
) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid folder ID' });
  }

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
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Folder share API error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}

// =============================================================================
// Handlers
// =============================================================================

async function handleList(
  folderId: string,
  res: NextApiResponse<SharesResponse | ErrorResponse>,
  vaultService: ReturnType<typeof getVaultService>
) {
  const folderWithPermissions = await vaultService.getFolderWithPermissions(folderId);

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
  res: NextApiResponse<SuccessResponse | ErrorResponse>,
  vaultService: ReturnType<typeof getVaultService>
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
            contact.level
          );
          return true;
        } catch {
          return false;
        }
      })
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
  res: NextApiResponse<SuccessResponse | ErrorResponse>,
  vaultService: ReturnType<typeof getVaultService>
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
