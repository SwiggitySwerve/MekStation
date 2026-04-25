/**
 * /api/matches collection endpoint
 *
 * POST /api/matches — accepts an `IPostBattleReport` body and writes
 * it to the `match_logs` table per design D4 / D10. Validates the
 * report's `version` field BEFORE INSERT so an unversioned or
 * unknown-version body is rejected with 400 (mirrors the read
 * surface).
 *
 * @spec openspec/changes/add-victory-and-post-battle-summary/specs/game-session-management/spec.md (Match Log Persistence Handshake)
 * @spec openspec/changes/add-victory-and-post-battle-summary/specs/after-combat-report/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { persistMatchLog } from '@/services/matchLog/MatchLogService';
import { getSQLiteService } from '@/services/persistence/SQLiteService';
import {
  POST_BATTLE_REPORT_VERSION,
  type IPostBattleReport,
} from '@/utils/gameplay/postBattleReport';

// =============================================================================
// Response Types
// =============================================================================

type CreateResponse = { matchId: string };
type ErrorResponse = { error: string };

// =============================================================================
// Handler
// =============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CreateResponse | ErrorResponse>,
): Promise<void> {
  // Initialize database connection (idempotent).
  try {
    getSQLiteService().initialize();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Database initialization failed';
    res.status(500).json({ error: message });
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  // Pull the body and validate the shape we care about. We don't
  // enforce a full schema check — Phase 1 trusts the caller (the
  // gameplay page or the ACAR finalize hook) — but we DO check the
  // version field both because it's the authoritative read-time
  // gate and because storing an unversioned blob would silently
  // brick the GET endpoint per spec.
  const body = req.body as Partial<IPostBattleReport> | undefined;
  if (!body || typeof body !== 'object') {
    res.status(400).json({ error: 'missing or invalid request body' });
    return;
  }
  if (typeof body.version !== 'number') {
    res.status(400).json({ error: 'unversioned report' });
    return;
  }
  if (body.version !== POST_BATTLE_REPORT_VERSION) {
    res.status(400).json({
      error: `unsupported report version ${body.version}, this build supports ${POST_BATTLE_REPORT_VERSION}`,
    });
    return;
  }
  if (typeof body.matchId !== 'string' || body.matchId.length === 0) {
    res.status(400).json({ error: 'missing matchId' });
    return;
  }

  try {
    const matchId = persistMatchLog(body as IPostBattleReport);
    res.status(201).json({ matchId });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'failed to persist match log';
    res.status(500).json({ error: message });
  }
}
