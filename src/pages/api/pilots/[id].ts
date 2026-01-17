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
import { getSQLiteService } from '@/services/persistence/SQLiteService';
import { getPilotService, IPilotOperationResult } from '@/services/pilots';
import { IPilot } from '@/types/pilot';

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

type ErrorResponse = {
  error: string;
  code?: string;
};

// =============================================================================
// Handler
// =============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetResponse | UpdateResponse | DeleteResponse | ErrorResponse>
): Promise<void> {
  // Initialize database
  try {
    getSQLiteService().initialize();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Database initialization failed';
    return res.status(500).json({ error: message });
  }

  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid pilot ID' });
  }

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
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}

/**
 * GET /api/pilots/[id] - Get a pilot by ID
 */
function handleGet(
  pilotService: ReturnType<typeof getPilotService>,
  id: string,
  res: NextApiResponse<GetResponse | ErrorResponse>
) {
  try {
    const pilot = pilotService.getPilot(id);

    if (!pilot) {
      return res.status(404).json({ error: `Pilot ${id} not found` });
    }

    return res.status(200).json({ pilot });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get pilot';
    return res.status(500).json({ error: message });
  }
}

/**
 * PUT /api/pilots/[id] - Update a pilot
 */
function handlePut(
  pilotService: ReturnType<typeof getPilotService>,
  id: string,
  req: NextApiRequest,
  res: NextApiResponse<UpdateResponse | ErrorResponse>
) {
  try {
    const body = req.body as Partial<IPilot>;

    // Don't allow changing ID, type, or createdAt - extract only mutable fields
    const {
      id: _id,
      type: _type,
      createdAt: _createdAt,
      ...updates
    } = body;

    const result = pilotService.updatePilot(id, updates);

    if (result.success) {
      const pilot = pilotService.getPilot(id);
      return res.status(200).json({ ...result, pilot: pilot || undefined });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to update pilot',
        errorCode: result.errorCode,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update pilot';
    return res.status(500).json({ error: message });
  }
}

/**
 * DELETE /api/pilots/[id] - Delete a pilot
 */
function handleDelete(
  pilotService: ReturnType<typeof getPilotService>,
  id: string,
  res: NextApiResponse<DeleteResponse | ErrorResponse>
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
    const message = error instanceof Error ? error.message : 'Failed to delete pilot';
    return res.status(500).json({ error: message });
  }
}
