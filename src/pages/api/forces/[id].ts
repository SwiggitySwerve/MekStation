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

import { IForceOperationResult } from '@/services/forces/ForceRepository';
import { getForceService } from '@/services/forces/ForceService';
import { getSQLiteService } from '@/services/persistence/SQLiteService';
import { IForce, IUpdateForceRequest } from '@/types/force';

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

type ErrorResponse = {
  error: string;
  code?: string;
};

// =============================================================================
// Handler
// =============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<
    GetResponse | UpdateResponse | DeleteResponse | ErrorResponse
  >,
): Promise<void> {
  // Initialize database
  try {
    getSQLiteService().initialize();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Database initialization failed';
    return res.status(500).json({ error: message });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid force ID' });
  }

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
  res: NextApiResponse<GetResponse | ErrorResponse>,
) {
  try {
    const force = forceService.getForce(id);
    if (!force) {
      return res.status(404).json({ error: 'Force not found' });
    }
    return res.status(200).json({ force });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to get force';
    return res.status(500).json({ error: message });
  }
}

/**
 * PATCH /api/forces/[id] - Update a force
 */
function handlePatch(
  forceService: ReturnType<typeof getForceService>,
  id: string,
  req: NextApiRequest,
  res: NextApiResponse<UpdateResponse | ErrorResponse>,
) {
  try {
    const body = req.body as IUpdateForceRequest;
    const result = forceService.updateForce(id, body);

    if (result.success) {
      const force = forceService.getForce(id);
      return res.status(200).json({ ...result, force: force || undefined });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to update force',
        errorCode: result.errorCode,
      });
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to update force';
    return res.status(500).json({ error: message });
  }
}

/**
 * DELETE /api/forces/[id] - Delete a force
 */
function handleDelete(
  forceService: ReturnType<typeof getForceService>,
  id: string,
  res: NextApiResponse<DeleteResponse | ErrorResponse>,
) {
  try {
    const result = forceService.deleteForce(id);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to delete force',
        errorCode: result.errorCode,
      });
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to delete force';
    return res.status(500).json({ error: message });
  }
}
