/**
 * Encounters API - Player Force
 *
 * PUT /api/encounters/[id]/player-force - Set player force
 * DELETE /api/encounters/[id]/player-force - Clear player force
 *
 * @spec openspec/changes/add-encounter-system/specs/encounter-system/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import {
  initializeApiDatabase as initPlayerForceDb,
  rejectMissingQueryString as readPlayerEncounterId,
  sendCaughtApiError as sendPlayerForceError,
  sendOperationFailure as sendPlayerForceFailure,
  type ApiErrorResponse,
} from '@/pages-modules/api/routeHelpers';
import { IEncounterOperationResult } from '@/services/encounter/EncounterRepository';
import { getEncounterService } from '@/services/encounter/EncounterService';
import { IEncounter } from '@/types/encounter';

const ENCOUNTERS_ID_PLAYER_FORCE_TS_FAILED_TO_SET_PLAYER_FORCE_1 =
  'Failed to set player force';
const ENCOUNTERS_ID_PLAYER_FORCE_TS_FAILED_TO_CLEAR_PLAYER_FORCE_2 =
  'Failed to clear player force';

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
  if (!initPlayerForceDb(res)) return;

  const id = readPlayerEncounterId(
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
 * PUT /api/encounters/[id]/player-force - Set player force
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

    const result = encounterService.setPlayerForce(id, forceId);

    if (result.success) {
      const encounter = encounterService.getEncounter(id);
      return res
        .status(200)
        .json({ ...result, encounter: encounter || undefined });
    } else {
      sendPlayerForceFailure(
        res,
        result,
        ENCOUNTERS_ID_PLAYER_FORCE_TS_FAILED_TO_SET_PLAYER_FORCE_1,
      );
      return;
    }
  } catch (error) {
    sendPlayerForceError(
      res,
      error,
      ENCOUNTERS_ID_PLAYER_FORCE_TS_FAILED_TO_SET_PLAYER_FORCE_1,
    );
    return;
  }
}

/**
 * DELETE /api/encounters/[id]/player-force - Clear player force
 */
function handleDelete(
  encounterService: ReturnType<typeof getEncounterService>,
  id: string,
  res: NextApiResponse<ForceResponse | ApiErrorResponse>,
) {
  try {
    const result = encounterService.updateEncounter(id, {
      playerForceId: undefined,
    });

    if (result.success) {
      const encounter = encounterService.getEncounter(id);
      return res
        .status(200)
        .json({ ...result, encounter: encounter || undefined });
    } else {
      sendPlayerForceFailure(
        res,
        result,
        ENCOUNTERS_ID_PLAYER_FORCE_TS_FAILED_TO_CLEAR_PLAYER_FORCE_2,
      );
      return;
    }
  } catch (error) {
    sendPlayerForceError(
      res,
      error,
      ENCOUNTERS_ID_PLAYER_FORCE_TS_FAILED_TO_CLEAR_PLAYER_FORCE_2,
    );
    return;
  }
}
