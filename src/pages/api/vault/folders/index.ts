/**
 * Vault Folders API
 *
 * GET /api/vault/folders - List all folders
 * POST /api/vault/folders - Create a new folder
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import type { IVaultFolder } from '@/types/vault';

import { getVaultService } from '@/services/vault/VaultService';

// =============================================================================
// Types
// =============================================================================

interface CreateFolderRequest {
  name: string;
  description?: string;
  parentId?: string;
}

interface ListFoldersResponse {
  folders: IVaultFolder[];
  total: number;
}

interface CreateFolderResponse {
  folder: IVaultFolder;
}

interface ErrorResponse {
  error: string;
}

// =============================================================================
// Handler
// =============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<
    ListFoldersResponse | CreateFolderResponse | ErrorResponse
  >,
): Promise<void> {
  try {
    const vaultService = getVaultService();

    switch (req.method) {
      case 'GET':
        return handleList(req, res, vaultService);
      case 'POST':
        return handleCreate(req, res, vaultService);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Folders API error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}

// =============================================================================
// Handlers
// =============================================================================

async function handleList(
  req: NextApiRequest,
  res: NextApiResponse<ListFoldersResponse | ErrorResponse>,
  vaultService: ReturnType<typeof getVaultService>,
) {
  const { parentId, shared } = req.query;

  let folders: IVaultFolder[];

  if (shared === 'true') {
    folders = await vaultService.getSharedFolders();
  } else if (parentId === 'null' || parentId === '') {
    folders = await vaultService.getRootFolders();
  } else if (typeof parentId === 'string') {
    folders = await vaultService.getChildFolders(parentId);
  } else {
    folders = await vaultService.getAllFolders();
  }

  return res.status(200).json({
    folders,
    total: folders.length,
  });
}

async function handleCreate(
  req: NextApiRequest,
  res: NextApiResponse<CreateFolderResponse | ErrorResponse>,
  vaultService: ReturnType<typeof getVaultService>,
) {
  const { name, description, parentId } = req.body as CreateFolderRequest;

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Folder name is required' });
  }

  if (name.trim().length === 0) {
    return res.status(400).json({ error: 'Folder name cannot be empty' });
  }

  if (name.length > 100) {
    return res
      .status(400)
      .json({ error: 'Folder name cannot exceed 100 characters' });
  }

  // Validate parent exists if provided
  if (parentId) {
    const parent = await vaultService.getFolder(parentId);
    if (!parent) {
      return res.status(400).json({ error: 'Parent folder not found' });
    }
  }

  const folder = await vaultService.createFolder(name.trim(), {
    description: description?.trim(),
    parentId,
  });

  return res.status(201).json({ folder });
}
