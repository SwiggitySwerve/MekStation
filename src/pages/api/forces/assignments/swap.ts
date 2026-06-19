/**
 * Forces API - Swap Assignments
 *
 * POST /api/forces/assignments/swap - Swap two assignments
 *
 * @spec openspec/changes/add-force-management/proposal.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import {
  initializeApiDatabase,
  rejectUnexpectedMethod,
  sendCaughtApiError,
  sendOperationFailure,
  type ApiErrorResponse,
} from '@/pages-modules/api/routeHelpers';
import { IForceOperationResult } from '@/services/forces/ForceRepository';
import { getForceService } from '@/services/forces/ForceService';

const FORCES_ASSIGNMENTS_SWAP_TS_FAILED_TO_SWAP_ASSIGNMENTS_1 =
  'Failed to swap assignments';

// =============================================================================
// Response Types
// =============================================================================

type SwapResponse = IForceOperationResult;

// =============================================================================
// Request Types
// =============================================================================

interface SwapBody {
  assignmentId1: string;
  assignmentId2: string;
}

// =============================================================================
// Handler
// =============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SwapResponse | ApiErrorResponse>,
): Promise<void> {
  if (rejectUnexpectedMethod(req, res, ['POST'])) return;
  if (!initializeApiDatabase(res)) return;

  const body = req.body as SwapBody;

  if (!body.assignmentId1 || !body.assignmentId2) {
    return res.status(400).json({
      error: 'Missing required fields: assignmentId1, assignmentId2',
    });
  }

  const forceService = getForceService();

  try {
    const result = forceService.swapAssignments(
      body.assignmentId1,
      body.assignmentId2,
    );

    if (result.success) {
      return res.status(200).json(result);
    } else {
      sendOperationFailure(
        res,
        result,
        FORCES_ASSIGNMENTS_SWAP_TS_FAILED_TO_SWAP_ASSIGNMENTS_1,
      );
      return;
    }
  } catch (error) {
    sendCaughtApiError(
      res,
      error,
      FORCES_ASSIGNMENTS_SWAP_TS_FAILED_TO_SWAP_ASSIGNMENTS_1,
    );
    return;
  }
}
