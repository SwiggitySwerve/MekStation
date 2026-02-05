/**
 * Vault Folder API - Single Folder Operations
 *
 * GET /api/vault/folders/[id] - Get folder details
 * PATCH /api/vault/folders/[id] - Update folder
 * DELETE /api/vault/folders/[id] - Delete folder
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import type { IVaultFolder } from '@/types/vault';

import {
  getVaultService,
  IFolderWithPermissions,
} from '@/services/vault/VaultService';

// =============================================================================
// Types
// =============================================================================

interface UpdateFolderRequest {
  name?: string;
  description?: string | null;
  parentId?: string | null;
}

interface FolderResponse {
  folder: IVaultFolder | IFolderWithPermissions;
}

interface DeleteResponse {
  success: boolean;
}

interface ErrorResponse {
  error: string;
}

// =============================================================================
// Handler
// =============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FolderResponse | DeleteResponse | ErrorResponse>,
): Promise<void> {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid folder ID' });
  }

  try {
    const vaultService = getVaultService();

    switch (req.method) {
      case 'GET':
        return handleGet(id, req, res, vaultService);
      case 'PATCH':
        return handleUpdate(id, req, res, vaultService);
      case 'DELETE':
        return handleDelete(id, res, vaultService);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Folder API error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}

// =============================================================================
// Handlers
// =============================================================================

async function handleGet(
  id: string,
  req: NextApiRequest,
  res: NextApiResponse<FolderResponse | ErrorResponse>,
  vaultService: ReturnType<typeof getVaultService>,
) {
  const { includePermissions } = req.query;

  let folder: IVaultFolder | IFolderWithPermissions | null;

  if (includePermissions === 'true') {
    folder = await vaultService.getFolderWithPermissions(id);
  } else {
    folder = await vaultService.getFolder(id);
  }

  if (!folder) {
    return res.status(404).json({ error: 'Folder not found' });
  }

  return res.status(200).json({ folder });
}

async function handleUpdate(
  id: string,
  req: NextApiRequest,
  res: NextApiResponse<FolderResponse | ErrorResponse>,
  vaultService: ReturnType<typeof getVaultService>,
) {
  const { name, description, parentId } = req.body as UpdateFolderRequest;

  // Check folder exists
  const existingFolder = await vaultService.getFolder(id);
  if (!existingFolder) {
    return res.status(404).json({ error: 'Folder not found' });
  }

  // Update name if provided
  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Folder name cannot be empty' });
    }
    if (name.length > 100) {
      return res
        .status(400)
        .json({ error: 'Folder name cannot exceed 100 characters' });
    }
    await vaultService.renameFolder(id, name.trim());
  }

  // Update description if provided
  if (description !== undefined) {
    await vaultService.setFolderDescription(id, description);
  }

  // Update parent if provided
  if (parentId !== undefined) {
    // Validate parent exists if not null
    if (parentId !== null) {
      const parent = await vaultService.getFolder(parentId);
      if (!parent) {
        return res.status(400).json({ error: 'Parent folder not found' });
      }
    }
    const moved = await vaultService.moveFolder(id, parentId);
    if (!moved) {
      return res
        .status(400)
        .json({ error: 'Cannot move folder (circular reference detected)' });
    }
  }

  // Return updated folder
  const folder = await vaultService.getFolder(id);
  return res.status(200).json({ folder: folder! });
}

async function handleDelete(
  id: string,
  res: NextApiResponse<DeleteResponse | ErrorResponse>,
  vaultService: ReturnType<typeof getVaultService>,
) {
  const folder = await vaultService.getFolder(id);
  if (!folder) {
    return res.status(404).json({ error: 'Folder not found' });
  }

  const deleted = await vaultService.deleteFolder(id);
  if (!deleted) {
    return res.status(500).json({ error: 'Failed to delete folder' });
  }

  return res.status(200).json({ success: true });
}
