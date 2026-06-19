/**
 * Encounters API - Validation
 *
 * GET /api/encounters/[id]/validate - Validate an encounter
 *
 * @spec openspec/changes/add-encounter-system/specs/encounter-system/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import {
  initializeApiDatabase as initValidateEncounterDb,
  rejectMissingQueryString as readValidateEncounterId,
  rejectUnexpectedMethod as rejectValidateMethod,
  sendCaughtApiError as sendValidateEncounterError,
  type ApiErrorResponse,
} from '@/pages-modules/api/routeHelpers';
import { getEncounterService } from '@/services/encounter/EncounterService';
import { IEncounterValidationResult } from '@/types/encounter';

// =============================================================================
// Response Types
// =============================================================================

type ValidationResponse = {
  validation: IEncounterValidationResult;
};

// =============================================================================
// Handler
// =============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ValidationResponse | ApiErrorResponse>,
): Promise<void> {
  if (!initValidateEncounterDb(res)) return;

  if (rejectValidateMethod(req, res, ['GET'])) return;

  const id = readValidateEncounterId(
    req,
    res,
    'id',
    'Missing or invalid encounter ID',
  );
  if (!id) return;

  const encounterService = getEncounterService();

  try {
    const validation = encounterService.validateEncounter(id);
    return res.status(200).json({ validation });
  } catch (error) {
    sendValidateEncounterError(res, error, 'Failed to validate encounter');
    return;
  }
}
