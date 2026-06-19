/**
 * Forces API - Individual Force Operations
 *
 * GET /api/forces/[id] - Get a force by ID
 * PATCH /api/forces/[id] - Update a force
 * DELETE /api/forces/[id] - Delete a force
 *
 * @spec openspec/changes/add-force-management/proposal.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import {
  initializeApiDatabase as initForceDb,
  rejectMissingQueryString as readForceId,
  sendCaughtApiError as sendForceError,
  sendOperationFailure as sendForceFailure,
  type ApiErrorResponse,
} from '@/pages-modules/api/routeHelpers';
import { IForceOperationResult } from '@/services/forces/ForceRepository';
import { getForceService } from '@/services/forces/ForceService';
import { IForce, IUpdateForceRequest } from '@/types/force';

const FORCES_ID_TS_FAILED_TO_GET_FORCE_1 = 'Failed to get force';
const FORCES_ID_TS_FAILED_TO_UPDATE_FORCE_2 = 'Failed to update force';
const FORCES_ID_TS_FAILED_TO_DELETE_FORCE_3 = 'Failed to delete force';

// =============================================================================
// Response Types
// =============================================================================

type GetResponse = {
  force: IForce;
};

type UpdateResponse = IForceOperationResult & {
  force?: IForce;
};

type DeleteResponse = IForceOperationResult;

// =============================================================================
// Handler
// =============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<
    GetResponse | UpdateResponse | DeleteResponse | ApiErrorResponse
  >,
): Promise<void> {
  if (!initForceDb(res)) return;

  const id = readForceId(req, res, 'id', 'Missing or invalid force ID');
  if (!id) return;

  const forceService = getForceService();

  switch (req.method) {
    case 'GET':
      return handleGet(forceService, id, res);
    case 'PATCH':
      return handlePatch(forceService, id, req, res);
    case 'DELETE':
      return handleDelete(forceService, id, res);
    default:
      res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
  }
}

/**
 * GET /api/forces/[id] - Get a force by ID
 */
function handleGet(
  forceService: ReturnType<typeof getForceService>,
  id: string,
  res: NextApiResponse<GetResponse | ApiErrorResponse>,
) {
  try {
    const force = forceService.getForce(id);
    if (!force) {
      return res.status(404).json({ error: 'Force not found' });
    }
    return res.status(200).json({ force });
  } catch (error) {
    sendForceError(res, error, FORCES_ID_TS_FAILED_TO_GET_FORCE_1);
    return;
  }
}

/**
 * PATCH /api/forces/[id] - Update a force
 */
function handlePatch(
  forceService: ReturnType<typeof getForceService>,
  id: string,
  req: NextApiRequest,
  res: NextApiResponse<UpdateResponse | ApiErrorResponse>,
) {
  try {
    const body = req.body as IUpdateForceRequest;
    const result = forceService.updateForce(id, body);

    if (result.success) {
      const force = forceService.getForce(id);
      return res.status(200).json({ ...result, force: force || undefined });
    } else {
      sendForceFailure(res, result, FORCES_ID_TS_FAILED_TO_UPDATE_FORCE_2);
      return;
    }
  } catch (error) {
    sendForceError(res, error, FORCES_ID_TS_FAILED_TO_UPDATE_FORCE_2);
    return;
  }
}

/**
 * DELETE /api/forces/[id] - Delete a force
 */
function handleDelete(
  forceService: ReturnType<typeof getForceService>,
  id: string,
  res: NextApiResponse<DeleteResponse | ApiErrorResponse>,
) {
  try {
    const result = forceService.deleteForce(id);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      sendForceFailure(res, result, FORCES_ID_TS_FAILED_TO_DELETE_FORCE_3);
      return;
    }
  } catch (error) {
    sendForceError(res, error, FORCES_ID_TS_FAILED_TO_DELETE_FORCE_3);
    return;
  }
}
