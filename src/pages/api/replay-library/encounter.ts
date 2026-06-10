/**
 * Replay Library — encounter-game persist endpoint.
 *
 * `POST /api/replay-library/encounter` — accepts a completed encounter
 * session's event log + encounter metadata, validates inputs, **dedupes
 * against the current manifest**, then delegates the actual write to
 * the unit-tested `persistEncounterGame()` pipeline.
 *
 * Mirror of `src/pages/api/replay-library/quick.ts` from the
 * `add-replay-library` change. The browser cannot write to the local
 * filesystem, so the encounter session terminal-state hook (PR 3 of
 * `link-encounters-to-replays`) POSTs here on the `endedAt` transition.
 *
 * Idempotency:
 *   - Hard refresh of an already-persisted encounter would re-fire the
 *     persist hook (the `useRef` guard resets on remount).
 *   - `appendManifestEntry` does a blind append with no dedup, so we
 *     short-circuit on duplicates HERE — read the current manifest and
 *     return `200 { persisted: false, alreadyPersisted: true }` when
 *     the `gameId` already exists. Never invoke `persistEncounterGame()`
 *     twice for the same game.
 *
 * Validation pattern mirrors `quick.ts`:
 *   - inline runtime checks (no Zod — established convention in this
 *     directory; future consolidation is a separate sweep)
 *   - shared `ErrorResponse = { error, code? }` shape
 *   - `gameId` regex `^[A-Za-z0-9_-]+$` — same pattern, copied not
 *     imported (sibling route uses module-private const)
 *
 * Server-side only — `persistEncounterGame` is Node-only by design. The
 * shouldPersistToDisk three-gate guard inside it falls through cleanly
 * when called from this handler under `next dev` or production.
 *
 * @spec openspec/changes/link-encounters-to-replays/specs/replay-library/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import type { IGameEvent } from '@/types/gameplay';

import {
  buildEncounterManifestEntry,
  persistEncounterGame,
  type IPersistEncounterGameInput,
  type IPersistEncounterGameResult,
} from '@/components/encounter/persistEncounterGame';
import { readReplayIndex } from '@/replay-library/index-reader';
import { ScenarioTemplateType } from '@/types/encounter/EncounterInterfaces';
import { isGameEvent } from '@/types/gameplay/GameSessionInterfaces';
import { logger } from '@/utils/logger';

// =============================================================================
// Body-size ceiling (audit 2026-06-09 W5.2)
// =============================================================================

/**
 * 16 MiB request-body ceiling. Measured: the largest real replay in the
 * library is 1,105,638 bytes (2,614 events ≈ 423 B/event) — already
 * over Next's 1MB bodyParser default, which made long games silently
 * fail to persist. A worst-case long interactive game (~10-20k events)
 * models out to ~4-9 MB; 16 MiB gives 2-4x headroom on top of that.
 * Duplicated in the sibling `quick.ts` route per this directory's
 * copy-not-import convention.
 */
const MAX_BODY_BYTES = 16 * 1024 * 1024;

/**
 * Next pages-router override: lift the bodyParser limit from the 1MB
 * default to the measured ceiling. Next itself rejects anything larger
 * with a 413 before the handler runs; the in-handler Content-Length
 * guard below mirrors that with this route's JSON error shape.
 */
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '16mb',
    },
  },
};

// =============================================================================
// Response Types
// =============================================================================

type SuccessResponse = {
  persisted: boolean;
  alreadyPersisted: boolean;
  manifestEntry: IPersistEncounterGameResult['manifestEntry'];
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
 * Same regex as the sibling `quick.ts` and `[source]/[gameId].ts` routes.
 * Duplicated intentionally — the sibling consts are module-private and
 * cross-route imports for a 1-line regex would couple files harder than
 * copying. If we ever need a fourth reuse, lift to
 * `@/replay-library/validation`.
 */
const GAME_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

const VALID_WINNERS: ReadonlySet<string> = new Set([
  'player',
  'opponent',
  'draw',
]);

// Snapshot of every legal `templateType` literal so the body validator
// can reject unknowns without depending on a runtime cast.
const VALID_TEMPLATE_TYPES: ReadonlySet<string> = new Set(
  Object.values(ScenarioTemplateType),
);

/**
 * Validates the POST body. Returns `{ ok: true, input }` on valid input
 * + the typed `IPersistEncounterGameInput`, or `{ ok: false, error }`
 * describing the first rejection. Callers should
 * `res.status(400).json(error)` on failure.
 */
function parseBody(
  body: unknown,
):
  | { ok: true; input: Omit<IPersistEncounterGameInput, 'cwd'> }
  | { ok: false; error: ErrorResponse } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return {
      ok: false,
      error: { error: 'request body must be an object', code: 'BAD_BODY' },
    };
  }
  const record = body as Record<string, unknown>;

  const {
    gameId,
    events,
    winner,
    encounterId,
    encounterName,
    templateType,
    playerForceSummary,
    opponentSummary,
  } = record;

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

  // Validate every element against the canonical wire-shape guard
  // BEFORE any persistence work (audit W5.2): a payload-less
  // `game_created` used to pass the array-only check, get written to
  // disk, then blow up in the manifest builder — orphan JSONL on disk.
  // `isGameEvent` is the same guard the replay loader uses on read, so
  // anything rejected here could never have been replayed anyway. The
  // explicit null check closes the `typeof null === 'object'` hole.
  const badIndex = events.findIndex(
    (event) => !isGameEvent(event) || event.payload === null,
  );
  if (badIndex !== -1) {
    return {
      ok: false,
      error: {
        error: `events[${badIndex}] is not a valid game event (id/gameId/sequence/timestamp/type/turn/phase/payload required)`,
        code: 'BAD_EVENTS',
      },
    };
  }

  // `winner` is `'player' | 'opponent' | 'draw' | null`. Allow the literal
  // null (a timed-out / aborted encounter) and the three valid strings;
  // reject everything else.
  if (
    winner !== null &&
    (typeof winner !== 'string' || !VALID_WINNERS.has(winner))
  ) {
    return {
      ok: false,
      error: { error: 'invalid winner', code: 'BAD_WINNER' },
    };
  }

  if (typeof encounterId !== 'string' || encounterId.length === 0) {
    return {
      ok: false,
      error: {
        error: 'encounterId must be a non-empty string',
        code: 'BAD_ENCOUNTER_ID',
      },
    };
  }

  if (typeof encounterName !== 'string') {
    return {
      ok: false,
      error: {
        error: 'encounterName must be a string',
        code: 'BAD_ENCOUNTER_NAME',
      },
    };
  }

  // `templateType` is `ScenarioTemplateType | null`. Allow the literal
  // null (free-form / custom encounter) and any valid template literal;
  // reject everything else.
  if (
    templateType !== null &&
    (typeof templateType !== 'string' ||
      !VALID_TEMPLATE_TYPES.has(templateType))
  ) {
    return {
      ok: false,
      error: { error: 'invalid templateType', code: 'BAD_TEMPLATE_TYPE' },
    };
  }

  if (typeof playerForceSummary !== 'string') {
    return {
      ok: false,
      error: {
        error: 'playerForceSummary must be a string',
        code: 'BAD_PLAYER_FORCE_SUMMARY',
      },
    };
  }

  if (typeof opponentSummary !== 'string') {
    return {
      ok: false,
      error: {
        error: 'opponentSummary must be a string',
        code: 'BAD_OPPONENT_SUMMARY',
      },
    };
  }

  return {
    ok: true,
    input: {
      gameId,
      events: events as readonly IGameEvent[],
      winner: winner as IPersistEncounterGameInput['winner'],
      encounterId,
      encounterName,
      templateType: templateType as ScenarioTemplateType | null,
      playerForceSummary,
      opponentSummary,
    },
  };
}

// =============================================================================
// Handler
// =============================================================================

/**
 * POST /api/replay-library/encounter — persist a completed encounter game.
 *
 * Returns:
 *   - 200 `{ persisted: true,  alreadyPersisted: false, manifestEntry, path }` — first persist
 *   - 200 `{ persisted: false, alreadyPersisted: true,  manifestEntry, path }` — already in manifest
 *   - 400 on bad body / gameId / events / winner / encounterId / encounterName / templateType / summaries
 *   - 405 on non-POST
 *   - 413 when the body exceeds the 16 MiB persist ceiling
 *   - 500 if `persistEncounterGame` throws
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

  // Explicit over-ceiling rejection (audit W5.2). Next's bodyParser
  // already 413s anything over the exported `sizeLimit` before this
  // handler runs; this guard re-checks Content-Length so the rejection
  // carries this route's JSON error shape and stays enforced for
  // callers that bypass the Next parser (tests, custom servers).
  const contentLength = Number(req.headers['content-length']);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    res.status(413).json({
      error: `request body exceeds the ${MAX_BODY_BYTES}-byte replay persist ceiling`,
      code: 'PAYLOAD_TOO_LARGE',
    });
    return;
  }

  const parsed = parseBody(req.body);
  if (!parsed.ok) {
    res.status(400).json(parsed.error);
    return;
  }
  const { input } = parsed;

  // Dedup guard. Read the current manifest and short-circuit if `gameId`
  // is already present — `appendManifestEntry` does a blind append, so
  // we MUST stop the duplicate write here. Build the same manifest entry
  // the persist call would have produced so the client gets a consistent
  // shape on both first-persist and already-persisted paths.
  try {
    const existing = await readReplayIndex();
    if (existing.some((entry) => entry.id === input.gameId)) {
      const manifestEntry = buildEncounterManifestEntry(input);
      logger.debug(
        '[replay-library] encounter game already persisted; skipping',
        { gameId: input.gameId },
      );
      res.status(200).json({
        persisted: false,
        alreadyPersisted: true,
        manifestEntry,
        path: `encounter/${input.gameId}.jsonl`,
      });
      return;
    }
  } catch (err) {
    // A malformed `replay-index.json` would surface as a parse error here.
    // Log and continue — `persistEncounterGame` will still write the file
    // even if the manifest read failed; the manifest will get repaired
    // by the backfill scan on next read. Don't 500 on a soft index issue.
    logger.warn('[replay-library] failed to read manifest for dedup', {
      gameId: input.gameId,
      err,
    });
  }

  let result: IPersistEncounterGameResult;
  try {
    result = await persistEncounterGame(input);
  } catch (err) {
    logger.error('[replay-library] encounter persist failed', {
      gameId: input.gameId,
      err,
    });
    res.status(500).json({
      error: 'failed to persist encounter game',
      code: 'PERSIST_FAILED',
    });
    return;
  }

  res.status(200).json({
    persisted: result.persisted,
    alreadyPersisted: false,
    manifestEntry: result.manifestEntry,
    path: result.path,
  });
}
