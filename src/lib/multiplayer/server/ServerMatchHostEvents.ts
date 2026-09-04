import type { InteractiveSession } from '@/engine/InteractiveSession';
import type {
  IGameEvent,
  IGameState,
} from '@/types/gameplay/GameSessionInterfaces';
import type { IEventMessage } from '@/types/multiplayer/Protocol';

import { throwForPostCommitSendFault } from './DurableMatchStore';
import type { IMatchMeta, IMatchStore } from './IMatchStore';
import type { RollCapture } from './RollCapture';
import type { ServerMatchBroadcaster } from './ServerMatchBroadcaster';
import type { ServerMatchSocketLifecycle } from './ServerMatchSocketLifecycle';
import type { IMatchSocket } from './ServerMatchSocketTypes';

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
import {
  createMatchWireSealedChoiceAudienceContext,
  isMatchWireSealedDeclaration,
  sealedDeclarationsRevealedBy,
} from './projection/MatchWireSealedChoices';
import { ViewerDeliveryCursors } from './projection/ViewerDeliveryCursors';
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
 * playerId so a player with two sockets is looked up once). Delivery
 * numbering follows the same rule: one assign per player per frame,
 * reused by every additional socket of that player in this broadcast.
 * The catalog decides every admitted viewer's audience. Sealed tactical
 * declarations bypass fog's independent actor-only classifier so the
 * catalog remains their one authority; an unadmitted socket receives
 * nothing.
 */
export async function broadcastEvent(
  ctx: IBroadcastEventContext,
): Promise<void> {
  await broadcastEventInMode(ctx, false);
}

/**
 * The publication-outbox drain's broadcast (umbrella 7.1). Identical to
 * `broadcastEvent` except every send runs in undelivered-only mode: a
 * viewer whose delivery cursor already records this authority sequence
 * is skipped instead of being assigned a second, fresh delivery number.
 * That is what lets a restart drain re-offer a frame at-least-once
 * without shifting the cursor of anyone who already applied it.
 */
export async function broadcastUndeliveredEvent(
  ctx: IBroadcastEventContext,
): Promise<void> {
  await broadcastEventInMode(ctx, true);
}

export interface IBroadcastEventContext {
  readonly matchId: string;
  readonly store: IMatchStore;
  readonly session: InteractiveSession;
  readonly lifecycle: ServerMatchSocketLifecycle;
  readonly broadcaster: ServerMatchBroadcaster;
  readonly fogVisibilityCache: FogOfWarVisibilityCache;
  readonly viewerResolver: AuthorizedViewerResolver;
  readonly deliveryCursors: ViewerDeliveryCursors;
  readonly message: IEventMessage;
}

async function broadcastEventInMode(
  ctx: IBroadcastEventContext,
  onlyUndelivered: boolean,
): Promise<void> {
  await publishEvent(ctx, ctx.message, onlyUndelivered);

  const revealEvent = ctx.message.event as IGameEvent;
  const selected = sealedDeclarationsRevealedBy(
    ctx.session.getSession().events,
    revealEvent,
  );
  if (selected.length === 0) return;
  for (const declaration of await committedDeclarations(ctx, selected)) {
    // Reveals are always delivered in undelivered-only mode regardless
    // of the outer mode: their whole mechanism is late delivery of a
    // frame the viewer must receive exactly once.
    await publishEvent(
      ctx,
      { ...ctx.message, event: declaration },
      true,
      revealEvent.sequence,
    );
  }
}

/**
 * Resolve each selected declaration to the row the authority COMMITTED.
 *
 * WHY the store and not the session log the selection came from: the
 * commit path stamps `intentId` and captured `rolls` onto a COPY of the
 * batch (`stampIntentIdOnNewEvents` / `stampRollsOnNewEvents` above both
 * return new objects), and `commitThenPublish` persists and broadcasts
 * THAT copy while the engine's in-memory log keeps the pre-stamp
 * original. Selecting from the session is still correct - the selector
 * reads only `type`, `turn`, `phase` and `sequence`, which no stamp
 * touches - but the PAYLOAD is only right in the store. Revealing the
 * session's copy made the late frame differ from the actor's own live
 * frame and from the viewer's replay of the same event id, by exactly
 * the stamped fields: live and replay were not equivalent for one
 * viewer, which is what `E2E-26` forbids, and `E2E-22` asks for the
 * reveal to come from committed delivery streams in the first place.
 *
 * Fails closed per declaration: a row the store cannot answer for is
 * NOT revealed at all, rather than revealed as a payload no surface
 * committed. That matches the publication boundary's own no-raw-fallback
 * law, and it is recoverable - replay reads these same rows, so the
 * viewer still gets the declaration on their next resume.
 */
async function committedDeclarations(
  ctx: { readonly matchId: string; readonly store: IMatchStore },
  declarations: readonly IGameEvent[],
): Promise<readonly IGameEvent[]> {
  const fromSeq = Math.min(
    ...declarations.map((declaration) => declaration.sequence),
  );
  let committed: readonly IGameEvent[];
  try {
    committed = await ctx.store.getEvents(ctx.matchId, fromSeq);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(
      `[ServerMatchHost ${ctx.matchId}] sealed reveal withheld: committed events unreadable from seq=${fromSeq}`,
      e,
    );
    return [];
  }
  const committedById = new Map(committed.map((event) => [event.id, event]));
  const resolved: IGameEvent[] = [];
  for (const declaration of declarations) {
    const row = committedById.get(declaration.id);
    if (row === undefined) {
      // eslint-disable-next-line no-console
      console.warn(
        `[ServerMatchHost ${ctx.matchId}] sealed reveal withheld: no committed row for event id=${declaration.id} seq=${declaration.sequence}`,
      );
      continue;
    }
    resolved.push(row);
  }
  return resolved;
}

async function publishEvent(
  ctx: {
    readonly matchId: string;
    readonly store: IMatchStore;
    readonly session: InteractiveSession;
    readonly lifecycle: ServerMatchSocketLifecycle;
    readonly broadcaster: ServerMatchBroadcaster;
    readonly fogVisibilityCache: FogOfWarVisibilityCache;
    readonly viewerResolver: AuthorizedViewerResolver;
    readonly deliveryCursors: ViewerDeliveryCursors;
  },
  message: IEventMessage,
  onlyUndelivered: boolean,
  visibleThroughSequence = (message.event as IGameEvent).sequence,
): Promise<void> {
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

  const sourceEvent = message.event as IGameEvent;
  const state =
    meta !== null
      ? withVisibilityAssignments(ctx.session.getSession().currentState, meta)
      : null;
  const audienceContext =
    state === null
      ? undefined
      : createMatchWireSealedChoiceAudienceContext(
          ctx.session.getSession().events,
          state,
          visibleThroughSequence,
        );
  const fogMeta = meta !== null && meta.config.fogOfWar === true ? meta : null;
  const seats = fogMeta?.seats ?? [];
  // One number per player per frame. Recipients are per-socket, but
  // `assign` is keyed per player: a second call for the same player
  // would append a duplicate entry and tell the extra socket N+1.
  const deliveryByPlayer = new Map<string, number>();

  for (const recipient of recipients) {
    const viewer = viewerCache.get(recipient.playerId) ?? null;
    if (viewer === null) continue;

    let frame: IEventMessage = message;
    if (
      fogMeta !== null &&
      state !== null &&
      !isMatchWireSealedDeclaration(sourceEvent)
    ) {
      const filtered = isSpectatorPlayer(seats, recipient.playerId)
        ? filterEventForSpectator(sourceEvent, state, {
            config: fogMeta.config,
            cache: ctx.fogVisibilityCache,
          })
        : filterEventForPlayer(sourceEvent, recipient.playerId, state, {
            config: fogMeta.config,
            cache: ctx.fogVisibilityCache,
          });
      if (!filtered) continue;
      frame = { ...message, event: filtered };
    }

    const guarded = MATCH_WIRE_PUBLICATION_BOUNDARY.guardLiveEvent(
      viewer,
      frame,
      audienceContext,
    );
    if (guarded.kind !== 'send') continue;
    if (
      onlyUndelivered &&
      ctx.deliveryCursors.deliverySequenceOf(
        recipient.playerId,
        sourceEvent.sequence,
      ) !== null
    ) {
      continue;
    }
    // Numbered HERE and nowhere earlier: every frame withheld by fog or
    // omitted by the guard has already `continue`d, so it never consumes
    // one of this viewer's numbers. That is what makes their sequence
    // gapless while the authority sequence they can also see is not.
    // Additional sockets of the SAME player reuse the number already
    // assigned for this frame; they do not call `assign` again.
    let deliverySequence = deliveryByPlayer.get(recipient.playerId);
    if (deliverySequence === undefined) {
      const authority = authoritySequenceOf(sourceEvent);
      // Unacked-frame bound (E2E-14). bufferedAmount stays 0 on match
      // traffic, so it is not this bound. Asked HERE, before assign,
      // so an isolated viewer stops growing issued; they resume from
      // firstMissedAuthoritySequence after the next ack, same as a
      // reconnect. Only this viewer is refused.
      if (!ctx.deliveryCursors.admit(recipient.playerId, authority)) {
        continue;
      }
      deliverySequence = ctx.deliveryCursors.assign(
        recipient.playerId,
        authority,
      );
      deliveryByPlayer.set(recipient.playerId, deliverySequence);
    }
    // The bounded queue, applied to the fact stream. Before this, the
    // per-viewer fan-out reached `safeSend` directly - which applies no
    // cap - so `MAX_BUFFERED_BYTES` guarded only the shared broadcast
    // and a stalled viewer was handed authorized facts without limit.
    //
    // Asked HERE, after the number is assigned, and that placement is
    // the whole of the recovery. `ViewerDeliveryCursors` distinguishes a
    // frame that was never owed (withheld by fog or the guard - it
    // `continue`s above and consumes no number) from a frame that was
    // owed and lost (it consumes its number, and the resulting hole is
    // the true signal that something went missing). A backpressure
    // refusal is the second kind: the viewer was eligible and did not
    // get it. Consuming the number is what lets the rejoin resume
    // EXACTLY at the first frame it lacks - the record's entry at
    // `cursor + 1` is that frame, and the replay hands it back under the
    // number already assigned to it, so the viewer's own sequence stays
    // contiguous across the gap. Measured: move this check above
    // `assign` and the rejoin re-delivers frames the viewer already
    // applied (15 frames, 12 distinct), which the resume row catches.
    if (!ctx.broadcaster.admitForSend(recipient.socket)) continue;
    try {
      sendNumberedLiveFrame(
        ctx.matchId,
        ctx.broadcaster,
        recipient.socket,
        {
          ...guarded.value,
          deliverySequence,
        },
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'test-post-commit-send'
      ) {
        continue;
      }
      throw error;
    }
  }
}

/**
 * WHAT: fire the one-shot post-commit send fault, then send this
 * viewer's numbered live frame.
 * WHY: the fault must throw at this per-viewer send, not inside the
 * shared broadcaster, so one failed recipient cannot rewrite
 * authority or stop the remaining fan-out.
 */
function sendNumberedLiveFrame(
  matchId: string,
  broadcaster: ServerMatchBroadcaster,
  socket: IMatchSocket,
  message: IEventMessage,
): void {
  throwForPostCommitSendFault(matchId);
  broadcaster.safeSend(socket, message);
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

/**
 * The authority sequence inside an Event frame, or null when it carries
 * none. Recorded beside the delivery number so a resume can map one back
 * to the other.
 */
function authoritySequenceOf(event: unknown): number | null {
  if (typeof event !== 'object' || event === null) return null;
  const sequence = (event as { sequence?: unknown }).sequence;
  return typeof sequence === 'number' ? sequence : null;
}
