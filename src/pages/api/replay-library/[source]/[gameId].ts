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

import {
  loadReplayLibraryNdjson,
  type IReplayLibraryBlockedLine,
} from '@/lib/events/replay/ReplayLibraryLoadPipeline';
import { type ApiErrorResponse } from '@/pages-modules/api/routeHelpers';
import { ReplaySource } from '@/types/gameplay';
import { logger } from '@/utils/logger';

// =============================================================================
// Response Types
// =============================================================================

type LoadResponse = {
  events: readonly IGameEvent[];
  gameId: string;
  /** sha256 over the complete raw source bytes (pipeline evidence). */
  sourceDigest: string;
};

/**
 * Typed blocked history (replay-safety PR 18): replaces the old
 * malformed-line skipping. Source identity and per-line evidence are
 * preserved; no partial event list ever ships.
 */
type BlockedResponse = {
  error: string;
  code: 'REPLAY_HISTORY_BLOCKED';
  blocked: {
    sourceId: string;
    formatId: string;
    formatVersion: number;
    sourceDigest: string;
    blockedLineCount: number;
    blockedLines: readonly IReplayLibraryBlockedLine[];
  };
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
  res: NextApiResponse<LoadResponse | BlockedResponse | ApiErrorResponse>,
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

  // Replay-safety PR 18: the load routes through the legacy adapter +
  // composed baseline schemas + provenance + census projector,
  // all-or-nothing. A single unsupported line blocks the WHOLE history
  // with typed per-line evidence - the previous behavior (skip malformed
  // lines, cast the rest unvalidated) presented partial replays as
  // complete.
  const sourceId = `${sourceRaw}/${gameIdRaw}`;
  const result = loadReplayLibraryNdjson(raw, sourceId);
  if (result.kind === 'blocked') {
    logger.warn('[replay-library] history blocked by replay pipeline', {
      sourceId,
      blockedLineCount: result.blockedLines.length,
      firstReason: result.blockedLines[0]?.reason,
    });
    res.status(422).json({
      error: 'replay history is blocked',
      code: 'REPLAY_HISTORY_BLOCKED',
      blocked: {
        sourceId,
        formatId: result.formatId,
        formatVersion: result.formatVersion,
        sourceDigest: result.sourceDigest,
        blockedLineCount: result.blockedLines.length,
        // Cap the per-line evidence in the response body; the count and
        // source digest identify the rest.
        blockedLines: result.blockedLines.slice(0, 20),
      },
    });
    return;
  }

  res.status(200).json({
    events: result.events,
    gameId: gameIdRaw,
    sourceDigest: result.sourceDigest,
  });
}
