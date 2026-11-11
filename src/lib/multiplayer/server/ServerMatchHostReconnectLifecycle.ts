import type { InteractiveSession } from '@/engine/InteractiveSession';
import type {
  IEventMessage,
  IMatchPaused,
  IServerMessage,
  MatchPauseReason,
} from '@/types/multiplayer/Protocol';

import { GameSide } from '@/types/gameplay/GameSessionInterfaces';
import { nowIso } from '@/types/multiplayer/Protocol';

import type { IMatchStore } from './IMatchStore';
import type {
  IPendingPeerEntry,
  PendingPeerTracker,
} from './reconnection/PendingPeerTracker';
import type { IServerMatchHostCaptureContext } from './ServerMatchHostCaptureContext';

import { intentRefusalMessage } from './intentRefusal';
import { sideOfPlayer } from './sideAssignments';

export interface IServerMatchHostReconnectContext extends IServerMatchHostCaptureContext {
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
  readonly tryPublishOutcome: () => void;
  /** Current pause snapshot across every cause; null when none is active. */
  readonly pauseSnapshot: () => IMatchPaused | null;
}

export interface IPauseCauses {
  readonly matchId: string;
  readonly pending: readonly IPendingPeerEntry[];
  readonly gmAbsent: boolean;
  readonly opponentFaulted: boolean;
}

/**
 * M-H3: one `MatchPaused` snapshot for every active pause cause. The
 * reason is the cause with the highest precedence (opponent fault, then
 * GM absence, then a pending peer); the pending seats are always listed,
 * and the grace fields ride only with a pending seat.
 */
export function buildPauseSnapshot(causes: IPauseCauses): IMatchPaused | null {
  const reason: MatchPauseReason | null = causes.opponentFaulted
    ? 'opponent-fault'
    : causes.gmAbsent
      ? 'gm-absent'
      : causes.pending.length > 0
        ? 'peer-pending'
        : null;
  if (reason === null) return null;
  const paused: IMatchPaused = {
    kind: 'MatchPaused',
    matchId: causes.matchId,
    ts: nowIso(),
    reason,
    pendingSlots: causes.pending.map((p) => p.slotId),
  };
  if (causes.pending.length === 0) return paused;
  const nextExpiry = Math.min(...causes.pending.map((p) => p.expiresAt));
  return {
    ...paused,
    graceRemainingMs: Math.max(0, nextExpiry - Date.now()),
    pendingExpiresAtMs: nextExpiry,
  };
}

/** The `MATCH_PAUSED` refusal text for the active cause. */
export function pauseRefusalReason(reason: MatchPauseReason | null): string {
  if (reason === 'gm-absent')
    return 'Match is paused until the campaign GM returns';
  if (reason === 'opponent-fault')
    return 'Match is paused after a server opponent fault';
  return 'Match is paused waiting for a peer to reconnect';
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
  // P1A missions persist participant identities without lobby seats.
  const slotId =
    seat?.slotId ??
    (meta.coopMission && meta.playerIds.includes(playerId)
      ? `coop:${playerId}`
      : null);
  if (slotId === null) return;
  ctx.pendingPeers.markPending(playerId, slotId, (entry) =>
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
  void completeExpiredPendingMatch(ctx, entry.playerId);
}

/**
 * Lift the peer pause once no seat is pending. Another cause (GM absent,
 * opponent fault) keeps the match paused, so the broadcast is then a new
 * snapshot rather than `MatchResumed`. Returns whether it broadcast.
 */
export function maybeResume(ctx: {
  readonly matchId: string;
  readonly isPaused: boolean;
  readonly pendingPeers: PendingPeerTracker;
  readonly setPaused: (paused: boolean) => void;
  readonly broadcast: (message: IServerMessage) => void;
  readonly pauseSnapshot: () => IMatchPaused | null;
}): boolean {
  if (!ctx.isPaused) return false;
  if (ctx.pendingPeers.size() > 0) return false;
  ctx.setPaused(false);
  ctx.broadcast(
    ctx.pauseSnapshot() ?? {
      kind: 'MatchResumed',
      matchId: ctx.matchId,
      ts: nowIso(),
    },
  );
  return true;
}

function broadcastPauseSnapshot(ctx: IServerMatchHostReconnectContext): void {
  if (ctx.pendingPeers.size() === 0) return;
  // The peer pause is its own cause: set it even when the GM or a fault
  // already pauses the match, so the rejoin can lift exactly this cause.
  ctx.setPaused(true);
  const snapshot = ctx.pauseSnapshot();
  if (snapshot) ctx.broadcast(snapshot);
}

/**
 * Conclude a match whose reconnect grace window expired.
 *
 * Per `harden-multiplayer-transport` design D5: a server-authoritative
 * match must NOT end via the legacy `reason: 'aborted'` abort path.
 * When the grace timer fires we complete the match cleanly through the
 * normal outcome path — the timed-out player's side is conceded so the
 * surviving players get a clean win and the `CombatOutcomeReady` bus
 * fires exactly as it would for any conceded match.
 *
 * `timedOutPlayerId` is the player whose grace expired; we resolve
 * their side from `meta.sideAssignments`. If the side cannot be
 * resolved (corrupt meta) we fall back to `abortMatch` so the match
 * still reaches a terminal `GameEnded` event rather than hanging — a
 * documented last-resort, not the primary path.
 */
async function completeExpiredPendingMatch(
  ctx: IServerMatchHostReconnectContext,
  timedOutPlayerId: string,
): Promise<void> {
  if (ctx.closed) return;
  ctx.pendingPeers.clearAll();
  ctx.setPaused(false);
  ctx.installFreshCapture();

  // Resolve which game side to concede so the surviving players win.
  let concededSide: GameSide | null = null;
  try {
    const meta = await ctx.store.getMatchMeta(ctx.matchId);
    const side = sideOfPlayer(meta.sideAssignments, timedOutPlayerId);
    if (side !== undefined) {
      concededSide = side === 'player' ? GameSide.Player : GameSide.Opponent;
    }
  } catch {
    concededSide = null;
  }

  try {
    if (concededSide != null) {
      // Normal outcome path — concede the timed-out player's side.
      ctx.session.concede(concededSide);
    } else {
      // Last resort only — meta could not be resolved.
      ctx.session.abortMatch();
    }
  } catch (e) {
    // A server-driven timeout has no submitting socket. Log its failure only.
    intentRefusalMessage(
      ctx.matchId,
      'INVALID_INTENT',
      e instanceof Error ? e.message : 'Reconnect grace timeout rejected',
    );
    return;
  }

  const newEvents = ctx.stampRollsOnNewEvents(ctx.drainNewEvents());
  for (const event of newEvents) {
    try {
      await ctx.store.appendEvent(ctx.matchId, event);
    } catch (e) {
      // A server-driven timeout has no submitting socket. Log its failure only.
      intentRefusalMessage(
        ctx.matchId,
        'STORE_FAILURE',
        e instanceof Error ? e.message : 'Store append failed',
      );
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
