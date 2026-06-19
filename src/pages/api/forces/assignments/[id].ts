/**
 * Forces API - Assignment Operations
 *
 * PUT /api/forces/assignments/[id] - Update an assignment (pilot, unit, or both)
 * DELETE /api/forces/assignments/[id] - Clear an assignment
 *
 * @spec openspec/changes/add-force-management/proposal.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import {
  initializeApiDatabase as initAssignmentDb,
  rejectMissingQueryString as readAssignmentId,
  sendCaughtApiError as sendAssignmentError,
  sendOperationFailure as sendAssignmentFailure,
  type ApiErrorResponse,
} from '@/pages-modules/api/routeHelpers';
import { IForceOperationResult } from '@/services/forces/ForceRepository';
import { getForceService } from '@/services/forces/ForceService';
import { ForcePosition } from '@/types/force';

const FORCES_ASSIGNMENTS_ID_TS_FAILED_TO_ASSIGN_PILOT_AND_UNIT_1 =
  'Failed to assign pilot and unit';
const FORCES_ASSIGNMENTS_ID_TS_FAILED_TO_ASSIGN_PILOT_2 =
  'Failed to assign pilot';
const FORCES_ASSIGNMENTS_ID_TS_FAILED_TO_ASSIGN_UNIT_3 =
  'Failed to assign unit';
const FORCES_ASSIGNMENTS_ID_TS_FAILED_TO_SET_POSITION_4 =
  'Failed to set position';
const FORCES_ASSIGNMENTS_ID_TS_FAILED_TO_UPDATE_ASSIGNMENT_5 =
  'Failed to update assignment';
const FORCES_ASSIGNMENTS_ID_TS_FAILED_TO_CLEAR_ASSIGNMENT_6 =
  'Failed to clear assignment';

// =============================================================================
// Response Types
// =============================================================================

type OperationResponse = IForceOperationResult;

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
  res: NextApiResponse<OperationResponse | ApiErrorResponse>,
): Promise<void> {
  if (!initAssignmentDb(res)) return;

  const id = readAssignmentId(
    req,
    res,
    'id',
    'Missing or invalid assignment ID',
  );
  if (!id) return;

  const forceService = getForceService();

  switch (req.method) {
    case 'PUT':
      return handlePut(forceService, id, req, res);
    case 'DELETE':
      return handleDelete(forceService, id, res);
    default:
      res.setHeader('Allow', ['PUT', 'DELETE']);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
  }
}

/**
 * PUT /api/forces/assignments/[id] - Update an assignment
 */
function handlePut(
  forceService: ReturnType<typeof getForceService>,
  assignmentId: string,
  req: NextApiRequest,
  res: NextApiResponse<OperationResponse | ApiErrorResponse>,
) {
  try {
    const body = req.body as UpdateAssignmentBody;

    // Handle pilot and unit assignment together
    if (body.pilotId !== undefined && body.unitId !== undefined) {
      const result = forceService.assignPilotAndUnit(
        assignmentId,
        body.pilotId,
        body.unitId,
      );
      if (result.success) {
        return res.status(200).json(result);
      } else {
        sendAssignmentFailure(
          res,
          result,
          FORCES_ASSIGNMENTS_ID_TS_FAILED_TO_ASSIGN_PILOT_AND_UNIT_1,
        );
        return;
      }
    }

    // Handle pilot assignment only
    if (body.pilotId !== undefined) {
      const result = forceService.assignPilot(assignmentId, body.pilotId);
      if (result.success) {
        return res.status(200).json(result);
      } else {
        sendAssignmentFailure(
          res,
          result,
          FORCES_ASSIGNMENTS_ID_TS_FAILED_TO_ASSIGN_PILOT_2,
        );
        return;
      }
    }

    // Handle unit assignment only
    if (body.unitId !== undefined) {
      const result = forceService.assignUnit(assignmentId, body.unitId);
      if (result.success) {
        return res.status(200).json(result);
      } else {
        sendAssignmentFailure(
          res,
          result,
          FORCES_ASSIGNMENTS_ID_TS_FAILED_TO_ASSIGN_UNIT_3,
        );
        return;
      }
    }

    // Handle position update
    if (body.position !== undefined) {
      const result = forceService.setAssignmentPosition(
        assignmentId,
        body.position,
      );
      if (result.success) {
        return res.status(200).json(result);
      } else {
        sendAssignmentFailure(
          res,
          result,
          FORCES_ASSIGNMENTS_ID_TS_FAILED_TO_SET_POSITION_4,
        );
        return;
      }
    }

    return res.status(400).json({
      error: 'No update provided. Expected pilotId, unitId, or position',
    });
  } catch (error) {
    sendAssignmentError(
      res,
      error,
      FORCES_ASSIGNMENTS_ID_TS_FAILED_TO_UPDATE_ASSIGNMENT_5,
    );
    return;
  }
}

/**
 * DELETE /api/forces/assignments/[id] - Clear an assignment
 */
function handleDelete(
  forceService: ReturnType<typeof getForceService>,
  assignmentId: string,
  res: NextApiResponse<OperationResponse | ApiErrorResponse>,
) {
  try {
    const result = forceService.clearAssignment(assignmentId);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      sendAssignmentFailure(
        res,
        result,
        FORCES_ASSIGNMENTS_ID_TS_FAILED_TO_CLEAR_ASSIGNMENT_6,
      );
      return;
    }
  } catch (error) {
    sendAssignmentError(
      res,
      error,
      FORCES_ASSIGNMENTS_ID_TS_FAILED_TO_CLEAR_ASSIGNMENT_6,
    );
    return;
  }
}
