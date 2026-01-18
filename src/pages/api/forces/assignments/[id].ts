/**
 * Forces API - Assignment Operations
 *
 * PUT /api/forces/assignments/[id] - Update an assignment (pilot, unit, or both)
 * DELETE /api/forces/assignments/[id] - Clear an assignment
 *
 * @spec openspec/changes/add-force-management/proposal.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSQLiteService } from '@/services/persistence/SQLiteService';
import { getForceService } from '@/services/forces/ForceService';
import { ForcePosition } from '@/types/force';
import { IForceOperationResult } from '@/services/forces/ForceRepository';

// =============================================================================
// Response Types
// =============================================================================

type OperationResponse = IForceOperationResult;

type ErrorResponse = {
  error: string;
  code?: string;
};

// =============================================================================
// Request Types
// =============================================================================

interface UpdateAssignmentBody {
  pilotId?: string;
  unitId?: string;
  position?: ForcePosition;
}

// =============================================================================
// Handler
// =============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<OperationResponse | ErrorResponse>
): Promise<void> {
  // Initialize database
  try {
    getSQLiteService().initialize();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Database initialization failed';
    return res.status(500).json({ error: message });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid assignment ID' });
  }

  const forceService = getForceService();

  switch (req.method) {
    case 'PUT':
      return handlePut(forceService, id, req, res);
    case 'DELETE':
      return handleDelete(forceService, id, res);
    default:
      res.setHeader('Allow', ['PUT', 'DELETE']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}

/**
 * PUT /api/forces/assignments/[id] - Update an assignment
 */
function handlePut(
  forceService: ReturnType<typeof getForceService>,
  assignmentId: string,
  req: NextApiRequest,
  res: NextApiResponse<OperationResponse | ErrorResponse>
) {
  try {
    const body = req.body as UpdateAssignmentBody;

    // Handle pilot and unit assignment together
    if (body.pilotId !== undefined && body.unitId !== undefined) {
      const result = forceService.assignPilotAndUnit(
        assignmentId,
        body.pilotId,
        body.unitId
      );
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(400).json({
          success: false,
          error: result.error || 'Failed to assign pilot and unit',
          errorCode: result.errorCode,
        });
      }
    }

    // Handle pilot assignment only
    if (body.pilotId !== undefined) {
      const result = forceService.assignPilot(assignmentId, body.pilotId);
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(400).json({
          success: false,
          error: result.error || 'Failed to assign pilot',
          errorCode: result.errorCode,
        });
      }
    }

    // Handle unit assignment only
    if (body.unitId !== undefined) {
      const result = forceService.assignUnit(assignmentId, body.unitId);
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(400).json({
          success: false,
          error: result.error || 'Failed to assign unit',
          errorCode: result.errorCode,
        });
      }
    }

    // Handle position update
    if (body.position !== undefined) {
      const result = forceService.setAssignmentPosition(assignmentId, body.position);
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(400).json({
          success: false,
          error: result.error || 'Failed to set position',
          errorCode: result.errorCode,
        });
      }
    }

    return res.status(400).json({
      error: 'No update provided. Expected pilotId, unitId, or position',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update assignment';
    return res.status(500).json({ error: message });
  }
}

/**
 * DELETE /api/forces/assignments/[id] - Clear an assignment
 */
function handleDelete(
  forceService: ReturnType<typeof getForceService>,
  assignmentId: string,
  res: NextApiResponse<OperationResponse | ErrorResponse>
) {
  try {
    const result = forceService.clearAssignment(assignmentId);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to clear assignment',
        errorCode: result.errorCode,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to clear assignment';
    return res.status(500).json({ error: message });
  }
}
