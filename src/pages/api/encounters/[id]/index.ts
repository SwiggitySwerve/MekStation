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

import {
  initializeApiDatabase,
  rejectMissingQueryString,
  sendCaughtApiError,
  sendOperationFailure,
  type ApiErrorResponse,
} from '@/pages-modules/api/routeHelpers';
import { IEncounterOperationResult } from '@/services/encounter/EncounterRepository';
import { getEncounterService } from '@/services/encounter/EncounterService';
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

// =============================================================================
// Handler
// =============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<
    GetResponse | UpdateResponse | DeleteResponse | ApiErrorResponse
  >,
): Promise<void> {
  if (!initializeApiDatabase(res)) return;

  const id = rejectMissingQueryString(
    req,
    res,
    'id',
    'Missing or invalid encounter ID',
  );
  if (!id) return;

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
  res: NextApiResponse<GetResponse | ApiErrorResponse>,
) {
  try {
    const encounter = encounterService.getEncounter(id);
    if (!encounter) {
      return res.status(404).json({ error: 'Encounter not found' });
    }
    return res.status(200).json({ encounter });
  } catch (error) {
    sendCaughtApiError(res, error, 'Failed to get encounter');
    return;
  }
}

/**
 * PATCH /api/encounters/[id] - Update an encounter
 */
function handlePatch(
  encounterService: ReturnType<typeof getEncounterService>,
  id: string,
  req: NextApiRequest,
  res: NextApiResponse<UpdateResponse | ApiErrorResponse>,
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
      sendOperationFailure(res, result, 'Failed to update encounter');
      return;
    }
  } catch (error) {
    sendCaughtApiError(res, error, 'Failed to update encounter');
    return;
  }
}

/**
 * DELETE /api/encounters/[id] - Delete an encounter
 */
function handleDelete(
  encounterService: ReturnType<typeof getEncounterService>,
  id: string,
  res: NextApiResponse<DeleteResponse | ApiErrorResponse>,
) {
  try {
    const result = encounterService.deleteEncounter(id);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      sendOperationFailure(res, result, 'Failed to delete encounter');
      return;
    }
  } catch (error) {
    sendCaughtApiError(res, error, 'Failed to delete encounter');
    return;
  }
}
