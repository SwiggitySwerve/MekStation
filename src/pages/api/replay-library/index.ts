/**
 * Replay Library — list endpoint.
 *
 * GET /api/replay-library/index — returns the parsed `replay-index.json`
 * manifest. When the index file is missing, falls back to scanning the
 * `simulation-reports/` tree on-disk (`scanReplayDirectory`) so a fresh
 * checkout still serves whatever pre-existing replay logs exist.
 *
 * Server-side only: uses deep imports from `@/replay-library/index-reader`
 * (which itself imports `node:fs/promises`) so this handler must never run
 * in the browser bundle. The `pages/api/` directory makes that automatic
 * for Next.js, but consumers MUST NOT import from `@/replay-library` (the
 * barrel) in any browser-bound file — Turbopack traces `node:fs` through
 * the barrel re-exports and breaks the client build.
 *
 * @spec openspec/changes/add-replay-library/specs/replay-library/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import type { IReplayManifestEntry } from '@/replay-library/types';

import { type ApiErrorResponse } from '@/pages-modules/api/routeHelpers';
import { readReplayIndex } from '@/replay-library/index-reader';
import { logger } from '@/utils/logger';

// =============================================================================
// Response Types
// =============================================================================

type ListResponse = {
  entries: readonly IReplayManifestEntry[];
  total: number;
};

// =============================================================================
// Handler
// =============================================================================

/**
 * GET /api/replay-library/index — list every replay manifest entry. The
 * underlying reader transparently falls back to a backfill scan when the
 * index file is absent, so callers see a consistent response shape whether
 * or not the index has been materialized yet.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ListResponse | ApiErrorResponse>,
): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    return;
  }

  try {
    const entries = await readReplayIndex();
    res.status(200).json({ entries, total: entries.length });
  } catch (err) {
    // Reader propagates non-ENOENT read/parse failures. Surface a generic
    // 500 to clients but log the underlying cause server-side so operators
    // can diagnose disk corruption / permission issues without hand-rolling
    // a custom diagnostic endpoint.
    logger.error('[replay-library] failed to load replay index', err);
    res
      .status(500)
      .json({ error: 'failed to load replay index', code: 'READ_FAILED' });
  }
}
