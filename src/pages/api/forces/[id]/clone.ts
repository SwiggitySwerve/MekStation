/**
 * Forces API - Clone Force
 *
 * POST /api/forces/[id]/clone - Clone a force
 *
 * @spec openspec/changes/add-force-management/proposal.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { IForceOperationResult } from '@/services/forces/ForceRepository';
import { getForceService } from '@/services/forces/ForceService';
import { getSQLiteService } from '@/services/persistence/SQLiteService';
import { IForce } from '@/types/force';

// =============================================================================
// Response Types
// =============================================================================

type CloneResponse = IForceOperationResult & {
  force?: IForce;
};

type ErrorResponse = {
  error: string;
  code?: string;
};

// =============================================================================
// Request Types
// =============================================================================

interface CloneBody {
  newName: string;
}

// =============================================================================
// Handler
// =============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CloneResponse | ErrorResponse>,
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

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid force ID' });
  }

  const body = req.body as CloneBody;
  if (!body.newName) {
    return res.status(400).json({ error: 'Missing required field: newName' });
  }

  const forceService = getForceService();

  try {
    const result = forceService.cloneForce(id, body.newName);

    if (result.success && result.id) {
      const force = forceService.getForce(result.id);
      return res.status(201).json({ ...result, force: force || undefined });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to clone force',
        errorCode: result.errorCode,
      });
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to clone force';
    return res.status(500).json({ error: message });
  }
}
