/**
 * Unit Versions API - List Versions
 *
 * GET /api/units/custom/:id/versions - List version history for a unit
 *
 * @spec openspec/specs/unit-versioning/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import {
  initializeApiDatabase,
  rejectMissingQueryString,
  rejectUnexpectedMethod,
  sendCaughtApiError,
  type ApiErrorResponse,
} from '@/pages-modules/api/routeHelpers';
import { getUnitRepository } from '@/services/units/UnitRepository';
import { getVersionRepository } from '@/services/units/VersionRepository';
import { IVersionMetadata } from '@/types/persistence/UnitPersistence';

/**
 * Response types
 */
type VersionsResponse = {
  unitId: string;
  currentVersion: number;
  versions: readonly IVersionMetadata[];
  count: number;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<VersionsResponse | ApiErrorResponse>,
): Promise<void> {
  if (!initializeApiDatabase(res)) return;

  if (rejectUnexpectedMethod(req, res, ['GET'])) return;

  const id = rejectMissingQueryString(req, res, 'id', 'Missing unit ID');
  if (!id) return;

  const unitRepository = getUnitRepository();
  const versionRepository = getVersionRepository();

  try {
    // Check if unit exists
    const unit = unitRepository.getById(id);
    if (!unit) {
      return res.status(404).json({ error: `Unit "${id}" not found` });
    }

    // Get version history
    const versions = versionRepository.getVersionHistory(id);

    return res.status(200).json({
      unitId: id,
      currentVersion: unit.currentVersion,
      versions,
      count: versions.length,
    });
  } catch (error) {
    sendCaughtApiError(res, error, 'Failed to get versions');
    return;
  }
}
