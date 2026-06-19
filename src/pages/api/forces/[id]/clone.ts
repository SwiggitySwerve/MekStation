/**
 * Forces API - Clone Force
 *
 * POST /api/forces/[id]/clone - Clone a force
 *
 * @spec openspec/changes/add-force-management/proposal.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import {
  initializeApiDatabase as initCloneForceDb,
  rejectMissingQueryString as readCloneForceId,
  rejectUnexpectedMethod,
  sendCaughtApiError as sendCloneForceError,
  sendOperationFailure as sendCloneForceFailure,
  type ApiErrorResponse,
} from '@/pages-modules/api/routeHelpers';
import { IForceOperationResult } from '@/services/forces/ForceRepository';
import { getForceService } from '@/services/forces/ForceService';
import { IForce } from '@/types/force';

const FORCES_ID_CLONE_TS_FAILED_TO_CLONE_FORCE_1 = 'Failed to clone force';

// =============================================================================
// Response Types
// =============================================================================

type CloneResponse = IForceOperationResult & {
  force?: IForce;
};

// =============================================================================
// Request Types
// =============================================================================

interface CloneBody {
  newName: string;
}

// =============================================================================
// Handler
// =============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CloneResponse | ApiErrorResponse>,
): Promise<void> {
  if (rejectUnexpectedMethod(req, res, ['POST'])) return;
  if (!initCloneForceDb(res)) return;

  const id = readCloneForceId(req, res, 'id', 'Missing or invalid force ID');
  if (!id) return;

  const body = req.body as CloneBody;
  if (!body.newName) {
    return res.status(400).json({ error: 'Missing required field: newName' });
  }

  const forceService = getForceService();

  try {
    const result = forceService.cloneForce(id, body.newName);

    if (result.success && result.id) {
      const force = forceService.getForce(result.id);
      return res.status(201).json({ ...result, force: force || undefined });
    } else {
      sendCloneForceFailure(
        res,
        result,
        FORCES_ID_CLONE_TS_FAILED_TO_CLONE_FORCE_1,
      );
      return;
    }
  } catch (error) {
    sendCloneForceError(res, error, FORCES_ID_CLONE_TS_FAILED_TO_CLONE_FORCE_1);
    return;
  }
}
