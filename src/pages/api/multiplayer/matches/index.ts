/**
 * Multiplayer Matches API - collection endpoints.
 *
 * `POST /api/multiplayer/matches` creates a new match. The host id is
 * always derived from the verified bearer token; any client-supplied
 * host id is ignored to prevent impersonation.
 *
 * @spec openspec/specs/player-identity/spec.md
 * @spec openspec/specs/multiplayer-server/spec.md
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
import {
  CreateMultiplayerMatchBodySchema,
  type CreateMultiplayerMatchBody,
} from '@/lib/api/securitySchemas';
import { commitCampaignCreationCheckpoint } from '@/lib/campaign/authority/campaignCreationCheckpoint';
import { campaignCreationCheckpointPorts } from '@/lib/campaign/authority/campaignCreationCheckpointPorts';
import { CAMPAIGN_JOURNAL_AUTHORITY_ENABLED } from '@/lib/campaign/sync/JournalCampaignEventStore';
import { authenticateRequest } from '@/lib/multiplayer/server/auth';
import { getCampaignHostRegistry } from '@/lib/multiplayer/server/CampaignHostRegistry';
import { getDefaultMatchStore } from '@/lib/multiplayer/server/getDefaultMatchStore';
import { getDefaultPlayerStore } from '@/lib/multiplayer/server/InMemoryPlayerStore';
import { setAiSlot } from '@/lib/multiplayer/server/lobby/lobbyStateMachine';
import { buildDefaultMatchUnitBootstrap } from '@/lib/multiplayer/server/matchUnitBootstrap';
import { generateRoomCode } from '@/lib/p2p/roomCodes';
import { rejectUnexpectedMethod } from '@/pages-modules/api/routeHelpers';
import {
  defaultSeats,
  defaultSeatsWithSpectatorHost,
  type IMatchSeat,
  type SeatKind,
} from '@/types/multiplayer/Lobby';

interface ICreateMatchResponse {
  matchId: string;
  wsUrl: string;
  /** Wave 3b: 6-char invite code so the host can share the lobby. */
  roomCode?: string;
  meta: IMatchMeta;
}

interface IErrorResponse {
  error: string;
  code?: string;
}

const HOST_LOBBY_MATCH_LIMIT = 5;
const LOBBY_MATCH_TTL_MS = 24 * 60 * 60 * 1000;

function buildWsUrl(req: NextApiRequest, matchId: string): string {
  const host = req.headers.host ?? 'localhost:3600';
  const proto =
    (req.headers['x-forwarded-proto'] as string | undefined) === 'https'
      ? 'wss'
      : 'ws';
  return `${proto}://${host}/api/multiplayer/socket?matchId=${encodeURIComponent(matchId)}`;
}

function isExpiredLobbyMatch(createdAt: string, nowMs: number): boolean {
  const createdAtMs = Date.parse(createdAt);
  return (
    Number.isFinite(createdAtMs) && nowMs - createdAtMs > LOBBY_MATCH_TTL_MS
  );
}

async function enforceHostLobbyCapacity(
  store: ReturnType<typeof getDefaultMatchStore>,
  hostPlayerId: string,
  nowMs = Date.now(),
): Promise<{ ok: true } | { ok: false; activeLobbyCount: number }> {
  const lobbies = await store.listMatches({ status: 'lobby' });
  let activeLobbyCount = 0;

  for (const lobby of lobbies) {
    if (lobby.hostPlayerId !== hostPlayerId) continue;
    if (isExpiredLobbyMatch(lobby.createdAt, nowMs)) {
      await store.closeMatch(lobby.matchId);
      continue;
    }
    activeLobbyCount += 1;
  }

  if (activeLobbyCount >= HOST_LOBBY_MATCH_LIMIT) {
    return { ok: false, activeLobbyCount };
  }
  return { ok: true };
}

async function bootstrapHostProfile(
  hostPlayerId: string,
  publicKey: string,
  displayName: string | undefined,
): Promise<void> {
  try {
    await getDefaultPlayerStore().getOrCreatePlayer({
      playerId: hostPlayerId,
      publicKey,
      displayName: displayName ?? hostPlayerId,
    });
  } catch (e) {
    console.warn('[matches] failed to bootstrap host profile', e);
  }
}

async function rejectOverCapacity(
  res: NextApiResponse<ICreateMatchResponse | IErrorResponse>,
  store: ReturnType<typeof getDefaultMatchStore>,
  hostPlayerId: string,
): Promise<boolean> {
  try {
    const capacity = await enforceHostLobbyCapacity(store, hostPlayerId);
    if (capacity.ok) return false;
    res.status(429).json({
      error: `Match capacity exceeded: host already has ${capacity.activeLobbyCount} active lobby matches`,
      code: 'MATCH_CAPACITY_EXCEEDED',
    });
    return true;
  } catch (e) {
    res.status(500).json({
      error:
        e instanceof Error
          ? e.message
          : 'Failed to verify match creation capacity',
      code: 'MATCH_CAPACITY_CHECK_FAILED',
    });
    return true;
  }
}

function normalizePlayerIds(
  body: CreateMultiplayerMatchBody,
  hostPlayerId: string,
): string[] {
  const incomingPlayerIds = body.playerIds ?? [hostPlayerId];
  return incomingPlayerIds.includes(hostPlayerId)
    ? incomingPlayerIds
    : [hostPlayerId, ...incomingPlayerIds];
}

/**
 * Which seat kind the creating host occupies.
 * WHAT: caller `hostSeatKind`, else spectator on co-op create, else human.
 * WHY: the GM must not inherit a tactical seat; omitted kind on a plain
 * tactical POST keeps today's first-human occupy.
 */
function resolveHostSeatKind(
  body: CreateMultiplayerMatchBody,
): Extract<SeatKind, 'human' | 'spectator'> {
  if (body.hostSeatKind === 'human' || body.hostSeatKind === 'spectator') {
    return body.hostSeatKind;
  }
  return body.coopCampaign === undefined ? 'human' : 'spectator';
}

function buildLobbyPresentation(
  body: CreateMultiplayerMatchBody,
  hostPlayerId: string,
): { roomCode?: string; seats?: IMatchSeat[] } {
  if (!body.layout) return {};

  const hostSeatKind = resolveHostSeatKind(body);
  let seats =
    hostSeatKind === 'spectator'
      ? defaultSeatsWithSpectatorHost(body.layout)
      : defaultSeats(body.layout);
  if (body.aiSlots) {
    for (const slotId of body.aiSlots) {
      seats = setAiSlot(seats, slotId);
    }
  }

  const hostRef: IPlayerRef = {
    playerId: hostPlayerId,
    displayName: body.displayName ?? hostPlayerId,
  };
  const target = seats.find((s) => s.kind === hostSeatKind && !s.occupant);
  const occupiedSeats = target
    ? seats.map((s) =>
        s.slotId === target.slotId
          ? {
              ...s,
              occupant: hostRef,
              ready: hostSeatKind === 'spectator',
            }
          : s,
      )
    : seats;
  return { roomCode: generateRoomCode(), seats: occupiedSeats };
}

function buildMatchMeta(
  body: CreateMultiplayerMatchBody,
  hostPlayerId: string,
  playerIds: string[],
): IMatchMeta {
  const presentation = buildLobbyPresentation(body, hostPlayerId);
  const now = new Date().toISOString();
  return {
    matchId: randomUUID(),
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
    config: {
      ...body.config,
      fogOfWar: body.config.fogOfWar ?? false,
    },
    layout: body.layout,
    seats: presentation.seats,
    roomCode: presentation.roomCode,
    unitBootstrap:
      body.unitBootstrap ??
      buildDefaultMatchUnitBootstrap(body.layout, body.config.mapRadius),
    coopCampaign: body.coopCampaign,
  };
}

/**
 * Await the campaign creation authority checkpoint for a co-op host.
 *
 * Throws on refusal, naming the stage, so the caller's existing
 * rollback (close the match, answer 500) covers it. Without durable
 * ports there is nothing to commit to and the pre-checkpoint behaviour
 * is preserved - the same structural-flag convention the campaign
 * membership and force-claim ports use.
 */
async function commitCoopCampaignAuthority(
  campaignId: string,
  matchId: string,
  hostPlayerId: string,
): Promise<void> {
  const ports = campaignCreationCheckpointPorts();
  if (!ports) return;
  const checkpoint = await commitCampaignCreationCheckpoint(ports, {
    campaignId,
    sessionId: matchId,
    gmParticipantId: hostPlayerId,
    journalAuthorityEnabled: CAMPAIGN_JOURNAL_AUTHORITY_ENABLED,
    committedAt: new Date().toISOString(),
  });
  if (checkpoint.kind === 'failed') {
    throw new Error(
      `Campaign creation checkpoint failed at ${checkpoint.stage}: ${checkpoint.reason}`,
    );
  }
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
  const store = getDefaultMatchStore();

  await bootstrapHostProfile(hostPlayerId, auth.publicKey, body.displayName);
  if (await rejectOverCapacity(res, store, hostPlayerId)) return;

  const playerIds = normalizePlayerIds(body, hostPlayerId);
  const meta = buildMatchMeta(body, hostPlayerId, playerIds);

  try {
    await store.createMatch(meta);
    if (body.coopCampaign) {
      if (!meta.roomCode) {
        throw new Error('Co-op campaign registration requires a room code');
      }
      // Umbrella 10.1: every authority piece the campaign depends on
      // commits BEFORE the 201. A refusal throws into the catch below,
      // which already closes the match - so a failed checkpoint leaves
      // no half-created campaign for the lobby to navigate into.
      await commitCoopCampaignAuthority(
        body.coopCampaign.campaignId,
        meta.matchId,
        hostPlayerId,
      );
      await getCampaignHostRegistry().register(meta.matchId, {
        campaignId: body.coopCampaign.campaignId,
        hostPlayerId,
        roomCode: meta.roomCode,
        state: body.coopCampaign.state,
        arbitrationMode: body.coopCampaign.arbitrationMode,
      });
    }
  } catch (e) {
    await store.closeMatch(meta.matchId).catch(() => undefined);
    res.status(500).json({
      error: e instanceof Error ? e.message : 'Failed to create match',
    });
    return;
  }

  res.status(201).json({
    matchId: meta.matchId,
    wsUrl: buildWsUrl(req, meta.matchId),
    roomCode: meta.roomCode,
    meta,
  });
}
