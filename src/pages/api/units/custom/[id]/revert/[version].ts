/**
 * Unit Revert API - Revert to Previous Version
 *
 * POST /api/units/custom/:id/revert/:version - Revert a unit to a previous version
 *
 * @spec openspec/specs/unit-versioning/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import {
  initializeApiDatabase,
  rejectUnexpectedMethod,
  type ApiErrorResponse,
} from '@/pages-modules/api/routeHelpers';
import { getVersionRepository } from '@/services/units/VersionRepository';
import { IUnitOperationResult } from '@/types/persistence/UnitPersistence';

/**
 * Request body type
 */
interface RevertRequestBody {
  notes?: string;
}

/**
 * Response types
 */
type RevertResponse = IUnitOperationResult;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RevertResponse | ApiErrorResponse>,
): Promise<void> {
  if (!initializeApiDatabase(res)) return;

  if (rejectUnexpectedMethod(req, res, ['POST'])) return;

  const { id, version } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing unit ID' });
  }

  if (!version || typeof version !== 'string') {
    return res.status(400).json({ error: 'Missing version number' });
  }

  const versionNum = parseInt(version, 10);
  if (isNaN(versionNum) || versionNum < 1) {
    return res.status(400).json({ error: 'Invalid version number' });
  }

  const body = req.body as RevertRequestBody | undefined;
  const versionRepository = getVersionRepository();

  try {
    const result = versionRepository.revert(id, versionNum, body?.notes);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      const statusCode =
        result.error.errorCode === 'NOT_FOUND' ||
        result.error.errorCode === 'VERSION_NOT_FOUND'
          ? 404
          : 400;
      return res.status(statusCode).json(result);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to revert';
    return res.status(500).json({ error: message });
  }
}
