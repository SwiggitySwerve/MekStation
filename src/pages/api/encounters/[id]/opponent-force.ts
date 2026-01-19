/**
 * Encounters API - Opponent Force
 *
 * PUT /api/encounters/[id]/opponent-force - Set opponent force
 * DELETE /api/encounters/[id]/opponent-force - Clear opponent force
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

type ForceResponse = IEncounterOperationResult & {
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
  res: NextApiResponse<ForceResponse | ErrorResponse>
): Promise<void> {
  // Initialize database
  try {
    getSQLiteService().initialize();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Database initialization failed';
    return res.status(500).json({ error: message });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid encounter ID' });
  }

  const encounterService = getEncounterService();

  switch (req.method) {
    case 'PUT':
      return handlePut(encounterService, id, req, res);
    case 'DELETE':
      return handleDelete(encounterService, id, res);
    default:
      res.setHeader('Allow', ['PUT', 'DELETE']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}

/**
 * PUT /api/encounters/[id]/opponent-force - Set opponent force
 */
function handlePut(
  encounterService: ReturnType<typeof getEncounterService>,
  id: string,
  req: NextApiRequest,
  res: NextApiResponse<ForceResponse | ErrorResponse>
) {
  try {
    const { forceId } = req.body as { forceId?: string };
    if (!forceId) {
      return res.status(400).json({ error: 'Missing required field: forceId' });
    }

    const result = encounterService.setOpponentForce(id, forceId);

    if (result.success) {
      const encounter = encounterService.getEncounter(id);
      return res.status(200).json({ ...result, encounter: encounter || undefined });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to set opponent force',
        errorCode: result.errorCode,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to set opponent force';
    return res.status(500).json({ error: message });
  }
}

/**
 * DELETE /api/encounters/[id]/opponent-force - Clear opponent force
 */
function handleDelete(
  encounterService: ReturnType<typeof getEncounterService>,
  id: string,
  res: NextApiResponse<ForceResponse | ErrorResponse>
) {
  try {
    const result = encounterService.clearOpponentForce(id);

    if (result.success) {
      const encounter = encounterService.getEncounter(id);
      return res.status(200).json({ ...result, encounter: encounter || undefined });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to clear opponent force',
        errorCode: result.errorCode,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to clear opponent force';
    return res.status(500).json({ error: message });
  }
}
