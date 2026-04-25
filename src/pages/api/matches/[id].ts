/**
 * /api/matches/[id] item endpoint
 *
 * GET /api/matches/[id] — retrieves a stored `IPostBattleReport` by
 * id. Returns 200 on success, 404 if the row is missing, 400 if the
 * stored payload lacks a `version` field, and 400 if the version
 * doesn't match this build's `POST_BATTLE_REPORT_VERSION`.
 *
 * Spec scenarios this satisfies:
 *  - "Unversioned report rejected on read"
 *  - "Unknown-version report rejected on read"
 *  - "Reload reads persisted report"
 *
 * @spec openspec/changes/add-victory-and-post-battle-summary/specs/after-combat-report/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import type { IPostBattleReport } from '@/utils/gameplay/postBattleReport';

import { readMatchLog } from '@/services/matchLog/MatchLogService';
import { getSQLiteService } from '@/services/persistence/SQLiteService';
import { POST_BATTLE_REPORT_VERSION } from '@/utils/gameplay/postBattleReport';

type ErrorResponse = { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IPostBattleReport | ErrorResponse>,
): Promise<void> {
  try {
    getSQLiteService().initialize();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Database initialization failed';
    res.status(500).json({ error: message });
    return;
  }

  const { id } = req.query;
  if (typeof id !== 'string' || id.length === 0) {
    res.status(400).json({ error: 'missing or invalid match id' });
    return;
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  const result = readMatchLog(id);
  switch (result.kind) {
    case 'ok':
      res.status(200).json(result.report);
      return;
    case 'not_found':
      res.status(404).json({ error: 'not found' });
      return;
    case 'unversioned':
      res.status(400).json({ error: 'unversioned report' });
      return;
    case 'unsupported_version':
      res.status(400).json({
        error: `unsupported report version ${result.version}, this build supports ${POST_BATTLE_REPORT_VERSION}`,
      });
      return;
  }
}
