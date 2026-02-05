/**
 * Encounters API - List and Create
 *
 * GET /api/encounters - List all encounters
 * POST /api/encounters - Create a new encounter
 *
 * @spec openspec/changes/add-encounter-system/specs/encounter-system/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { IEncounterOperationResult } from '@/services/encounter/EncounterRepository';
import { getEncounterService } from '@/services/encounter/EncounterService';
import { getSQLiteService } from '@/services/persistence/SQLiteService';
import { IEncounter, ICreateEncounterInput } from '@/types/encounter';

// =============================================================================
// Response Types
// =============================================================================

type ListResponse = {
  encounters: readonly IEncounter[];
  count: number;
};

type CreateResponse = IEncounterOperationResult & {
  encounter?: IEncounter;
};

type ErrorResponse = {
  error: string;
  code?: string;
};

// =============================================================================
// Handler
// =============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ListResponse | CreateResponse | ErrorResponse>,
): Promise<void> {
  // Initialize database
  try {
    getSQLiteService().initialize();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Database initialization failed';
    return res.status(500).json({ error: message });
  }

  const encounterService = getEncounterService();

  switch (req.method) {
    case 'GET':
      return handleGet(encounterService, res);
    case 'POST':
      return handlePost(encounterService, req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
  }
}

/**
 * GET /api/encounters - List all encounters
 */
function handleGet(
  encounterService: ReturnType<typeof getEncounterService>,
  res: NextApiResponse<ListResponse | ErrorResponse>,
) {
  try {
    const encounters = encounterService.getAllEncounters();
    return res.status(200).json({
      encounters,
      count: encounters.length,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to list encounters';
    return res.status(500).json({ error: message });
  }
}

/**
 * POST /api/encounters - Create a new encounter
 */
function handlePost(
  encounterService: ReturnType<typeof getEncounterService>,
  req: NextApiRequest,
  res: NextApiResponse<CreateResponse | ErrorResponse>,
) {
  try {
    const body = req.body as ICreateEncounterInput;

    if (!body.name) {
      return res.status(400).json({ error: 'Missing required field: name' });
    }

    const result = encounterService.createEncounter(body);

    if (result.success && result.id) {
      const encounter = encounterService.getEncounter(result.id);
      return res
        .status(201)
        .json({ ...result, encounter: encounter || undefined });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to create encounter',
        errorCode: result.errorCode,
      });
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to create encounter';
    return res.status(500).json({ error: message });
  }
}
