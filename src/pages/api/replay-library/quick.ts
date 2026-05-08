/**
 * Replay Library — quick-game persist endpoint.
 *
 * `POST /api/replay-library/quick` — accepts a completed quick-game's
 * event log + minimal metadata, validates inputs, **dedupes against the
 * current manifest**, then delegates the actual write to the unit-tested
 * `persistQuickGame()` pipeline.
 *
 * This route is the missing wire that closes the deferred follow-on
 * (`add-replay-library` task 5.11): the browser cannot write to the
 * local filesystem, so the React `<QuickGameResults>` POSTs here on the
 * `endedAt` transition. The Council-approved plan calls this out
 * explicitly — see the council synthesis "Replay Loop Closure" run.
 *
 * Idempotency (Momus blocking gap from Phase 2):
 *   - Hard refresh of an already-persisted game would re-fire the
 *     React effect (the `useRef` guard resets on remount).
 *   - `appendManifestEntry` does a blind append with no dedup, so we
 *     short-circuit on duplicates HERE — read the current manifest and
 *     return `200 { persisted: false, alreadyPersisted: true }` when the
 *     `gameId` already exists. Never invoke `persistQuickGame()` twice
 *     for the same game.
 *
 * Validation pattern mirrors the sibling `[source]/[gameId].ts` route:
 *   - inline runtime checks (no Zod — established convention in this
 *     directory; future consolidation is a separate sweep)
 *   - shared `ErrorResponse = { error, code? }` shape
 *   - `gameId` regex `^[A-Za-z0-9_-]+$` — same pattern, copied not
 *     imported (sibling route uses module-private const)
 *
 * Server-side only — `persistQuickGame` is Node-only by design. The
 * shouldPersistToDisk three-gate guard inside it falls through cleanly
 * when called from this handler under `next dev` or production.
 *
 * @spec openspec/changes/archive/2026-05-07-add-replay-library/specs/replay-library/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import type { IGameEvent } from '@/types/gameplay';

import {
  buildQuickManifestEntry,
  persistQuickGame,
  type IPersistQuickGameInput,
  type IPersistQuickGameResult,
} from '@/components/quickgame/persistQuickGame';
import { readReplayIndex } from '@/replay-library/index-reader';
import { logger } from '@/utils/logger';

// =============================================================================
// Response Types
// =============================================================================

type SuccessResponse = {
  persisted: boolean;
  alreadyPersisted: boolean;
  manifestEntry: IPersistQuickGameResult['manifestEntry'];
  path: string | null;
};

type ErrorResponse = {
  error: string;
  code?: string;
};

// =============================================================================
// Validation helpers
// =============================================================================

/**
 * Same regex as the sibling `[source]/[gameId].ts` route. Duplicated
 * intentionally — the sibling const is module-private and cross-route
 * imports for a 1-line regex would couple two files harder than copying.
 * If we ever need a third reuse, lift to `@/replay-library/validation`.
 */
const GAME_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

const VALID_WINNERS: ReadonlySet<string> = new Set([
  'player',
  'opponent',
  'draw',
]);

/**
 * Validates the POST body. Returns `null` on valid input + the typed
 * `IPersistQuickGameInput`, or an `ErrorResponse` describing the first
 * rejection. Callers should `res.status(400).json(...)` the error.
 */
function parseBody(
  body: unknown,
):
  | { ok: true; input: Omit<IPersistQuickGameInput, 'cwd'> }
  | { ok: false; error: ErrorResponse } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return {
      ok: false,
      error: { error: 'request body must be an object', code: 'BAD_BODY' },
    };
  }
  const record = body as Record<string, unknown>;

  const { gameId, events, winner, aiVariant } = record;

  if (typeof gameId !== 'string' || !GAME_ID_PATTERN.test(gameId)) {
    return {
      ok: false,
      error: { error: 'invalid gameId', code: 'BAD_GAME_ID' },
    };
  }

  if (!Array.isArray(events)) {
    return {
      ok: false,
      error: { error: 'events must be an array', code: 'BAD_EVENTS' },
    };
  }

  // `winner` is `'player' | 'opponent' | 'draw' | null` per IQuickGameInstance.
  // Allow the literal null (a timed-out / aborted game) and the three valid
  // strings; reject everything else.
  if (
    winner !== null &&
    (typeof winner !== 'string' || !VALID_WINNERS.has(winner))
  ) {
    return {
      ok: false,
      error: { error: 'invalid winner', code: 'BAD_WINNER' },
    };
  }

  if (typeof aiVariant !== 'string') {
    return {
      ok: false,
      error: { error: 'aiVariant must be a string', code: 'BAD_AI_VARIANT' },
    };
  }

  return {
    ok: true,
    input: {
      gameId,
      events: events as readonly IGameEvent[],
      winner: winner as IPersistQuickGameInput['winner'],
      aiVariant,
    },
  };
}

// =============================================================================
// Handler
// =============================================================================

/**
 * POST /api/replay-library/quick — persist a completed quick-game.
 *
 * Returns:
 *   - 200 `{ persisted: true,  alreadyPersisted: false, manifestEntry, path }` — first persist
 *   - 200 `{ persisted: false, alreadyPersisted: true,  manifestEntry, path }` — already in manifest
 *   - 400 on bad body / gameId / winner / events
 *   - 405 on non-POST
 *   - 500 if `persistQuickGame` throws
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>,
): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    return;
  }

  const parsed = parseBody(req.body);
  if (!parsed.ok) {
    res.status(400).json(parsed.error);
    return;
  }
  const { input } = parsed;

  // Dedup guard (Momus blocking gap). Read the current manifest and
  // short-circuit if `gameId` is already present — `appendManifestEntry`
  // does a blind append, so we MUST stop the duplicate write here.
  // Build the same manifest entry the persist call would have produced
  // so the client gets a consistent shape on both first-persist and
  // already-persisted paths (the React component flips the same UI bit
  // either way).
  try {
    const existing = await readReplayIndex();
    if (existing.some((entry) => entry.id === input.gameId)) {
      const manifestEntry = buildQuickManifestEntry({
        gameId: input.gameId,
        events: input.events,
        winner: input.winner,
        aiVariant: input.aiVariant,
      });
      logger.debug('[replay-library] quick-game already persisted; skipping', {
        gameId: input.gameId,
      });
      res.status(200).json({
        persisted: false,
        alreadyPersisted: true,
        manifestEntry,
        path: `quick/${input.gameId}.jsonl`,
      });
      return;
    }
  } catch (err) {
    // A malformed `replay-index.json` would surface as a parse error here.
    // Log and continue — `persistQuickGame` will still write the file even
    // if the manifest read failed; the manifest will get repaired by the
    // backfill scan on next read. Don't 500 on a soft index issue.
    logger.warn('[replay-library] failed to read manifest for dedup', {
      gameId: input.gameId,
      err,
    });
  }

  let result: IPersistQuickGameResult;
  try {
    result = await persistQuickGame(input);
  } catch (err) {
    logger.error('[replay-library] quick persist failed', {
      gameId: input.gameId,
      err,
    });
    res
      .status(500)
      .json({ error: 'failed to persist quick game', code: 'PERSIST_FAILED' });
    return;
  }

  res.status(200).json({
    persisted: result.persisted,
    alreadyPersisted: false,
    manifestEntry: result.manifestEntry,
    path: result.path,
  });
}
