/**
 * Multiplayer Matches API — collection endpoints.
 *
 * `POST /api/multiplayer/matches` — create a new match.
 * Body: `{config, players: IPlayerRef[], hostPlayerId, sideAssignments?}`.
 * Returns: `{matchId, wsUrl}` so the caller can immediately open a
 * WebSocket against the new match.
 *
 * Wave 1 wires only POST. `GET /api/multiplayer/matches` is reserved
 * for a later wave (lobby browser).
 *
 * Auth in Wave 1 is loose — we just require a `playerId` in the
 * `Authorization: Bearer <playerId>` header (the Wave 2 change adds the
 * real Ed25519 token check). This lets the lobby + reconnect waves
 * exercise the full path while we wait for Wave 2.
 *
 * @spec openspec/changes/add-multiplayer-server-infrastructure/specs/multiplayer-server/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { randomUUID } from 'node:crypto';

import type {
  IMatchConfig,
  IMatchMeta,
  ISideAssignment,
} from '@/lib/multiplayer/server/IMatchStore';

import { getDefaultMatchStore } from '@/lib/multiplayer/server/InMemoryMatchStore';

// =============================================================================
// Request / Response types
// =============================================================================

interface ICreateMatchBody {
  config: IMatchConfig;
  hostPlayerId: string;
  playerIds: readonly string[];
  sideAssignments?: readonly ISideAssignment[];
}

interface ICreateMatchResponse {
  matchId: string;
  wsUrl: string;
  meta: IMatchMeta;
}

interface IErrorResponse {
  error: string;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Lightweight bearer-token check. Wave 2 swaps this out for real
 * verification against the player store. For Wave 1 we only assert that
 * SOMETHING was provided so the call site exercises the auth header.
 */
function requirePlayerId(req: NextApiRequest): string | null {
  const auth = req.headers.authorization ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(auth);
  if (!match) return null;
  const token = match[1].trim();
  return token.length > 0 ? token : null;
}

function isValidBody(body: unknown): body is ICreateMatchBody {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Partial<ICreateMatchBody>;
  if (typeof b.hostPlayerId !== 'string' || b.hostPlayerId.length === 0) {
    return false;
  }
  if (!Array.isArray(b.playerIds) || b.playerIds.length === 0) return false;
  if (!b.playerIds.every((p) => typeof p === 'string' && p.length > 0)) {
    return false;
  }
  if (typeof b.config !== 'object' || b.config === null) return false;
  const cfg = b.config as Partial<IMatchConfig>;
  if (typeof cfg.mapRadius !== 'number' || typeof cfg.turnLimit !== 'number') {
    return false;
  }
  return true;
}

function buildWsUrl(req: NextApiRequest, matchId: string): string {
  // Use the same host the request came in on; the WS upgrade handler in
  // server.js binds to the same port as the HTTP server. Default to
  // `ws://` because production proxies typically rewrite to wss.
  const host = req.headers.host ?? 'localhost:3000';
  const proto =
    (req.headers['x-forwarded-proto'] as string | undefined) === 'https'
      ? 'wss'
      : 'ws';
  return `${proto}://${host}/api/multiplayer/socket?matchId=${encodeURIComponent(matchId)}`;
}

// =============================================================================
// Handler
// =============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ICreateMatchResponse | IErrorResponse>,
): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    return;
  }

  const playerId = requirePlayerId(req);
  if (!playerId) {
    res.status(401).json({ error: 'Missing Bearer token (playerId)' });
    return;
  }

  if (!isValidBody(req.body)) {
    res.status(400).json({ error: 'Malformed body' });
    return;
  }

  const body = req.body;
  const matchId = randomUUID();
  const now = new Date().toISOString();
  const meta: IMatchMeta = {
    matchId,
    hostPlayerId: body.hostPlayerId,
    playerIds: body.playerIds,
    sideAssignments:
      body.sideAssignments ??
      body.playerIds.map((pid, idx) => ({
        playerId: pid,
        side: idx === 0 ? 'player' : 'opponent',
      })),
    status: 'lobby',
    createdAt: now,
    updatedAt: now,
    config: body.config,
  };

  try {
    const store = getDefaultMatchStore();
    await store.createMatch(meta);
  } catch (e) {
    res.status(500).json({
      error: e instanceof Error ? e.message : 'Failed to create match',
    });
    return;
  }

  res.status(201).json({
    matchId,
    wsUrl: buildWsUrl(req, matchId),
    meta,
  });
}
