import type { InteractiveSession } from '@/engine/InteractiveSession';
import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';
import type {
  IEventMessage,
  IServerMessage,
} from '@/types/multiplayer/Protocol';

import { nowIso } from '@/types/multiplayer/Protocol';

import type { IMatchStore } from './IMatchStore';
import type {
  IPendingPeerEntry,
  PendingPeerTracker,
} from './reconnection/PendingPeerTracker';

export interface IServerMatchHostReconnectContext {
  readonly matchId: string;
  readonly store: IMatchStore;
  readonly session: InteractiveSession;
  readonly pendingPeers: PendingPeerTracker;
  readonly closed: boolean;
  readonly isPaused: boolean;
  readonly setPaused: (paused: boolean) => void;
  readonly broadcast: (message: IServerMessage) => void;
  readonly broadcastEvent: (message: IEventMessage) => Promise<void>;
  readonly closeMatch: () => Promise<void>;
  readonly installFreshCapture: () => void;
  readonly drainNewEvents: () => readonly IGameEvent[];
  readonly stampRollsOnNewEvents: (
    events: readonly IGameEvent[],
  ) => readonly IGameEvent[];
  readonly tryPublishOutcome: () => void;
}

export async function maybeMarkPlayerPending(
  ctx: IServerMatchHostReconnectContext,
  playerId: string,
): Promise<void> {
  let meta;
  try {
    meta = await ctx.store.getMatchMeta(ctx.matchId);
  } catch {
    return;
  }
  if (meta.status !== 'active') return;
  const seats = meta.seats ?? [];
  const seat = seats.find(
    (s) => s.kind === 'human' && s.occupant?.playerId === playerId,
  );
  if (!seat) return;
  ctx.pendingPeers.markPending(playerId, seat.slotId, (entry) =>
    handleGraceTimeout(ctx, entry),
  );
  broadcastPauseSnapshot(ctx);
}

export function handleGraceTimeout(
  ctx: IServerMatchHostReconnectContext,
  entry: IPendingPeerEntry,
): void {
  const msg: IServerMessage = {
    kind: 'SeatTimedOut',
    matchId: ctx.matchId,
    ts: nowIso(),
    slotId: entry.slotId,
    playerId: entry.playerId,
  };
  ctx.broadcast(msg);
  void abortExpiredPendingMatch(ctx);
}

export function maybeResume(ctx: {
  readonly matchId: string;
  readonly isPaused: boolean;
  readonly pendingPeers: PendingPeerTracker;
  readonly setPaused: (paused: boolean) => void;
  readonly broadcast: (message: IServerMessage) => void;
}): void {
  if (!ctx.isPaused) return;
  if (ctx.pendingPeers.size() > 0) return;
  ctx.setPaused(false);
  ctx.broadcast({
    kind: 'MatchResumed',
    matchId: ctx.matchId,
    ts: nowIso(),
  });
}

function broadcastPauseSnapshot(ctx: IServerMatchHostReconnectContext): void {
  const pending = ctx.pendingPeers.getAllPending();
  if (pending.length === 0) return;
  if (!ctx.isPaused) {
    ctx.setPaused(true);
  }
  const nextExpiry = Math.min(...pending.map((p) => p.expiresAt));
  const remainingMs = Math.max(0, nextExpiry - Date.now());
  ctx.broadcast({
    kind: 'MatchPaused',
    matchId: ctx.matchId,
    ts: nowIso(),
    reason: 'peer-pending',
    pendingSlots: pending.map((p) => p.slotId),
    graceRemainingMs: remainingMs,
    pendingExpiresAtMs: nextExpiry,
  });
}

async function abortExpiredPendingMatch(
  ctx: IServerMatchHostReconnectContext,
): Promise<void> {
  if (ctx.closed) return;
  ctx.pendingPeers.clearAll();
  ctx.setPaused(false);
  ctx.installFreshCapture();
  try {
    ctx.session.abortMatch();
  } catch (e) {
    const err: IServerMessage = {
      kind: 'Error',
      matchId: ctx.matchId,
      ts: nowIso(),
      code: 'INVALID_INTENT',
      reason:
        e instanceof Error ? e.message : 'Reconnect grace timeout rejected',
    };
    ctx.broadcast(err);
    return;
  }

  const newEvents = ctx.stampRollsOnNewEvents(ctx.drainNewEvents());
  for (const event of newEvents) {
    try {
      await ctx.store.appendEvent(ctx.matchId, event);
    } catch (e) {
      const err: IServerMessage = {
        kind: 'Error',
        matchId: ctx.matchId,
        ts: nowIso(),
        code: 'STORE_FAILURE',
        reason: e instanceof Error ? e.message : 'Store append failed',
      };
      ctx.broadcast(err);
      await ctx.closeMatch();
      return;
    }
    await ctx.broadcastEvent({
      kind: 'Event',
      matchId: ctx.matchId,
      ts: nowIso(),
      event,
    });
  }

  ctx.tryPublishOutcome();
  await ctx.closeMatch();
}
