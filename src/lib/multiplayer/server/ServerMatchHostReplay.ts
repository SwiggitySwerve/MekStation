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

import {
  AuthorizedViewerError,
  mintVerifiedPrincipal,
  type AuthorizedViewerResolver,
  type IAuthorizedViewer,
} from './authorization/AuthorizedViewer';
import {
  filterEventForPlayer,
  filterEventForSpectator,
  FogOfWarVisibilityCache,
} from './fogOfWar';
import { isSpectatorPlayer } from './lobby/spectatorSeats';
import { MATCH_WIRE_PUBLICATION_BOUNDARY } from './projection/ViewerPublicationBoundary';
import { streamReplay } from './reconnection/replayStream';

type ReconnectMetadataReader = Pick<MatchLogStorage, 'getMatchMetadata'>;

export interface IServerMatchHostReplayContext {
  readonly matchId: string;
  readonly store: IMatchStore;
  readonly session: InteractiveSession;
  readonly safeSend: (socket: IMatchSocket, message: IServerMessage) => void;
  readonly maybeResume: () => void;
  readonly viewerResolver: AuthorizedViewerResolver;
}

/**
 * Stream missed events to one socket. When a viewer is available the
 * frames pass through the publication boundary first. Failure sends a
 * typed Error/Close and returns false so SessionJoin does not continue
 * with a raw fallback. The no-playerId path stays unguarded for the
 * historical test hook that never resolved a member.
 */
export async function sendReplay(
  ctx: IServerMatchHostReplayContext,
  socket: IMatchSocket,
  fromSeq = 0,
  playerId?: string,
  admittedViewer?: IAuthorizedViewer,
): Promise<boolean> {
  const events =
    playerId != null
      ? await getReplayEventsForPlayer(ctx, playerId, fromSeq)
      : await getEventsFromSeq(ctx, fromSeq);
  const frames = streamReplay(ctx.matchId, events, fromSeq);
  let viewer: IAuthorizedViewer | null = admittedViewer ?? null;
  if (viewer === null && playerId != null) {
    const resolution = await resolveJoinViewer(ctx, playerId);
    if (resolution.kind !== 'viewer') {
      sendJoinClose(ctx, socket, resolution);
      return false;
    }
    viewer = resolution.viewer;
  }
  if (viewer !== null) {
    const guarded = MATCH_WIRE_PUBLICATION_BOUNDARY.guardReplayFrames(
      viewer,
      frames,
    );
    if (guarded.kind === 'failure') {
      sendJoinGuardError(ctx, socket, guarded.error.message);
      return false;
    }
    ctx.safeSend(socket, guarded.frames.start);
    for (const chunk of guarded.frames.chunks) {
      ctx.safeSend(socket, chunk);
    }
    ctx.safeSend(socket, guarded.frames.end);
    return true;
  }
  ctx.safeSend(socket, frames.start);
  for (const chunk of frames.chunks) {
    ctx.safeSend(socket, chunk);
  }
  ctx.safeSend(socket, frames.end);
  return true;
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

/**
 * Handle a SessionJoin: resolve the joining socket's viewer first, then
 * route baseline + replay through the publication guards. Viewer
 * resolution failure sends a typed Close and no frames. Guard failure
 * sends INTERNAL_ERROR and no raw fallback.
 */
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

  const resolution = await resolveJoinViewer(ctx, playerId);
  if (resolution.kind !== 'viewer') {
    sendJoinClose(ctx, socket, resolution);
    return;
  }
  const viewer = resolution.viewer;

  const requestFrom = lastSeq != null ? lastSeq + 1 : 0;
  const replayed = await sendReplay(ctx, socket, requestFrom, playerId, viewer);
  if (!replayed) return;

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
    const guarded = MATCH_WIRE_PUBLICATION_BOUNDARY.guardBaseline(
      viewer,
      update,
    );
    if (guarded.kind === 'failure') {
      sendJoinGuardError(ctx, socket, guarded.error.message);
      return;
    }
    if (guarded.kind === 'send') {
      ctx.safeSend(socket, guarded.value);
    }
  }

  ctx.maybeResume();
}

/**
 * Resolves the joining socket's admitted viewer. Null means the
 * principal is not a current member (or membership is unavailable).
 */
type JoinViewerResolution =
  | { readonly kind: 'viewer'; readonly viewer: IAuthorizedViewer }
  | { readonly kind: 'refused' }
  | { readonly kind: 'unavailable' };

/**
 * Resolves the joining socket's viewer, preserving the PR 2/3
 * auth-vs-infra split: an AuthorizedViewerError (revoked or never a
 * member) is an authorization REFUSAL, while any other failure is
 * infrastructure unavailability. The two produce different typed
 * closes - revocation must never masquerade as a server fault.
 */
async function resolveJoinViewer(
  ctx: IServerMatchHostReplayContext,
  playerId: string,
): Promise<JoinViewerResolution> {
  try {
    const viewer = await ctx.viewerResolver.resolve(
      mintVerifiedPrincipal(playerId),
      ctx.matchId,
    );
    return { kind: 'viewer', viewer };
  } catch (error) {
    if (error instanceof AuthorizedViewerError) return { kind: 'refused' };
    return { kind: 'unavailable' };
  }
}

/**
 * Typed Close for join viewer-resolution failure. No baseline or replay
 * frames are sent on this path (fail closed).
 */
function sendJoinClose(
  ctx: IServerMatchHostReplayContext,
  socket: IMatchSocket,
  resolution: JoinViewerResolution,
): void {
  const refused = resolution.kind === 'refused';
  ctx.safeSend(socket, {
    kind: 'Close',
    matchId: ctx.matchId,
    ts: nowIso(),
    code: refused ? 'AUTH_REJECTED' : 'INTERNAL_ERROR',
    reason: refused
      ? 'not an active member of this match'
      : 'membership verification unavailable',
  });
}

/**
 * Typed Error for publication-guard failure. Reason is the constant
 * projection message so a payload fragment cannot ride out.
 */
function sendJoinGuardError(
  ctx: IServerMatchHostReplayContext,
  socket: IMatchSocket,
  reason: string,
): void {
  ctx.safeSend(socket, {
    kind: 'Error',
    matchId: ctx.matchId,
    ts: nowIso(),
    code: 'INTERNAL_ERROR',
    reason,
  });
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
  // M3 design D6 — a spectator's replay is filtered through the
  // spectator audience (most-redacted view), exactly like the live
  // broadcast path, so a spectator joining mid-match never replays a
  // hidden-unit event.
  const spectator = isSpectatorPlayer(meta.seats ?? [], playerId);

  for (const event of allEvents) {
    prefix.push(event);
    if (event.sequence < fromSeq) continue;
    const state = withVisibilityAssignments(deriveState(gameId, prefix), meta);
    const filtered = spectator
      ? filterEventForSpectator(event, state, {
          config: meta.config,
          cache: replayCache,
        })
      : filterEventForPlayer(event, playerId, state, {
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
