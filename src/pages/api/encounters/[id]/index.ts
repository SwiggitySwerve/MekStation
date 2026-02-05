/**
 * Encounters API - Individual Encounter Operations
 *
 * GET /api/encounters/[id] - Get an encounter by ID
 * PATCH /api/encounters/[id] - Update an encounter
 * DELETE /api/encounters/[id] - Delete an encounter
 *
 * @spec openspec/changes/add-encounter-system/specs/encounter-system/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { IEncounterOperationResult } from '@/services/encounter/EncounterRepository';
import { getEncounterService } from '@/services/encounter/EncounterService';
import { getSQLiteService } from '@/services/persistence/SQLiteService';
import { IEncounter, IUpdateEncounterInput } from '@/types/encounter';

// =============================================================================
// Response Types
// =============================================================================

type GetResponse = {
  encounter: IEncounter;
};

type UpdateResponse = IEncounterOperationResult & {
  encounter?: IEncounter;
};

type DeleteResponse = IEncounterOperationResult;

type ErrorResponse = {
  error: string;
  code?: string;
};

// =============================================================================
// Handler
// =============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<
    GetResponse | UpdateResponse | DeleteResponse | ErrorResponse
  >,
): Promise<void> {
  // Initialize database
  try {
    getSQLiteService().initialize();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Database initialization failed';
    return res.status(500).json({ error: message });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid encounter ID' });
  }

  const encounterService = getEncounterService();

  switch (req.method) {
    case 'GET':
      return handleGet(encounterService, id, res);
    case 'PATCH':
      return handlePatch(encounterService, id, req, res);
    case 'DELETE':
      return handleDelete(encounterService, id, res);
    default:
      res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
  }
}

/**
 * GET /api/encounters/[id] - Get an encounter by ID
 */
function handleGet(
  encounterService: ReturnType<typeof getEncounterService>,
  id: string,
  res: NextApiResponse<GetResponse | ErrorResponse>,
) {
  try {
    const encounter = encounterService.getEncounter(id);
    if (!encounter) {
      return res.status(404).json({ error: 'Encounter not found' });
    }
    return res.status(200).json({ encounter });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to get encounter';
    return res.status(500).json({ error: message });
  }
}

/**
 * PATCH /api/encounters/[id] - Update an encounter
 */
function handlePatch(
  encounterService: ReturnType<typeof getEncounterService>,
  id: string,
  req: NextApiRequest,
  res: NextApiResponse<UpdateResponse | ErrorResponse>,
) {
  try {
    const body = req.body as IUpdateEncounterInput;
    const result = encounterService.updateEncounter(id, body);

    if (result.success) {
      const encounter = encounterService.getEncounter(id);
      return res
        .status(200)
        .json({ ...result, encounter: encounter || undefined });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to update encounter',
        errorCode: result.errorCode,
      });
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to update encounter';
    return res.status(500).json({ error: message });
  }
}

/**
 * DELETE /api/encounters/[id] - Delete an encounter
 */
function handleDelete(
  encounterService: ReturnType<typeof getEncounterService>,
  id: string,
  res: NextApiResponse<DeleteResponse | ErrorResponse>,
) {
  try {
    const result = encounterService.deleteEncounter(id);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to delete encounter',
        errorCode: result.errorCode,
      });
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to delete encounter';
    return res.status(500).json({ error: message });
  }
}
