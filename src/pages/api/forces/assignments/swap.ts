/**
 * Forces API - Swap Assignments
 *
 * POST /api/forces/assignments/swap - Swap two assignments
 *
 * @spec openspec/changes/add-force-management/proposal.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { IForceOperationResult } from '@/services/forces/ForceRepository';
import { getForceService } from '@/services/forces/ForceService';
import { getSQLiteService } from '@/services/persistence/SQLiteService';

// =============================================================================
// Response Types
// =============================================================================

type SwapResponse = IForceOperationResult;

type ErrorResponse = {
  error: string;
  code?: string;
};

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
  res: NextApiResponse<SwapResponse | ErrorResponse>,
): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  // Initialize database
  try {
    getSQLiteService().initialize();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Database initialization failed';
    return res.status(500).json({ error: message });
  }

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
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to swap assignments',
        errorCode: result.errorCode,
      });
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to swap assignments';
    return res.status(500).json({ error: message });
  }
}
