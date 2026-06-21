/**
 * Multiplayer Matches API - collection endpoints.
 *
 * `POST /api/multiplayer/matches` creates a new match. The host id is
 * always derived from the verified bearer token; any client-supplied
 * host id is ignored to prevent impersonation.
 *
 * @spec openspec/changes/add-player-identity-and-auth/specs/player-identity/spec.md
 * @spec openspec/changes/add-multiplayer-server-infrastructure/specs/multiplayer-server/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { randomUUID } from 'node:crypto';

import type {
  IMatchConfig,
  IMatchMeta,
} from '@/lib/multiplayer/server/IMatchStore';
import type { IPlayerRef } from '@/types/multiplayer/Player';

import {
  API_MUTATION_RATE_LIMIT,
  applySecurityHeaders,
  clientRateLimitKey,
  parseBody,
  rateLimit,
  rejectRateLimited,
} from '@/lib/api/security';
import { CreateMultiplayerMatchBodySchema } from '@/lib/api/securitySchemas';
import { authenticateRequest } from '@/lib/multiplayer/server/auth';
import { getDefaultMatchStore } from '@/lib/multiplayer/server/getDefaultMatchStore';
import { getDefaultPlayerStore } from '@/lib/multiplayer/server/InMemoryPlayerStore';
import { setAiSlot } from '@/lib/multiplayer/server/lobby/lobbyStateMachine';
import { generateRoomCode } from '@/lib/p2p/roomCodes';
import { rejectUnexpectedMethod } from '@/pages-modules/api/routeHelpers';
import { defaultSeats, type IMatchSeat } from '@/types/multiplayer/Lobby';

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

function buildWsUrl(req: NextApiRequest, matchId: string): string {
  const host = req.headers.host ?? 'localhost:3600';
  const proto =
    (req.headers['x-forwarded-proto'] as string | undefined) === 'https'
      ? 'wss'
      : 'ws';
  return `${proto}://${host}/api/multiplayer/socket?matchId=${encodeURIComponent(matchId)}`;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ICreateMatchResponse | IErrorResponse>,
): Promise<void> {
  applySecurityHeaders(res);
  if (rejectUnexpectedMethod(req, res, ['POST'])) return;

  const body = parseBody(CreateMultiplayerMatchBodySchema, req, res);
  if (!body) return;

  const limit = rateLimit(
    clientRateLimitKey(req, 'multiplayer-match-create'),
    API_MUTATION_RATE_LIMIT,
  );
  if (!limit.ok) {
    rejectRateLimited(res, limit);
    return;
  }

  const auth = await authenticateRequest(req);
  if (!auth.ok) {
    res.status(401).json({ error: `Unauthorized: ${auth.reason}` });
    return;
  }
  const hostPlayerId = auth.playerId;

  try {
    await getDefaultPlayerStore().getOrCreatePlayer({
      playerId: hostPlayerId,
      publicKey: auth.publicKey,
      displayName: body.displayName ?? hostPlayerId,
    });
  } catch (e) {
    console.warn('[matches] failed to bootstrap host profile', e);
  }

  const incomingPlayerIds = body.playerIds ?? [hostPlayerId];
  const playerIds = incomingPlayerIds.includes(hostPlayerId)
    ? incomingPlayerIds
    : [hostPlayerId, ...incomingPlayerIds];

  let seats: IMatchSeat[] | undefined;
  let roomCode: string | undefined;
  if (body.layout) {
    seats = defaultSeats(body.layout);
    if (body.aiSlots) {
      for (const slotId of body.aiSlots) {
        seats = setAiSlot(seats, slotId);
      }
    }

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
  const config: IMatchConfig = {
    ...body.config,
    fogOfWar: body.config.fogOfWar ?? false,
  };
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
    config,
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
