/**
 * Encounters API - Validation
 *
 * GET /api/encounters/[id]/validate - Validate an encounter
 *
 * @spec openspec/changes/add-encounter-system/specs/encounter-system/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { getEncounterService } from '@/services/encounter/EncounterService';
import { getSQLiteService } from '@/services/persistence/SQLiteService';
import { IEncounterValidationResult } from '@/types/encounter';

// =============================================================================
// Response Types
// =============================================================================

type ValidationResponse = {
  validation: IEncounterValidationResult;
};

type ErrorResponse = {
  error: string;
};

// =============================================================================
// Handler
// =============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ValidationResponse | ErrorResponse>,
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
    return res.status(400).json({ error: 'Missing or invalid encounter ID' });
  }

  const encounterService = getEncounterService();

  try {
    const validation = encounterService.validateEncounter(id);
    return res.status(200).json({ validation });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to validate encounter';
    return res.status(500).json({ error: message });
  }
}
