/**
 * Encounters API - Clone
 *
 * POST /api/encounters/[id]/clone - Clone an encounter
 *
 * @spec openspec/changes/add-encounter-system/specs/encounter-system/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSQLiteService } from '@/services/persistence/SQLiteService';
import { getEncounterService } from '@/services/encounter/EncounterService';
import { IEncounter } from '@/types/encounter';
import { IEncounterOperationResult } from '@/services/encounter/EncounterRepository';

// =============================================================================
// Response Types
// =============================================================================

type CloneResponse = IEncounterOperationResult & {
  encounter?: IEncounter;
};

type ErrorResponse = {
  error: string;
};

// =============================================================================
// Handler
// =============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CloneResponse | ErrorResponse>
): Promise<void> {
  // Initialize database
  try {
    getSQLiteService().initialize();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Database initialization failed';
    return res.status(500).json({ error: message });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid encounter ID' });
  }

  const { newName } = req.body as { newName?: string };
  if (!newName) {
    return res.status(400).json({ error: 'Missing required field: newName' });
  }

  const encounterService = getEncounterService();

  try {
    const result = encounterService.cloneEncounter(id, newName);

    if (result.success && result.id) {
      const encounter = encounterService.getEncounter(result.id);
      return res.status(201).json({
        ...result,
        encounter: encounter || undefined,
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to clone encounter',
        errorCode: result.errorCode,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to clone encounter';
    return res.status(500).json({ error: message });
  }
}
