/**
 * Forces API - List and Create
 *
 * GET /api/forces - List all forces
 * POST /api/forces - Create a new force
 *
 * @spec openspec/changes/add-force-management/proposal.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import {
  initializeApiDatabase,
  sendCaughtApiError,
  sendOperationFailure,
  type ApiErrorResponse,
} from '@/pages-modules/api/routeHelpers';
import { IForceOperationResult } from '@/services/forces/ForceRepository';
import { getForceService } from '@/services/forces/ForceService';
import { IForce, ICreateForceRequest } from '@/types/force';

// =============================================================================
// Response Types
// =============================================================================

type ListResponse = {
  forces: readonly IForce[];
  count: number;
};

type CreateResponse = IForceOperationResult & {
  force?: IForce;
};

// =============================================================================
// Handler
// =============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ListResponse | CreateResponse | ApiErrorResponse>,
): Promise<void> {
  if (!initializeApiDatabase(res)) return;

  const forceService = getForceService();

  switch (req.method) {
    case 'GET':
      return handleGet(forceService, res);
    case 'POST':
      return handlePost(forceService, req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
  }
}

/**
 * GET /api/forces - List all forces
 */
function handleGet(
  forceService: ReturnType<typeof getForceService>,
  res: NextApiResponse<ListResponse | ApiErrorResponse>,
) {
  try {
    const forces = forceService.getAllForces();
    return res.status(200).json({
      forces,
      count: forces.length,
    });
  } catch (error) {
    sendCaughtApiError(res, error, 'Failed to list forces');
    return;
  }
}

/**
 * POST /api/forces - Create a new force
 */
function handlePost(
  forceService: ReturnType<typeof getForceService>,
  req: NextApiRequest,
  res: NextApiResponse<CreateResponse | ApiErrorResponse>,
) {
  try {
    const body = req.body as ICreateForceRequest;

    if (!body.name) {
      return res.status(400).json({ error: 'Missing required field: name' });
    }

    if (!body.forceType) {
      return res
        .status(400)
        .json({ error: 'Missing required field: forceType' });
    }

    const result = forceService.createForce(body);

    if (result.success && result.id) {
      const force = forceService.getForce(result.id);
      return res.status(201).json({ ...result, force: force || undefined });
    } else {
      sendOperationFailure(res, result, 'Failed to create force');
      return;
    }
  } catch (error) {
    sendCaughtApiError(res, error, 'Failed to create force');
    return;
  }
}
