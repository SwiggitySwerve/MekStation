/**
 * Pilots API - Single Pilot Operations
 *
 * GET /api/pilots/[id] - Get a pilot by ID
 * PUT /api/pilots/[id] - Update a pilot
 * DELETE /api/pilots/[id] - Delete a pilot
 *
 * @spec openspec/changes/add-pilot-system/specs/pilot-system/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import {
  initializeApiDatabase as initPilotDb,
  rejectMissingQueryString as readPilotId,
  sendCaughtApiError as sendPilotError,
  sendOperationFailure as sendPilotFailure,
  type ApiErrorResponse,
} from '@/pages-modules/api/routeHelpers';
import { getPilotService, IPilotOperationResult } from '@/services/pilots';
import { IPilot } from '@/types/pilot';

const PILOTS_ID_TS_FAILED_TO_GET_PILOT_1 = 'Failed to get pilot';
const PILOTS_ID_TS_FAILED_TO_UPDATE_PILOT_2 = 'Failed to update pilot';
const PILOTS_ID_TS_FAILED_TO_DELETE_PILOT_3 = 'Failed to delete pilot';

// =============================================================================
// Response Types
// =============================================================================

type GetResponse = {
  pilot: IPilot;
};

type UpdateResponse = IPilotOperationResult & {
  pilot?: IPilot;
};

type DeleteResponse = IPilotOperationResult;

// =============================================================================
// Handler
// =============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<
    GetResponse | UpdateResponse | DeleteResponse | ApiErrorResponse
  >,
): Promise<void> {
  if (!initPilotDb(res)) return;

  const id = readPilotId(req, res, 'id', 'Invalid pilot ID');
  if (!id) return;

  const pilotService = getPilotService();

  switch (req.method) {
    case 'GET':
      return handleGet(pilotService, id, res);
    case 'PUT':
      return handlePut(pilotService, id, req, res);
    case 'DELETE':
      return handleDelete(pilotService, id, res);
    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
  }
}

/**
 * GET /api/pilots/[id] - Get a pilot by ID
 */
function handleGet(
  pilotService: ReturnType<typeof getPilotService>,
  id: string,
  res: NextApiResponse<GetResponse | ApiErrorResponse>,
) {
  try {
    const pilot = pilotService.getPilot(id);

    if (!pilot) {
      return res.status(404).json({ error: `Pilot ${id} not found` });
    }

    return res.status(200).json({ pilot });
  } catch (error) {
    sendPilotError(res, error, PILOTS_ID_TS_FAILED_TO_GET_PILOT_1);
    return;
  }
}

/**
 * PUT /api/pilots/[id] - Update a pilot
 */
function handlePut(
  pilotService: ReturnType<typeof getPilotService>,
  id: string,
  req: NextApiRequest,
  res: NextApiResponse<UpdateResponse | ApiErrorResponse>,
) {
  try {
    const body = req.body as Partial<IPilot>;

    // Don't allow changing ID, type, or createdAt - extract only mutable fields
    const { id: _id, type: _type, createdAt: _createdAt, ...updates } = body;

    const result = pilotService.updatePilot(id, updates);

    if (result.success) {
      const pilot = pilotService.getPilot(id);
      return res.status(200).json({ ...result, pilot: pilot || undefined });
    } else {
      sendPilotFailure(res, result, PILOTS_ID_TS_FAILED_TO_UPDATE_PILOT_2);
      return;
    }
  } catch (error) {
    sendPilotError(res, error, PILOTS_ID_TS_FAILED_TO_UPDATE_PILOT_2);
    return;
  }
}

/**
 * DELETE /api/pilots/[id] - Delete a pilot
 */
function handleDelete(
  pilotService: ReturnType<typeof getPilotService>,
  id: string,
  res: NextApiResponse<DeleteResponse | ApiErrorResponse>,
) {
  try {
    const result = pilotService.deletePilot(id);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(404).json({
        success: false,
        error: result.error || 'Failed to delete pilot',
        errorCode: result.errorCode,
      });
    }
  } catch (error) {
    sendPilotError(res, error, PILOTS_ID_TS_FAILED_TO_DELETE_PILOT_3);
    return;
  }
}
