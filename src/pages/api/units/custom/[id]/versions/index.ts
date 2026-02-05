/**
 * Unit Versions API - List Versions
 *
 * GET /api/units/custom/:id/versions - List version history for a unit
 *
 * @spec openspec/specs/unit-versioning/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { getSQLiteService } from '@/services/persistence/SQLiteService';
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

type ErrorResponse = {
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<VersionsResponse | ErrorResponse>,
): Promise<void> {
  // Initialize database
  try {
    getSQLiteService().initialize();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Database initialization failed';
    return res.status(500).json({ error: message });
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing unit ID' });
  }

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
    const message =
      error instanceof Error ? error.message : 'Failed to get versions';
    return res.status(500).json({ error: message });
  }
}
