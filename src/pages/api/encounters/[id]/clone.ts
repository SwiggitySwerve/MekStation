/**
 * Encounters API - Clone
 *
 * POST /api/encounters/[id]/clone - Clone an encounter
 *
 * @spec openspec/changes/add-encounter-system/specs/encounter-system/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import {
  initializeApiDatabase as initCloneEncounterDb,
  rejectMissingQueryString as readCloneEncounterId,
  rejectUnexpectedMethod as rejectCloneMethod,
  sendCaughtApiError as sendCloneEncounterError,
  sendOperationFailure as sendCloneEncounterFailure,
  type ApiErrorResponse,
} from '@/pages-modules/api/routeHelpers';
import { IEncounterOperationResult } from '@/services/encounter/EncounterRepository';
import { getEncounterService } from '@/services/encounter/EncounterService';
import { IEncounter } from '@/types/encounter';

const ENCOUNTERS_ID_CLONE_TS_FAILED_TO_CLONE_ENCOUNTER_1 =
  'Failed to clone encounter';

// =============================================================================
// Response Types
// =============================================================================

type CloneResponse = IEncounterOperationResult & {
  encounter?: IEncounter;
};

// =============================================================================
// Handler
// =============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CloneResponse | ApiErrorResponse>,
): Promise<void> {
  if (!initCloneEncounterDb(res)) return;

  if (rejectCloneMethod(req, res, ['POST'])) return;

  const id = readCloneEncounterId(
    req,
    res,
    'id',
    'Missing or invalid encounter ID',
  );
  if (!id) return;

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
      sendCloneEncounterFailure(
        res,
        result,
        ENCOUNTERS_ID_CLONE_TS_FAILED_TO_CLONE_ENCOUNTER_1,
      );
      return;
    }
  } catch (error) {
    sendCloneEncounterError(
      res,
      error,
      ENCOUNTERS_ID_CLONE_TS_FAILED_TO_CLONE_ENCOUNTER_1,
    );
    return;
  }
}
