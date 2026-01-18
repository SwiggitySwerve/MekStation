/**
 * Version Diff API
 *
 * GET /api/vault/versions/diff?itemId=X&contentType=Y&from=1&to=2 - Compare versions
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import type { IVersionDiff, ShareableContentType } from '@/types/vault';
import { getVersionHistoryService } from '@/services/vault/VersionHistoryService';

// =============================================================================
// Types
// =============================================================================

interface DiffResponse {
  diff: IVersionDiff;
}

interface ErrorResponse {
  error: string;
}

// =============================================================================
// Handler
// =============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DiffResponse | ErrorResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { itemId, contentType, from, to } = req.query;

    if (typeof itemId !== 'string' || !itemId) {
      return res.status(400).json({ error: 'itemId is required' });
    }

    if (!isValidContentType(contentType)) {
      return res.status(400).json({ error: 'Invalid or missing contentType' });
    }

    const fromVersion = typeof from === 'string' ? parseInt(from, 10) : NaN;
    const toVersion = typeof to === 'string' ? parseInt(to, 10) : NaN;

    if (isNaN(fromVersion) || isNaN(toVersion)) {
      return res.status(400).json({ error: 'from and to version numbers are required' });
    }

    if (fromVersion === toVersion) {
      return res.status(400).json({ error: 'from and to versions must be different' });
    }

    const versionService = getVersionHistoryService();
    const diff = await versionService.diffVersions(
      itemId,
      contentType,
      fromVersion,
      toVersion
    );

    if (!diff) {
      return res.status(404).json({ error: 'One or both versions not found' });
    }

    return res.status(200).json({ diff });
  } catch (error) {
    console.error('Version diff API error:', error);
    return res.status(500).json({
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
