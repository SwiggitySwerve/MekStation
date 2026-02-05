/**
 * Suggest Clone Name API
 *
 * POST /api/units/custom/suggest-name - Get a unique name suggestion for a unit clone
 *
 * @spec openspec/specs/unit-services/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { getSQLiteService } from '@/services/persistence/SQLiteService';
import { getUnitRepository } from '@/services/units/UnitRepository';
import { ICloneNameSuggestion } from '@/types/persistence/UnitPersistence';

/**
 * Request body type
 */
interface SuggestNameRequest {
  chassis: string;
  variant: string;
}

/**
 * Response types
 */
type SuggestNameResponse = ICloneNameSuggestion & {
  isOriginalAvailable: boolean;
};

type ErrorResponse = {
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuggestNameResponse | ErrorResponse>,
): Promise<void> {
  // Initialize database
  try {
    getSQLiteService().initialize();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Database initialization failed';
    return res.status(500).json({ error: message });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const body = req.body as SuggestNameRequest;

  if (!body.chassis || !body.variant) {
    return res.status(400).json({
      error: 'Missing required fields: chassis, variant',
    });
  }

  const unitRepository = getUnitRepository();

  try {
    // Check if original name is available
    const isOriginalAvailable = !unitRepository.nameExists(
      body.chassis,
      body.variant,
    );

    // Get suggestion
    const suggestion = unitRepository.suggestCloneName(
      body.chassis,
      body.variant,
    );

    return res.status(200).json({
      ...suggestion,
      isOriginalAvailable,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to suggest name';
    return res.status(500).json({ error: message });
  }
}
