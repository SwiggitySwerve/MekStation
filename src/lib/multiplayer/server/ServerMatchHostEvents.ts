import type { InteractiveSession } from '@/engine/InteractiveSession';
import type {
  IGameEvent,
  IGameState,
} from '@/types/gameplay/GameSessionInterfaces';
import type { IEventMessage } from '@/types/multiplayer/Protocol';

import type { IMatchMeta, IMatchStore } from './IMatchStore';
import type { RollCapture } from './RollCapture';
import type { ServerMatchBroadcaster } from './ServerMatchBroadcaster';
import type { ServerMatchSocketLifecycle } from './ServerMatchSocketLifecycle';

import {
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

export function stampRollsOnNewEvents(
  capture: RollCapture,
  events: readonly IGameEvent[],
): readonly IGameEvent[] {
  const captured = capture.drain();
  if (captured.length === 0 || events.length === 0) {
    return events;
  }
  const stamped: IGameEvent[] = [];
  let attached = false;
  for (const evt of events) {
    if (!attached) {
      const newPayload = {
        ...(evt.payload as Record<string, unknown>),
        rolls: captured,
      };
      stamped.push({
        ...evt,
        payload: newPayload as IGameEvent['payload'],
      });
      attached = true;
    } else {
      stamped.push(evt);
    }
  }
  return stamped;
}

/**
 * Stamp an accepted intent's `intentId` onto the first of the events it
 * produced. Per `harden-multiplayer-transport` design D7, persisting
 * the id alongside the event log is what lets the recovery routine
 * reconstruct the `AcceptedIntentTracker` after a server restart — a
 * previously-accepted intent re-sent post-restart is still rejected as
 * a duplicate. The id rides in the event payload (same first-event
 * attribution strategy as roll stamping); only the first event carries
 * it to keep the log compact.
 */
export function stampIntentIdOnNewEvents(
  intentId: string | undefined,
  events: readonly IGameEvent[],
): readonly IGameEvent[] {
  if (!intentId || events.length === 0) {
    return events;
  }
  const [first, ...rest] = events;
  const newPayload = {
    ...(first.payload as Record<string, unknown>),
    intentId,
  };
  return [{ ...first, payload: newPayload as IGameEvent['payload'] }, ...rest];
}

export async function persistInitialEvents(ctx: {
  readonly matchId: string;
  readonly store: IMatchStore;
  readonly events: readonly IGameEvent[];
  readonly setLastBroadcastSeq: (sequence: number) => void;
}): Promise<void> {
  for (const evt of ctx.events) {
    try {
      await ctx.store.appendEvent(ctx.matchId, evt);
      ctx.setLastBroadcastSeq(evt.sequence);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(
        `[ServerMatchHost ${ctx.matchId}] failed to persist initial event seq=${evt.sequence}`,
        e,
      );
    }
  }
}

/**
 * Broadcast one live game event through the publication boundary.
 * Each attached socket is resolved to its admitted viewer (cached by
 * playerId). The v1 catalog is all-public, so every admitted member
 * receives the identical frame; an unadmitted socket receives nothing.
 * Fog filtering still runs first when enabled, then the guard.
 */
export async function broadcastEvent(ctx: {
  readonly matchId: string;
  readonly store: IMatchStore;
  readonly session: InteractiveSession;
  readonly lifecycle: ServerMatchSocketLifecycle;
  readonly broadcaster: ServerMatchBroadcaster;
  readonly fogVisibilityCache: FogOfWarVisibilityCache;
  readonly viewerResolver: AuthorizedViewerResolver;
  readonly message: IEventMessage;
}): Promise<void> {
  let meta: IMatchMeta | null = null;
  try {
    meta = await ctx.store.getMatchMeta(ctx.matchId);
  } catch {
    meta = null;
  }

  const viewerCache = new Map<string, IAuthorizedViewer | null>();
  const recipients = ctx.lifecycle.attachedSockets();
  const uniquePlayerIds = Array.from(
    new Set(recipients.map((recipient) => recipient.playerId)),
  );
  await Promise.all(
    uniquePlayerIds.map((playerId) =>
      resolveViewerForBroadcast(
        ctx.viewerResolver,
        ctx.matchId,
        playerId,
        viewerCache,
      ),
    ),
  );

  const fogMeta = meta !== null && meta.config.fogOfWar === true ? meta : null;
  const state =
    fogMeta !== null
      ? withVisibilityAssignments(
          ctx.session.getSession().currentState,
          fogMeta,
        )
      : null;
  const seats = fogMeta?.seats ?? [];

  for (const recipient of recipients) {
    const viewer = viewerCache.get(recipient.playerId) ?? null;
    if (viewer === null) continue;

    let frame: IEventMessage = ctx.message;
    if (fogMeta !== null && state !== null) {
      const filtered = isSpectatorPlayer(seats, recipient.playerId)
        ? filterEventForSpectator(ctx.message.event as IGameEvent, state, {
            config: fogMeta.config,
            cache: ctx.fogVisibilityCache,
          })
        : filterEventForPlayer(
            ctx.message.event as IGameEvent,
            recipient.playerId,
            state,
            {
              config: fogMeta.config,
              cache: ctx.fogVisibilityCache,
            },
          );
      if (!filtered) continue;
      frame = { ...ctx.message, event: filtered };
    }

    const guarded = MATCH_WIRE_PUBLICATION_BOUNDARY.guardLiveEvent(
      viewer,
      frame,
    );
    if (guarded.kind !== 'send') continue;
    ctx.broadcaster.safeSend(recipient.socket, guarded.value);
  }
}

/**
 * Resolves one attached socket's viewer per broadcast, cached by
 * playerId so a player with two sockets is looked up once.
 * Resolve failure means the socket is not an admitted member: send
 * nothing (no raw fallback).
 */
async function resolveViewerForBroadcast(
  resolver: AuthorizedViewerResolver,
  matchId: string,
  playerId: string,
  cache: Map<string, IAuthorizedViewer | null>,
): Promise<IAuthorizedViewer | null> {
  const cached = cache.get(playerId);
  if (cached !== undefined) return cached;
  try {
    const viewer = await resolver.resolve(
      mintVerifiedPrincipal(playerId),
      matchId,
    );
    cache.set(playerId, viewer);
    return viewer;
  } catch {
    cache.set(playerId, null);
    return null;
  }
}

/** Copies match side assignments onto engine state for fog filtering. */
function withVisibilityAssignments(
  state: IGameState,
  meta: IMatchMeta,
): IGameState {
  return {
    ...state,
    sideAssignments: meta.sideAssignments,
  } as IGameState;
}
