/**
 * Encounters API - Opponent Force
 *
 * PUT /api/encounters/[id]/opponent-force - Set opponent force
 * DELETE /api/encounters/[id]/opponent-force - Clear opponent force
 *
 * @spec openspec/changes/add-encounter-system/specs/encounter-system/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import {
  initializeApiDatabase as initOpponentForceDb,
  rejectMissingQueryString as readOpponentEncounterId,
  sendCaughtApiError as sendOpponentForceError,
  sendOperationFailure as sendOpponentForceFailure,
  type ApiErrorResponse,
} from '@/pages-modules/api/routeHelpers';
import { IEncounterOperationResult } from '@/services/encounter/EncounterRepository';
import { getEncounterService } from '@/services/encounter/EncounterService';
import { IEncounter } from '@/types/encounter';

const ENCOUNTERS_ID_OPPONENT_FORCE_TS_FAILED_TO_SET_OPPONENT_FORCE_1 =
  'Failed to set opponent force';
const ENCOUNTERS_ID_OPPONENT_FORCE_TS_FAILED_TO_CLEAR_OPPONENT_FORCE_2 =
  'Failed to clear opponent force';

// =============================================================================
// Response Types
// =============================================================================

type ForceResponse = IEncounterOperationResult & {
  encounter?: IEncounter;
};

// =============================================================================
// Handler
// =============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ForceResponse | ApiErrorResponse>,
): Promise<void> {
  if (!initOpponentForceDb(res)) return;

  const id = readOpponentEncounterId(
    req,
    res,
    'id',
    'Missing or invalid encounter ID',
  );
  if (!id) return;

  const encounterService = getEncounterService();

  switch (req.method) {
    case 'PUT':
      return handlePut(encounterService, id, req, res);
    case 'DELETE':
      return handleDelete(encounterService, id, res);
    default:
      res.setHeader('Allow', ['PUT', 'DELETE']);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
  }
}

/**
 * PUT /api/encounters/[id]/opponent-force - Set opponent force
 */
function handlePut(
  encounterService: ReturnType<typeof getEncounterService>,
  id: string,
  req: NextApiRequest,
  res: NextApiResponse<ForceResponse | ApiErrorResponse>,
) {
  try {
    const { forceId } = req.body as { forceId?: string };
    if (!forceId) {
      return res.status(400).json({ error: 'Missing required field: forceId' });
    }

    const result = encounterService.setOpponentForce(id, forceId);

    if (result.success) {
      const encounter = encounterService.getEncounter(id);
      return res
        .status(200)
        .json({ ...result, encounter: encounter || undefined });
    } else {
      sendOpponentForceFailure(
        res,
        result,
        ENCOUNTERS_ID_OPPONENT_FORCE_TS_FAILED_TO_SET_OPPONENT_FORCE_1,
      );
      return;
    }
  } catch (error) {
    sendOpponentForceError(
      res,
      error,
      ENCOUNTERS_ID_OPPONENT_FORCE_TS_FAILED_TO_SET_OPPONENT_FORCE_1,
    );
    return;
  }
}

/**
 * DELETE /api/encounters/[id]/opponent-force - Clear opponent force
 */
function handleDelete(
  encounterService: ReturnType<typeof getEncounterService>,
  id: string,
  res: NextApiResponse<ForceResponse | ApiErrorResponse>,
) {
  try {
    const result = encounterService.clearOpponentForce(id);

    if (result.success) {
      const encounter = encounterService.getEncounter(id);
      return res
        .status(200)
        .json({ ...result, encounter: encounter || undefined });
    } else {
      sendOpponentForceFailure(
        res,
        result,
        ENCOUNTERS_ID_OPPONENT_FORCE_TS_FAILED_TO_CLEAR_OPPONENT_FORCE_2,
      );
      return;
    }
  } catch (error) {
    sendOpponentForceError(
      res,
      error,
      ENCOUNTERS_ID_OPPONENT_FORCE_TS_FAILED_TO_CLEAR_OPPONENT_FORCE_2,
    );
    return;
  }
}
