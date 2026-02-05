/**
 * Forces API - List and Create
 *
 * GET /api/forces - List all forces
 * POST /api/forces - Create a new force
 *
 * @spec openspec/changes/add-force-management/proposal.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { IForceOperationResult } from '@/services/forces/ForceRepository';
import { getForceService } from '@/services/forces/ForceService';
import { getSQLiteService } from '@/services/persistence/SQLiteService';
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

type ErrorResponse = {
  error: string;
  code?: string;
};

// =============================================================================
// Handler
// =============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ListResponse | CreateResponse | ErrorResponse>,
): Promise<void> {
  // Initialize database
  try {
    getSQLiteService().initialize();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Database initialization failed';
    return res.status(500).json({ error: message });
  }

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
  res: NextApiResponse<ListResponse | ErrorResponse>,
) {
  try {
    const forces = forceService.getAllForces();
    return res.status(200).json({
      forces,
      count: forces.length,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to list forces';
    return res.status(500).json({ error: message });
  }
}

/**
 * POST /api/forces - Create a new force
 */
function handlePost(
  forceService: ReturnType<typeof getForceService>,
  req: NextApiRequest,
  res: NextApiResponse<CreateResponse | ErrorResponse>,
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
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to create force',
        errorCode: result.errorCode,
      });
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to create force';
    return res.status(500).json({ error: message });
  }
}
