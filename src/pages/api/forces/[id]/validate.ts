/**
 * Forces API - Validate Force
 *
 * GET /api/forces/[id]/validate - Validate a force
 *
 * @spec openspec/changes/add-force-management/proposal.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import {
  initializeApiDatabase as initValidateForceDb,
  rejectMissingQueryString as readValidateForceId,
  rejectUnexpectedMethod,
  sendCaughtApiError as sendValidateForceError,
  type ApiErrorResponse,
} from '@/pages-modules/api/routeHelpers';
import { getForceService } from '@/services/forces/ForceService';
import { IForceValidation } from '@/types/force';

// =============================================================================
// Response Types
// =============================================================================

type ValidateResponse = {
  validation: IForceValidation;
};

// =============================================================================
// Handler
// =============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ValidateResponse | ApiErrorResponse>,
): Promise<void> {
  if (rejectUnexpectedMethod(req, res, ['GET'])) return;
  if (!initValidateForceDb(res)) return;

  const id = readValidateForceId(req, res, 'id', 'Missing or invalid force ID');
  if (!id) return;

  const forceService = getForceService();

  try {
    const validation = forceService.validateForce(id);
    return res.status(200).json({ validation });
  } catch (error) {
    sendValidateForceError(res, error, 'Failed to validate force');
    return;
  }
}
