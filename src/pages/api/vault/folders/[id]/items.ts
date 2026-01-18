/**
 * Vault Folder Items API
 *
 * GET /api/vault/folders/[id]/items - List items in folder
 * POST /api/vault/folders/[id]/items - Add item to folder
 * DELETE /api/vault/folders/[id]/items - Remove item from folder
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import type { IFolderItem, ShareableContentType } from '@/types/vault';
import { getVaultService } from '@/services/vault/VaultService';

// =============================================================================
// Types
// =============================================================================

interface AddItemRequest {
  itemId: string;
  itemType: ShareableContentType;
}

interface RemoveItemRequest {
  itemId: string;
  itemType: ShareableContentType;
}

interface BulkAddItemsRequest {
  items: Array<{
    itemId: string;
    itemType: ShareableContentType;
  }>;
}

interface ListItemsResponse {
  items: IFolderItem[];
  total: number;
}

interface SuccessResponse {
  success: boolean;
  added?: number;
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
  res: NextApiResponse<ListItemsResponse | SuccessResponse | ErrorResponse>
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
        return handleAdd(id, req, res, vaultService);
      case 'DELETE':
        return handleRemove(id, req, res, vaultService);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Folder items API error:', error);
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
  res: NextApiResponse<ListItemsResponse | ErrorResponse>,
  vaultService: ReturnType<typeof getVaultService>
) {
  const items = await vaultService.getFolderItems(folderId);

  return res.status(200).json({
    items,
    total: items.length,
  });
}

async function handleAdd(
  folderId: string,
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>,
  vaultService: ReturnType<typeof getVaultService>
) {
  const body = req.body as AddItemRequest | BulkAddItemsRequest;

  // Handle bulk add
  if ('items' in body && Array.isArray(body.items)) {
    const results = await Promise.all(
      body.items.map(async (item) => {
        if (!isValidContentType(item.itemType)) {
          return false;
        }
        return vaultService.addItemToFolder(folderId, item.itemId, item.itemType);
      })
    );

    const added = results.filter(Boolean).length;
    const failed = results.length - added;

    return res.status(200).json({ success: true, added, failed });
  }

  // Handle single add
  const { itemId, itemType } = body as AddItemRequest;

  if (!itemId || typeof itemId !== 'string') {
    return res.status(400).json({ error: 'Item ID is required' });
  }

  if (!isValidContentType(itemType)) {
    return res.status(400).json({ error: 'Invalid item type' });
  }

  const success = await vaultService.addItemToFolder(folderId, itemId, itemType);

  return res.status(success ? 200 : 500).json({ success });
}

async function handleRemove(
  folderId: string,
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>,
  vaultService: ReturnType<typeof getVaultService>
) {
  const { itemId, itemType } = req.body as RemoveItemRequest;

  if (!itemId || typeof itemId !== 'string') {
    return res.status(400).json({ error: 'Item ID is required' });
  }

  if (!isValidContentType(itemType)) {
    return res.status(400).json({ error: 'Invalid item type' });
  }

  const success = await vaultService.removeItemFromFolder(folderId, itemId, itemType);

  return res.status(success ? 200 : 404).json({ success });
}

// =============================================================================
// Helpers
// =============================================================================

function isValidContentType(type: unknown): type is ShareableContentType {
  return ['unit', 'pilot', 'force', 'encounter'].includes(type as string);
}
