/**
 * Unit Export API - Export Unit as JSON
 *
 * GET /api/units/custom/:id/export - Export a custom unit as JSON file
 *
 * @spec openspec/specs/unit-services/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { getSQLiteService } from '@/services/persistence/SQLiteService';
import { getUnitRepository } from '@/services/units/UnitRepository';
import { ISerializedUnitEnvelope } from '@/types/persistence/UnitPersistence';

/**
 * Package version (would normally come from package.json)
 */
const APP_VERSION = '1.0.0';
const FORMAT_VERSION = '1.0.0';

/**
 * Response types
 */
type ExportResponse = ISerializedUnitEnvelope;

type ErrorResponse = {
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ExportResponse | ErrorResponse>,
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

  const { id, download } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing unit ID' });
  }

  const unitRepository = getUnitRepository();

  try {
    const unit = unitRepository.getById(id);

    if (!unit) {
      return res.status(404).json({ error: `Unit "${id}" not found` });
    }

    // Parse the stored JSON data
    const unitData = JSON.parse(unit.data) as Record<string, unknown>;

    // Create export envelope
    const envelope: ISerializedUnitEnvelope = {
      formatVersion: FORMAT_VERSION,
      savedAt: new Date().toISOString(),
      application: 'mekstation',
      applicationVersion: APP_VERSION,
      unit: unitData,
    };

    // If download query param is set, send as file download
    if (download === 'true') {
      const filename = `${unit.chassis}-${unit.variant}.json`.replace(
        /[^a-zA-Z0-9\-_.]/g,
        '-',
      );

      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );
    }

    return res.status(200).json(envelope);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to export unit';
    return res.status(500).json({ error: message });
  }
}
