/**
 * Version Rollback API
 *
 * POST /api/vault/versions/rollback - Rollback to a specific version
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import type { IVersionSnapshot, ShareableContentType } from '@/types/vault';
import { getVersionHistoryService } from '@/services/vault/VersionHistoryService';

// =============================================================================
// Types
// =============================================================================

interface RollbackRequest {
  itemId: string;
  contentType: ShareableContentType;
  version: number;
  createdBy: string;
}

interface RollbackByIdRequest {
  versionId: string;
  createdBy: string;
}

interface RollbackResponse {
  success: boolean;
  restoredVersion?: IVersionSnapshot;
  error?: string;
}

// =============================================================================
// Handler
// =============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RollbackResponse>
): Promise<void> {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const body = req.body as RollbackRequest | RollbackByIdRequest;

    if (!body.createdBy || typeof body.createdBy !== 'string') {
      return res.status(400).json({ success: false, error: 'createdBy is required' });
    }

    const versionService = getVersionHistoryService();

    // Rollback by version ID
    if ('versionId' in body) {
      const result = await versionService.rollbackToVersionById(
        body.versionId,
        body.createdBy
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    }

    // Rollback by item + version number
    const { itemId, contentType, version, createdBy } = body as RollbackRequest;

    if (!itemId || typeof itemId !== 'string') {
      return res.status(400).json({ success: false, error: 'itemId is required' });
    }

    if (!isValidContentType(contentType)) {
      return res.status(400).json({ success: false, error: 'Invalid contentType' });
    }

    if (typeof version !== 'number' || version < 1) {
      return res.status(400).json({ success: false, error: 'Valid version number is required' });
    }

    const result = await versionService.rollbackToVersion(
      itemId,
      contentType,
      version,
      createdBy
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Version rollback API error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}

// =============================================================================
// Helpers
// =============================================================================

function isValidContentType(type: unknown): type is ShareableContentType {
  return ['unit', 'pilot', 'force', 'encounter'].includes(type as string);
}
