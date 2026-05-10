import type { InteractiveSession } from '@/engine/InteractiveSession';
import type {
  IGameEvent,
  IGameState,
} from '@/types/gameplay/GameSessionInterfaces';
import type {
  ILobbyUpdated,
  IServerMessage,
} from '@/types/multiplayer/Protocol';

import {
  answerReconnectRequest,
  type IGameSessionChannel,
  type IReconnectRequestEnvelope,
} from '@/lib/p2p/gameSessionChannel';
import {
  matchLogStorage,
  type MatchLogStorage,
} from '@/lib/p2p/matchLogStorage';
import { nowIso } from '@/types/multiplayer/Protocol';
import { deriveState } from '@/utils/gameplay/gameState';

import type { IMatchMeta, IMatchStore } from './IMatchStore';
import type { IMatchSocket } from './ServerMatchSocketTypes';

import { filterEventForPlayer, FogOfWarVisibilityCache } from './fogOfWar';
import { streamReplay } from './reconnection/replayStream';

type ReconnectMetadataReader = Pick<MatchLogStorage, 'getMatchMetadata'>;

export interface IServerMatchHostReplayContext {
  readonly matchId: string;
  readonly store: IMatchStore;
  readonly session: InteractiveSession;
  readonly safeSend: (socket: IMatchSocket, message: IServerMessage) => void;
  readonly maybeResume: () => void;
}

export async function sendReplay(
  ctx: IServerMatchHostReplayContext,
  socket: IMatchSocket,
  fromSeq = 0,
  playerId?: string,
): Promise<void> {
  const events =
    playerId != null
      ? await getReplayEventsForPlayer(ctx, playerId, fromSeq)
      : await getEventsFromSeq(ctx, fromSeq);
  const frames = streamReplay(ctx.matchId, events, fromSeq);
  ctx.safeSend(socket, frames.start);
  for (const chunk of frames.chunks) {
    ctx.safeSend(socket, chunk);
  }
  ctx.safeSend(socket, frames.end);
}

export function getEventsFromSeq(
  ctx: Pick<IServerMatchHostReplayContext, 'matchId' | 'store'>,
  seq: number,
): Promise<readonly IGameEvent[]> {
  return ctx.store.getEvents(ctx.matchId, seq);
}

export async function handleReconnectRequest(
  ctx: Pick<IServerMatchHostReplayContext, 'matchId' | 'store'>,
  request: IReconnectRequestEnvelope,
  channel: Pick<
    IGameSessionChannel,
    'broadcastRejection' | 'broadcastReconnectReject' | 'broadcastReplayStream'
  >,
  metadataReader: ReconnectMetadataReader = matchLogStorage,
): Promise<void> {
  const metadata =
    request.matchId === ctx.matchId
      ? await metadataReader.getMatchMetadata(ctx.matchId)
      : null;

  await answerReconnectRequest(request, {
    matchId: ctx.matchId,
    metadata,
    channel,
    getEventsFromSeq: (seq) => getEventsFromSeq(ctx, seq),
  });
}

export function bindReconnectChannel(
  ctx: Pick<IServerMatchHostReplayContext, 'matchId' | 'store'>,
  channel: Pick<
    IGameSessionChannel,
    | 'broadcastRejection'
    | 'broadcastReconnectReject'
    | 'broadcastReplayStream'
    | 'onReconnectRequest'
  >,
  metadataReader: ReconnectMetadataReader = matchLogStorage,
): () => void {
  return channel.onReconnectRequest((request) => {
    void handleReconnectRequest(ctx, request, channel, metadataReader);
  });
}

export async function handleSessionJoin(
  ctx: IServerMatchHostReplayContext,
  socket: IMatchSocket,
  playerId: string,
  lastSeq?: number,
  requestedMatchId = ctx.matchId,
): Promise<void> {
  if (requestedMatchId !== ctx.matchId) {
    ctx.safeSend(socket, {
      kind: 'Error',
      matchId: ctx.matchId,
      ts: nowIso(),
      code: 'UNKNOWN_MATCH',
      reason: 'wrong-match',
    });
    return;
  }

  const requestFrom = lastSeq != null ? lastSeq + 1 : 0;
  await sendReplay(ctx, socket, requestFrom, playerId);

  let meta: IMatchMeta;
  try {
    meta = await ctx.store.getMatchMeta(ctx.matchId);
  } catch {
    return;
  }
  const seats = meta.seats ?? [];
  if (seats.length > 0) {
    const update: ILobbyUpdated = {
      kind: 'LobbyUpdated',
      matchId: ctx.matchId,
      ts: nowIso(),
      seats: [...seats],
      status: meta.status,
      hostPlayerId: meta.hostPlayerId,
    };
    ctx.safeSend(socket, update);
  }

  ctx.maybeResume();
}

async function getReplayEventsForPlayer(
  ctx: IServerMatchHostReplayContext,
  playerId: string,
  fromSeq: number,
): Promise<readonly IGameEvent[]> {
  const meta = await ctx.store.getMatchMeta(ctx.matchId);
  if (!meta.config.fogOfWar) {
    return getEventsFromSeq(ctx, fromSeq);
  }

  const allEvents = await getEventsFromSeq(ctx, 0);
  const visible: IGameEvent[] = [];
  const prefix: IGameEvent[] = [];
  const replayCache = new FogOfWarVisibilityCache();
  const gameId = ctx.session.getSession().id;

  for (const event of allEvents) {
    prefix.push(event);
    if (event.sequence < fromSeq) continue;
    const state = withVisibilityAssignments(deriveState(gameId, prefix), meta);
    const filtered = filterEventForPlayer(event, playerId, state, {
      config: meta.config,
      cache: replayCache,
    });
    if (filtered) {
      visible.push(filtered);
    }
  }

  return visible;
}

function withVisibilityAssignments(
  state: IGameState,
  meta: IMatchMeta,
): IGameState {
  return {
    ...state,
    sideAssignments: meta.sideAssignments,
  } as IGameState;
}
