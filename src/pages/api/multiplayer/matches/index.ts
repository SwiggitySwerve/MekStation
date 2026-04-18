/**
 * Multiplayer Matches API — collection endpoints.
 *
 * `POST /api/multiplayer/matches` — create a new match.
 * Body: `{config, playerIds, sideAssignments?}`. The host id is derived
 * from the verified bearer token (Wave 2). Returns: `{matchId, wsUrl}`
 * so the caller can immediately open a WebSocket against the new match.
 *
 * Wave 2 wires real auth — every request requires a valid signed
 * `IPlayerToken` in the `Authorization: Bearer <base64-json>` header.
 * The verified `playerId` is used as the `hostPlayerId` for the new
 * match; any client-supplied `hostPlayerId` is ignored to prevent
 * impersonation.
 *
 * @spec openspec/changes/add-player-identity-and-auth/specs/player-identity/spec.md
 * @spec openspec/changes/add-multiplayer-server-infrastructure/specs/multiplayer-server/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { randomUUID } from 'node:crypto';

import type {
  IMatchConfig,
  IMatchMeta,
  ISideAssignment,
} from '@/lib/multiplayer/server/IMatchStore';
import type { IPlayerRef } from '@/types/multiplayer/Player';

import { authenticateRequest } from '@/lib/multiplayer/server/auth';
import { getDefaultMatchStore } from '@/lib/multiplayer/server/InMemoryMatchStore';
import { getDefaultPlayerStore } from '@/lib/multiplayer/server/InMemoryPlayerStore';
import { setAiSlot } from '@/lib/multiplayer/server/lobby/lobbyStateMachine';
import { generateRoomCode } from '@/lib/p2p/roomCodes';
import {
  defaultSeats,
  TeamLayoutSchema,
  type IMatchSeat,
  type TeamLayout,
} from '@/types/multiplayer/Lobby';

// =============================================================================
// Request / Response types
// =============================================================================

interface ICreateMatchBody {
  config: IMatchConfig;
  /**
   * Optional client-supplied display name. Used to bootstrap the
   * player's profile on first connection. The host id is NOT taken
   * from the body — it's derived from the verified bearer token.
   */
  displayName?: string;
  /**
   * Wave 1: explicit player roster (required when no `layout`).
   * Wave 3b: with `layout` set, the seats array drives the roster
   * lazily as players join via room code, so `playerIds` becomes
   * optional and defaults to `[hostPlayerId]`.
   */
  playerIds?: readonly string[];
  sideAssignments?: readonly ISideAssignment[];
  /** Wave 3b: team layout (`'1v1'` ... `'ffa-8'`). */
  layout?: TeamLayout;
  /** Wave 3b: pre-mark these slot ids as `kind: 'ai'` at creation. */
  aiSlots?: readonly string[];
}

interface ICreateMatchResponse {
  matchId: string;
  wsUrl: string;
  /** Wave 3b: 6-char invite code so the host can share the lobby. */
  roomCode?: string;
  meta: IMatchMeta;
}

interface IErrorResponse {
  error: string;
}

// =============================================================================
// Helpers
// =============================================================================

function isValidBody(body: unknown): body is ICreateMatchBody {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Partial<ICreateMatchBody>;
  // Wave 3b made `playerIds` optional in favour of `layout`; require
  // ONE of the two paths so we never fall through to a roster-less match.
  const hasLayout = b.layout !== undefined;
  if (!hasLayout) {
    if (!Array.isArray(b.playerIds) || b.playerIds.length === 0) return false;
    if (!b.playerIds.every((p) => typeof p === 'string' && p.length > 0)) {
      return false;
    }
  } else {
    if (!TeamLayoutSchema.safeParse(b.layout).success) return false;
    if (b.playerIds !== undefined) {
      if (!Array.isArray(b.playerIds)) return false;
      if (!b.playerIds.every((p) => typeof p === 'string' && p.length > 0)) {
        return false;
      }
    }
    if (b.aiSlots !== undefined) {
      if (!Array.isArray(b.aiSlots)) return false;
      if (!b.aiSlots.every((s) => typeof s === 'string' && s.length > 0)) {
        return false;
      }
    }
  }
  if (typeof b.config !== 'object' || b.config === null) return false;
  const cfg = b.config as Partial<IMatchConfig>;
  if (typeof cfg.mapRadius !== 'number' || typeof cfg.turnLimit !== 'number') {
    return false;
  }
  if (
    b.displayName !== undefined &&
    (typeof b.displayName !== 'string' || b.displayName.length === 0)
  ) {
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

  const auth = await authenticateRequest(req);
  if (!auth.ok) {
    res.status(401).json({ error: `Unauthorized: ${auth.reason}` });
    return;
  }
  const hostPlayerId = auth.playerId;

  if (!isValidBody(req.body)) {
    res.status(400).json({ error: 'Malformed body' });
    return;
  }

  const body = req.body;

  // Bootstrap (or refresh) the host's profile in the player store. This
  // is the "first connection seen" hook from the spec — it MUST run on
  // every authenticated request, not just match creation, so a player
  // that never joins a match still gets a profile. We do the work
  // here because the REST handler is the first place the verified
  // identity meets the player store.
  try {
    await getDefaultPlayerStore().getOrCreatePlayer({
      playerId: hostPlayerId,
      publicKey: auth.publicKey,
      displayName: body.displayName ?? hostPlayerId,
    });
  } catch (e) {
    // Profile bootstrap is best-effort. The spec says verification is
    // the gating concern; profile failures shouldn't fail the request.
    // eslint-disable-next-line no-console
    console.warn('[matches] failed to bootstrap host profile', e);
  }

  // Make sure the host id is present in playerIds — clients sometimes
  // forget to include themselves. Splice it in deterministically.
  // With layout, default the roster to just the host and let join-by-
  // room-code expand it.
  const incomingPlayerIds = body.playerIds ?? [hostPlayerId];
  const playerIds = incomingPlayerIds.includes(hostPlayerId)
    ? incomingPlayerIds
    : [hostPlayerId, ...incomingPlayerIds];

  // Wave 3b: build seats from layout, mark any pre-specified AI slots,
  // and auto-occupy the first open human seat with the host. Generate
  // a 6-char invite code so the host can share the lobby out-of-band.
  let seats: IMatchSeat[] | undefined;
  let roomCode: string | undefined;
  if (body.layout) {
    seats = defaultSeats(body.layout);
    if (body.aiSlots) {
      for (const slotId of body.aiSlots) {
        seats = setAiSlot(seats, slotId);
      }
    }
    // Find the first open human seat and stamp the host into it.
    const hostRef: IPlayerRef = {
      playerId: hostPlayerId,
      displayName: body.displayName ?? hostPlayerId,
    };
    const target = seats.find((s) => s.kind === 'human' && !s.occupant);
    if (target) {
      seats = seats.map((s) =>
        s.slotId === target.slotId
          ? { ...s, occupant: hostRef, ready: false }
          : s,
      );
    }
    roomCode = generateRoomCode();
  }

  const matchId = randomUUID();
  const now = new Date().toISOString();
  const meta: IMatchMeta = {
    matchId,
    hostPlayerId,
    playerIds,
    sideAssignments:
      body.sideAssignments ??
      playerIds.map((pid, idx) => ({
        playerId: pid,
        side: idx === 0 ? 'player' : 'opponent',
      })),
    status: 'lobby',
    createdAt: now,
    updatedAt: now,
    config: body.config,
    layout: body.layout,
    seats,
    roomCode,
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
    roomCode,
    meta,
  });
}
