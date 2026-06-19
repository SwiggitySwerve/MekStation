/**
 * Replay Library — load events endpoint.
 *
 * GET /api/replay-library/<source>/<gameId> — streams an NDJSON event log
 * from `simulation-reports/<source>/<gameId>.jsonl`, parses each line, and
 * returns the array of `IGameEvent`s plus the resolved `gameId`.
 *
 * Path-traversal guard: `gameId` MUST match `^[A-Za-z0-9_-]+$` so a hostile
 * caller can't escape the replay partition with `..` segments. `source`
 * MUST be a recognized `ReplaySource` enum value — otherwise we 400.
 *
 * Server-side only — see the sibling `index.ts` route for the `node:fs`
 * isolation rationale.
 *
 * @spec openspec/changes/add-replay-library/specs/replay-library/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { IGameEvent } from '@/types/gameplay';

import { type ApiErrorResponse } from '@/pages-modules/api/routeHelpers';
import { ReplaySource } from '@/types/gameplay';
import { logger } from '@/utils/logger';

// =============================================================================
// Response Types
// =============================================================================

type LoadResponse = {
  events: IGameEvent[];
  gameId: string;
};

// =============================================================================
// Validation helpers
// =============================================================================

/**
 * Set of recognized `ReplaySource` enum values. Materialized once so the
 * per-request membership check is a single Set.has(). Reusing the enum's
 * `Object.values` keeps a future fifth variant zero-touch here.
 */
const RECOGNIZED_REPLAY_SOURCES: ReadonlySet<string> = new Set(
  Object.values(ReplaySource),
);

/**
 * Whitelist regex for `gameId`. Matches the swarm/quick writer naming —
 * `sim-1`, `quick-99`, `sim_42`, etc. Explicitly rejects `.`, `/`, `\`, and
 * any other path metacharacter so a hostile caller cannot escape the
 * partition directory with `..` segments. The `+` quantifier rules out
 * empty-string `gameId` (which would otherwise resolve to the partition
 * directory itself).
 */
const GAME_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

// =============================================================================
// Handler
// =============================================================================

/**
 * GET /api/replay-library/<source>/<gameId> — read + return one event log.
 * Empty file → 200 with `events: []`. Missing file → 404 NOT_FOUND.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LoadResponse | ApiErrorResponse>,
): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    return;
  }

  // `req.query` values are `string | string[] | undefined` — Next supplies
  // arrays for catch-all routes. Reject array shapes early so downstream
  // validation can assume a single string.
  const sourceRaw = req.query.source;
  const gameIdRaw = req.query.gameId;
  if (typeof sourceRaw !== 'string') {
    res
      .status(400)
      .json({ error: 'unknown replay source', code: 'BAD_SOURCE' });
    return;
  }
  if (typeof gameIdRaw !== 'string' || !GAME_ID_PATTERN.test(gameIdRaw)) {
    res.status(400).json({ error: 'invalid gameId', code: 'BAD_GAME_ID' });
    return;
  }

  if (!RECOGNIZED_REPLAY_SOURCES.has(sourceRaw)) {
    res
      .status(400)
      .json({ error: 'unknown replay source', code: 'BAD_SOURCE' });
    return;
  }

  // Compose the absolute path under `simulation-reports/`. Both `sourceRaw`
  // and `gameIdRaw` have been validated by this point — the regex prevents
  // path traversal and the enum membership check prevents partition escape.
  const filePath = path.resolve(
    process.cwd(),
    'simulation-reports',
    sourceRaw,
    `${gameIdRaw}.jsonl`,
  );

  let raw: string;
  try {
    raw = await fs.readFile(filePath, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      res.status(404).json({ error: 'replay not found', code: 'NOT_FOUND' });
      return;
    }
    logger.error('[replay-library] failed to read replay file', {
      filePath,
      err,
    });
    res
      .status(500)
      .json({ error: 'failed to read replay', code: 'READ_FAILED' });
    return;
  }

  // NDJSON: one event per line. Empty / whitespace-only lines are skipped
  // (a writer crash mid-line should not poison the whole replay). Malformed
  // lines are logged at debug and skipped — the alternative (failing the
  // whole request) loses the entire replay over a single bad line.
  const events: IGameEvent[] = [];
  const lines = raw.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      events.push(JSON.parse(trimmed) as IGameEvent);
    } catch (parseErr) {
      logger.debug('[replay-library] skipping malformed event line', {
        filePath,
        line: trimmed.slice(0, 200),
        parseErr,
      });
    }
  }

  res.status(200).json({ events, gameId: gameIdRaw });
}
