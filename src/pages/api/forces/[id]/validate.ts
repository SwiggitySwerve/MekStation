/**
 * Forces API - Validate Force
 *
 * GET /api/forces/[id]/validate - Validate a force
 *
 * @spec openspec/changes/add-force-management/proposal.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { getForceService } from '@/services/forces/ForceService';
import { getSQLiteService } from '@/services/persistence/SQLiteService';
import { IForceValidation } from '@/types/force';

// =============================================================================
// Response Types
// =============================================================================

type ValidateResponse = {
  validation: IForceValidation;
};

type ErrorResponse = {
  error: string;
};

// =============================================================================
// Handler
// =============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ValidateResponse | ErrorResponse>,
): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
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

  const forceService = getForceService();

  try {
    const validation = forceService.validateForce(id);
    return res.status(200).json({ validation });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to validate force';
    return res.status(500).json({ error: message });
  }
}
