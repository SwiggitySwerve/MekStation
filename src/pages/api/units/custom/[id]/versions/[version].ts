/**
 * Unit Version API - Get Specific Version
 *
 * GET /api/units/custom/:id/versions/:version - Get a specific version of a unit
 *
 * @spec openspec/specs/unit-versioning/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import {
  initializeApiDatabase,
  rejectUnexpectedMethod,
  sendCaughtApiError,
  type ApiErrorResponse,
} from '@/pages-modules/api/routeHelpers';
import { getVersionRepository } from '@/services/units/VersionRepository';
import { IVersionRecord } from '@/types/persistence/UnitPersistence';

/**
 * Response types
 */
type VersionResponse = IVersionRecord & { parsedData: Record<string, unknown> };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<VersionResponse | ApiErrorResponse>,
): Promise<void> {
  if (!initializeApiDatabase(res)) return;

  if (rejectUnexpectedMethod(req, res, ['GET'])) return;

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

  const versionRepository = getVersionRepository();

  try {
    const versionRecord = versionRepository.getVersion(id, versionNum);

    if (!versionRecord) {
      return res.status(404).json({
        error: `Version ${versionNum} not found for unit "${id}"`,
      });
    }

    // Parse the JSON data for client convenience
    const parsedData = JSON.parse(versionRecord.data) as Record<
      string,
      unknown
    >;

    return res.status(200).json({
      ...versionRecord,
      parsedData,
    });
  } catch (error) {
    sendCaughtApiError(res, error, 'Failed to get version');
    return;
  }
}
