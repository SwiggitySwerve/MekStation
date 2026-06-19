import type { InteractiveSession } from '@/engine/InteractiveSession';
import type { IMatchSeat } from '@/types/multiplayer/Lobby';
import type {
  IEventMessage,
  IIntent,
  IServerMessage,
} from '@/types/multiplayer/Protocol';

import {
  intentHasForbiddenDiceField,
  nowIso,
} from '@/types/multiplayer/Protocol';

import type { IMatchStore } from './IMatchStore';
import type { AcceptedIntentTracker } from './reconnection/AcceptedIntentTracker';
import type { IntentRateLimiter } from './reconnection/IntentRateLimiter';
import type { IServerMatchHostCaptureContext } from './ServerMatchHostCaptureContext';

import { isSpectatorPlayer } from './lobby/spectatorSeats';
import { dispatchToEngine } from './ServerMatchHostEngineDispatch';
import { stampIntentIdOnNewEvents } from './ServerMatchHostEvents';
import { isLobbyIntentKind } from './ServerMatchHostLobbyIntents';

export interface IServerMatchHostIntentContext extends IServerMatchHostCaptureContext {
  readonly matchId: string;
  readonly store: IMatchStore;
  readonly session: InteractiveSession;
  readonly closed: boolean;
  readonly isPaused: boolean;
  readonly broadcast: (message: IServerMessage) => void;
  readonly broadcastEvent: (message: IEventMessage) => Promise<void>;
  readonly closeMatch: () => Promise<void>;
  readonly handleLobbyIntent: (
    envelope: IIntent,
  ) => Promise<readonly IServerMessage[]>;
  readonly tryPublishOutcome: () => void;
  /**
   * harden-multiplayer-transport (M2) — per-connection token-bucket
   * rate limiter (design D6). Heartbeats and replay traffic never
   * reach `handleIntent`, so routing every intent through this limiter
   * exempts them automatically.
   */
  readonly rateLimiter: IntentRateLimiter;
  /**
   * harden-multiplayer-transport (M2) — per-match accepted-intent-id
   * set for replay-attack detection (design D7).
   */
  readonly acceptedIntents: AcceptedIntentTracker;
}

/**
 * Apply an intent.
 *
 * `connectionKey` identifies the inbound socket so the per-connection
 * rate limiter (design D6) can debit the right bucket. The WebSocket
 * upgrade handler passes the per-socket identity; tests pass any
 * stable string. When omitted (legacy callers) a shared `'default'`
 * bucket is used — still bounded, just not per-connection.
 */
export async function handleIntent(
  ctx: IServerMatchHostIntentContext,
  envelope: IIntent,
  connectionKey = 'default',
): Promise<readonly IServerMessage[]> {
  const broadcasts: IServerMessage[] = [];

  if (ctx.closed) {
    const err = errorMessage(ctx.matchId, 'UNKNOWN_MATCH', 'Match is closed');
    ctx.broadcast(err);
    return [err];
  }

  // M3 (add-matchmaking-and-spectator) design D5 — a spectator can
  // never produce an `Intent`. The spectator surface renders no intent
  // controls, but the server independently rejects ANY intent from a
  // `kind: 'spectator'` seat — engine-mutating intents AND lobby
  // intents alike — so a hand-crafted envelope cannot act. No event is
  // appended. The check runs before lobby routing and before every
  // integrity gate so a spectator intent is rejected uniformly.
  const spectatorRejection = await rejectSpectatorIntent(ctx, envelope);
  if (spectatorRejection) {
    return spectatorRejection;
  }

  // Lobby intents route to the lobby handler BEFORE the integrity
  // gates — seat occupancy / readiness / launch is not an
  // engine-mutating intent and has its own host-only authorization.
  if (isLobbyIntentKind(envelope.intent.kind)) {
    return ctx.handleLobbyIntent(envelope);
  }

  // Design D6 — per-connection intent rate-limiting. An over-budget
  // intent is rejected with a non-fatal RATE_LIMITED error; the
  // connection stays open and no event is appended.
  if (!ctx.rateLimiter.tryConsume(connectionKey)) {
    const err = errorMessage(
      ctx.matchId,
      'RATE_LIMITED',
      'Intent rate limit exceeded',
      envelope.intentId,
    );
    ctx.broadcast(err);
    return [err];
  }

  // Design D7 — replay-attack protection. An intent whose id the
  // server has already accepted for this match is a replayed envelope;
  // reject it with DUPLICATE_INTENT and append no event.
  if (
    envelope.intentId != null &&
    ctx.acceptedIntents.isDuplicate(envelope.intentId)
  ) {
    const err = errorMessage(
      ctx.matchId,
      'DUPLICATE_INTENT',
      'Intent id already accepted for this match',
      envelope.intentId,
    );
    ctx.broadcast(err);
    return [err];
  }

  if (ctx.isPaused) {
    const err = errorMessage(
      ctx.matchId,
      'MATCH_PAUSED',
      'Match is paused waiting for a peer to reconnect',
      envelope.intentId,
    );
    ctx.broadcast(err);
    return [err];
  }

  if (intentHasForbiddenDiceField(envelope.intent)) {
    const err = errorMessage(
      ctx.matchId,
      'INVALID_INTENT',
      'client-rolls-forbidden',
      envelope.intentId,
    );
    ctx.broadcast(err);
    return [err];
  }

  ctx.installFreshCapture();
  try {
    dispatchToEngine(ctx.session, envelope.intent);
  } catch (e) {
    const err = errorMessage(
      ctx.matchId,
      'INVALID_INTENT',
      e instanceof Error ? e.message : 'Engine rejected intent',
      envelope.intentId,
    );
    ctx.broadcast(err);
    return [err];
  }

  // The engine accepted the intent. Record its id so a later replay of
  // the same envelope is caught (design D7), and stamp the id onto the
  // first produced event so recovery can rebuild the accepted-id set.
  let newEvents = ctx.stampRollsOnNewEvents(ctx.drainNewEvents());
  if (envelope.intentId != null && newEvents.length > 0) {
    ctx.acceptedIntents.record(envelope.intentId);
    newEvents = stampIntentIdOnNewEvents(envelope.intentId, newEvents);
  }
  for (const event of newEvents) {
    try {
      await ctx.store.appendEvent(ctx.matchId, event);
    } catch (e) {
      const err = errorMessage(
        ctx.matchId,
        'STORE_FAILURE',
        e instanceof Error ? e.message : 'Store append failed',
        envelope.intentId,
      );
      ctx.broadcast(err);
      broadcasts.push(err);
      await ctx.closeMatch();
      return broadcasts;
    }
    const envelopeOut: IServerMessage = {
      kind: 'Event',
      matchId: ctx.matchId,
      ts: nowIso(),
      event,
    };
    await ctx.broadcastEvent(envelopeOut);
    broadcasts.push(envelopeOut);
  }

  ctx.tryPublishOutcome();
  return broadcasts;
}

/**
 * M3 design D5 — reject an intent that originates from a
 * `kind: 'spectator'` seat. Returns the broadcast `Error` list when the
 * envelope's `playerId` occupies a spectator seat, or `null` when the
 * player is a participant (or seat metadata is unavailable, in which
 * case the normal intent path runs).
 *
 * The reply is `Error {code: 'INVALID_INTENT', reason:
 * 'spectator-cannot-act'}`. No event is appended — the function returns
 * before `dispatchToEngine` is ever reached.
 */
async function rejectSpectatorIntent(
  ctx: IServerMatchHostIntentContext,
  envelope: IIntent,
): Promise<readonly IServerMessage[] | null> {
  let seats: readonly IMatchSeat[];
  try {
    const meta = await ctx.store.getMatchMeta(ctx.matchId);
    seats = meta.seats ?? [];
  } catch {
    // No seat metadata — cannot classify the player. Fall through to
    // the normal intent path rather than blocking a legitimate intent.
    return null;
  }
  if (!isSpectatorPlayer(seats, envelope.playerId)) {
    return null;
  }
  const err = errorMessage(
    ctx.matchId,
    'INVALID_INTENT',
    'spectator-cannot-act',
    envelope.intentId,
  );
  ctx.broadcast(err);
  return [err];
}

function errorMessage(
  matchId: string,
  code: Extract<IServerMessage, { kind: 'Error' }>['code'],
  reason: string,
  intentId?: string,
): Extract<IServerMessage, { kind: 'Error' }> {
  return {
    kind: 'Error',
    matchId,
    ts: nowIso(),
    code,
    reason,
    ...(intentId != null ? { intentId } : {}),
  };
}
