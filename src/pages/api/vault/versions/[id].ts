/**
 * Version History API - Single Version Operations
 *
 * GET /api/vault/versions/[id] - Get a specific version
 * DELETE /api/vault/versions/[id] - Delete a version
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import type { IVersionSnapshot } from '@/types/vault';
import { getVersionHistoryService } from '@/services/vault/VersionHistoryService';

// =============================================================================
// Types
// =============================================================================

interface VersionResponse {
  version: IVersionSnapshot;
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
  res: NextApiResponse<VersionResponse | DeleteResponse | ErrorResponse>
) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid version ID' });
  }

  try {
    const versionService = getVersionHistoryService();

    switch (req.method) {
      case 'GET':
        return handleGet(id, res, versionService);
      case 'DELETE':
        return handleDelete(id, res, versionService);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Version API error:', error);
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
  res: NextApiResponse<VersionResponse | ErrorResponse>,
  versionService: ReturnType<typeof getVersionHistoryService>
) {
  const version = await versionService.getVersionById(id);

  if (!version) {
    return res.status(404).json({ error: 'Version not found' });
  }

  return res.status(200).json({ version });
}

async function handleDelete(
  id: string,
  res: NextApiResponse<DeleteResponse | ErrorResponse>,
  versionService: ReturnType<typeof getVersionHistoryService>
) {
  const version = await versionService.getVersionById(id);

  if (!version) {
    return res.status(404).json({ error: 'Version not found' });
  }

  // Don't allow deleting the latest version
  const latest = await versionService.getLatestVersion(
    version.itemId,
    version.contentType
  );

  if (latest && latest.id === id) {
    return res.status(400).json({ error: 'Cannot delete the current version' });
  }

  // Use repository directly for delete since service doesn't expose it
  const { getVersionHistoryRepository } = await import('@/services/vault/VersionHistoryRepository');
  const deleted = await getVersionHistoryRepository().deleteVersion(id);

  if (!deleted) {
    return res.status(500).json({ error: 'Failed to delete version' });
  }

  return res.status(200).json({ success: true });
}
