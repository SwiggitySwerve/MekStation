/**
 * Vault Sync API
 *
 * POST /api/vault/sync - Report local sync status for the shared-items page.
 *
 * @spec openspec/specs/unit-sharing/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import {
  rejectUnexpectedMethod,
  sendLoggedApiError,
  type ApiErrorResponse,
} from '@/pages-modules/api/routeHelpers';
import { getSyncEngine } from '@/services/vault/SyncEngine';

interface SyncResponse {
  success: true;
  pendingOutbound: number;
  conflicts: number;
  currentVersion: number;
  checkedAt: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SyncResponse | ApiErrorResponse>,
): Promise<void> {
  if (
    rejectUnexpectedMethod(req, res, ['POST'], () => ({
      error: 'Method not allowed',
    }))
  )
    return;

  try {
    const syncEngine = getSyncEngine();
    const [unsyncedChanges, conflicts, currentVersion] = await Promise.all([
      syncEngine.getUnsyncedChanges(),
      syncEngine.getPendingConflicts(),
      syncEngine.getCurrentVersion(),
    ]);

    return res.status(200).json({
      success: true,
      pendingOutbound: unsyncedChanges.length,
      conflicts: conflicts.length,
      currentVersion,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    sendLoggedApiError(res, 'Vault sync API error:', error);
  }
}
