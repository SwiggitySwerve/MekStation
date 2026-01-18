/**
 * Public Sharing API
 *
 * POST /api/vault/public - Make an item/folder/category public
 * DELETE /api/vault/public - Remove public access
 * GET /api/vault/public - List all public items
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import type {
  ShareableContentType,
  ContentCategory,
  PermissionLevel,
  IPermissionGrant,
} from '@/types/vault';
import { getVaultService } from '@/services/vault/VaultService';

// =============================================================================
// Types
// =============================================================================

interface MakePublicRequest {
  type: 'item' | 'folder' | 'category';
  itemId?: string;
  itemType?: ShareableContentType;
  folderId?: string;
  category?: ContentCategory;
  level?: PermissionLevel;
}

interface RemovePublicRequest {
  type: 'item' | 'folder';
  itemId?: string;
  itemType?: ShareableContentType;
  folderId?: string;
}

interface SuccessResponse {
  success: boolean;
}

interface ListResponse {
  items: IPermissionGrant[];
  total: number;
}

interface ErrorResponse {
  error: string;
}

// =============================================================================
// Handler
// =============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ListResponse | ErrorResponse>
) {
  try {
    const vaultService = getVaultService();

    switch (req.method) {
      case 'GET':
        return handleList(res, vaultService);
      case 'POST':
        return handleMakePublic(req, res, vaultService);
      case 'DELETE':
        return handleRemovePublic(req, res, vaultService);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Public sharing API error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}

// =============================================================================
// Handlers
// =============================================================================

async function handleList(
  res: NextApiResponse<ListResponse | ErrorResponse>,
  vaultService: ReturnType<typeof getVaultService>
) {
  const items = await vaultService.getPublicItems();

  return res.status(200).json({
    items,
    total: items.length,
  });
}

async function handleMakePublic(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>,
  vaultService: ReturnType<typeof getVaultService>
) {
  const body = req.body as MakePublicRequest;
  const level = body.level ?? 'read';

  if (!isValidPermissionLevel(level)) {
    return res.status(400).json({ error: 'Invalid permission level' });
  }

  switch (body.type) {
    case 'item':
      if (!body.itemId || !body.itemType) {
        return res.status(400).json({ error: 'itemId and itemType are required' });
      }
      if (!isValidContentType(body.itemType)) {
        return res.status(400).json({ error: 'Invalid item type' });
      }
      await vaultService.makePublic(body.itemId, body.itemType, level);
      break;

    case 'folder':
      if (!body.folderId) {
        return res.status(400).json({ error: 'folderId is required' });
      }
      await vaultService.makeFolderPublic(body.folderId, level);
      break;

    case 'category':
      if (!body.category) {
        return res.status(400).json({ error: 'category is required' });
      }
      if (!isValidCategory(body.category)) {
        return res.status(400).json({ error: 'Invalid category' });
      }
      await vaultService.makeCategoryPublic(body.category, level);
      break;

    default:
      return res.status(400).json({ error: 'Invalid type' });
  }

  return res.status(200).json({ success: true });
}

async function handleRemovePublic(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>,
  vaultService: ReturnType<typeof getVaultService>
) {
  const body = req.body as RemovePublicRequest;

  switch (body.type) {
    case 'item':
      if (!body.itemId || !body.itemType) {
        return res.status(400).json({ error: 'itemId and itemType are required' });
      }
      if (!isValidContentType(body.itemType)) {
        return res.status(400).json({ error: 'Invalid item type' });
      }
      await vaultService.removePublicAccess(body.itemId, body.itemType);
      break;

    case 'folder':
      if (!body.folderId) {
        return res.status(400).json({ error: 'folderId is required' });
      }
      await vaultService.removeFolderPublicAccess(body.folderId);
      break;

    default:
      return res.status(400).json({ error: 'Invalid type' });
  }

  return res.status(200).json({ success: true });
}

// =============================================================================
// Helpers
// =============================================================================

function isValidContentType(type: unknown): type is ShareableContentType {
  return ['unit', 'pilot', 'force', 'encounter'].includes(type as string);
}

function isValidCategory(category: unknown): category is ContentCategory {
  return ['units', 'pilots', 'forces', 'encounters'].includes(category as string);
}

function isValidPermissionLevel(level: unknown): level is PermissionLevel {
  return ['read', 'write', 'admin'].includes(level as string);
}
