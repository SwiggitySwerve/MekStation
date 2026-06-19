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

import {
  rejectMissingQueryString,
  rejectUnexpectedMethod,
  sendLoggedApiError,
  type ApiErrorResponse,
} from '@/pages-modules/api/routeHelpers';
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

// =============================================================================
// Handler
// =============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<VersionResponse | DeleteResponse | ApiErrorResponse>,
): Promise<void> {
  const id = rejectMissingQueryString(req, res, 'id', 'Invalid version ID');
  if (!id) return;
  if (
    rejectUnexpectedMethod(req, res, ['GET', 'DELETE'], () => ({
      error: 'Method not allowed',
    }))
  )
    return;

  try {
    const versionService = getVersionHistoryService();

    switch (req.method) {
      case 'GET':
        return handleGet(id, res, versionService);
      case 'DELETE':
        return handleDelete(id, res, versionService);
    }
  } catch (error) {
    sendLoggedApiError(res, 'Version API error:', error);
    return;
  }
}

// =============================================================================
// Handlers
// =============================================================================

async function handleGet(
  id: string,
  res: NextApiResponse<VersionResponse | ApiErrorResponse>,
  versionService: ReturnType<typeof getVersionHistoryService>,
) {
  const version = await versionService.getVersionById(id);

  if (!version) {
    return res.status(404).json({ error: 'Version not found' });
  }

  return res.status(200).json({ version });
}

async function handleDelete(
  id: string,
  res: NextApiResponse<DeleteResponse | ApiErrorResponse>,
  versionService: ReturnType<typeof getVersionHistoryService>,
) {
  const version = await versionService.getVersionById(id);

  if (!version) {
    return res.status(404).json({ error: 'Version not found' });
  }

  // Don't allow deleting the latest version
  const latest = await versionService.getLatestVersion(
    version.itemId,
    version.contentType,
  );

  if (latest && latest.id === id) {
    return res.status(400).json({ error: 'Cannot delete the current version' });
  }

  // Use repository directly for delete since service doesn't expose it
  const { getVersionHistoryRepository } =
    await import('@/services/vault/VersionHistoryRepository');
  const deleted = await getVersionHistoryRepository().deleteVersion(id);

  if (!deleted) {
    return res.status(500).json({ error: 'Failed to delete version' });
  }

  return res.status(200).json({ success: true });
}
