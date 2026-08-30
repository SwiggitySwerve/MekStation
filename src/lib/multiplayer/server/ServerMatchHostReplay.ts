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
import type { ViewerDeliveryCursors } from './projection/ViewerDeliveryCursors';
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
import {
  createMatchWireSealedChoiceAudienceContext,
  isMatchWireSealedDeclaration,
} from './projection/MatchWireSealedChoices';
import { MATCH_WIRE_PUBLICATION_BOUNDARY } from './projection/ViewerPublicationBoundary';
import {
  streamReplay,
  type IReplayStreamFrames,
} from './reconnection/replayStream';

type ReconnectMetadataReader = Pick<MatchLogStorage, 'getMatchMetadata'>;

export interface IServerMatchHostReplayContext {
  readonly matchId: string;
  readonly store: IMatchStore;
  readonly session: InteractiveSession;
  readonly safeSend: (socket: IMatchSocket, message: IServerMessage) => void;
  readonly maybeResume: () => void;
  readonly viewerResolver: AuthorizedViewerResolver;
  readonly deliveryCursors: ViewerDeliveryCursors;
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
    const audienceContext = await sealedChoiceAudienceContext(ctx);
    const guarded = MATCH_WIRE_PUBLICATION_BOUNDARY.guardReplayFrames(
      viewer,
      frames,
      audienceContext,
    );
    if (guarded.kind === 'failure') {
      sendJoinGuardError(ctx, socket, guarded.error.message);
      return false;
    }
    const outbound =
      playerId != null
        ? stampReplayDeliveries(
            ctx.deliveryCursors,
            playerId,
            events,
            guarded.frames,
          )
        : guarded.frames;
    ctx.safeSend(socket, outbound.start);
    for (const chunk of outbound.chunks) {
      ctx.safeSend(socket, chunk);
    }
    ctx.safeSend(socket, outbound.end);
    return true;
  }
  ctx.safeSend(socket, frames.start);
  for (const chunk of frames.chunks) {
    ctx.safeSend(socket, chunk);
  }
  ctx.safeSend(socket, frames.end);
  return true;
}

/**
 * Stamp each replayed item with this viewer's deliverySequence.
 *
 * An event already in the record (matched by authority sequence)
 * reuses that index; one not yet recorded is assigned through the
 * same `ViewerDeliveryCursors.assign` live sends use, so the record
 * stays gapless. `ReplayStart.fromDeliverySequence` /
 * `ReplayEnd.toDeliverySequence` are the lowest and highest stamps in
 * this stream so the envelope span is the viewer's delivery range,
 * not iteration order (prefix events never live-sent are assigned
 * at the high end but appear first in a from-zero replay).
 */
function stampReplayDeliveries(
  cursors: ViewerDeliveryCursors,
  playerId: string,
  originals: readonly IGameEvent[],
  frames: IReplayStreamFrames,
): IReplayStreamFrames {
  const authorityById = new Map<string, number>();
  for (const event of originals) {
    if (typeof event.id === 'string') {
      authorityById.set(event.id, event.sequence);
    }
  }
  let minDelivery: number | null = null;
  let maxDelivery: number | null = null;
  const chunks: IServerMessage[] = [];
  for (const chunk of frames.chunks) {
    if (chunk.kind !== 'ReplayChunk') {
      chunks.push(chunk);
      continue;
    }
    const deliverySequences: number[] = [];
    for (const event of chunk.events) {
      const authority = authoritySequenceForReplayItem(event, authorityById);
      const existing =
        authority !== null
          ? cursors.deliverySequenceOf(playerId, authority)
          : null;
      const deliverySequence =
        existing !== null ? existing : cursors.assign(playerId, authority);
      if (minDelivery === null || deliverySequence < minDelivery) {
        minDelivery = deliverySequence;
      }
      if (maxDelivery === null || deliverySequence > maxDelivery) {
        maxDelivery = deliverySequence;
      }
      deliverySequences.push(deliverySequence);
    }
    chunks.push({ ...chunk, deliverySequences });
  }
  const start: IServerMessage =
    minDelivery !== null && frames.start.kind === 'ReplayStart'
      ? { ...frames.start, fromDeliverySequence: minDelivery }
      : frames.start;
  if (maxDelivery === null || frames.end.kind !== 'ReplayEnd') {
    return { start, chunks, end: frames.end };
  }
  return {
    start,
    chunks,
    end: { ...frames.end, toDeliverySequence: maxDelivery },
  };
}

function authoritySequenceForReplayItem(
  event: unknown,
  authorityById: ReadonlyMap<string, number>,
): number | null {
  if (typeof event !== 'object' || event === null) return null;
  const record = event as { id?: unknown; sequence?: unknown };
  if (typeof record.id === 'string') {
    const fromOriginal = authorityById.get(record.id);
    if (typeof fromOriginal === 'number') return fromOriginal;
  }
  return typeof record.sequence === 'number' ? record.sequence : null;
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
  /**
   * The FIRST authority sequence to send, not the last one the client
   * already holds.
   *
   * It used to mean the latter and this function added one. Two callers'
   * conventions then met here without either being named: a delivery
   * cursor resolves to the first frame a viewer LACKS, and adding one to
   * that skipped exactly the frame a gap recovery had asked for. Naming
   * the convention is the fix — the caller knows which number it has, and
   * this function no longer guesses.
   */
  fromSeq?: number,
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

  const requestFrom = fromSeq ?? 0;
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
    if (isMatchWireSealedDeclaration(event)) {
      visible.push(event);
      continue;
    }
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

async function sealedChoiceAudienceContext(ctx: IServerMatchHostReplayContext) {
  try {
    const meta = await ctx.store.getMatchMeta(ctx.matchId);
    return createMatchWireSealedChoiceAudienceContext(
      ctx.session.getSession().events,
      withVisibilityAssignments(ctx.session.getSession().currentState, meta),
      Number.MAX_SAFE_INTEGER,
    );
  } catch {
    return undefined;
  }
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
