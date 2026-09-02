import type { InteractiveSession } from '@/engine/InteractiveSession';
import type { IMatchSeat } from '@/types/multiplayer/Lobby';
import type {
  IEventMessage,
  IIntent,
  IServerMessage,
} from '@/types/multiplayer/Protocol';

import { GameStatus } from '@/types/gameplay/GameSessionInterfaces';
import {
  intentHasForbiddenDiceField,
  nowIso,
} from '@/types/multiplayer/Protocol';

import type { ICommandRejectionAuditPort } from './audit/CommandRejectionAudit';
import type { IAuthorizedViewer } from './authorization/AuthorizedViewer';
import type { IMatchStore } from './IMatchStore';
import type {
  JournalAuthorityRecovery,
  ShadowComparisonRecord,
} from './matchJournalAuthority';
import type { MatchRollbackBlockedReason } from './matchRollbackReaderSelection';
import type { AcceptedIntentTracker } from './reconnection/AcceptedIntentTracker';
import type { IntentRateLimiter } from './reconnection/IntentRateLimiter';
import type { IServerMatchHostCaptureContext } from './ServerMatchHostCaptureContext';
import type { IDecideCommandBatchDeps } from './ServerMatchHostDecision';

import {
  AuthorizedViewerError,
  type AuthorizedViewerResolver,
} from './authorization/AuthorizedViewer';
import {
  HumanActionAuthorizationError,
  authorizeHumanAction,
} from './authorization/HumanActionAuthorizationGate';
import { MembershipSourceUnavailableError } from './authorization/MatchSeatMembershipSource';
import {
  runLegacyShadowComparison,
  shadowAudienceInput,
} from './journalAuthorityShadow';
import { isSpectatorPlayer } from './lobby/spectatorSeats';
import { dispatchToEngine } from './ServerMatchHostEngineDispatch';
import { stampIntentIdOnNewEvents } from './ServerMatchHostEvents';
import {
  commandRequestFromIntent,
  readActorUnitId,
} from './ServerMatchHostIntentClaims';
import { commitJournalAuthorityCommand } from './ServerMatchHostJournalAuthority';
import { isLobbyIntentKind } from './ServerMatchHostLobbyIntents';
import {
  commitThenPublish,
  errorMessage,
  outboxCommitDeps,
} from './ServerMatchHostPublication';

/** Per-host journal-authority handle. Absent / disabled = live dispatch. */
export interface IJournalAuthorityHostHandle {
  readonly enabled: boolean;
  readonly shadow: boolean;
  readonly decideDeps: IDecideCommandBatchDeps;
  readonly d6: () => number;
  replaceSession(session: InteractiveSession): void;
  markDivergence(): void;
  setLastBroadcastSeq(sequence: number): void;
  publishDurableCombatOutcome(): Promise<void>;
  recordRecovery(recovery: JournalAuthorityRecovery | null): void;
  recordShadowComparison(record: ShadowComparisonRecord): void;
}

/**
 * In-process handleIntent caller that is not a wire socket. Production
 * WebSocket binding MUST pass the connection's verified principal id
 * instead. Omitted `verifiedPrincipalId` coalesces to this marker so
 * existing direct host.handleIntent test callers keep compiling; that
 * path still rechecks membership, using envelope.playerId only as the
 * in-process actor name, never as a client grant of authority.
 */
export const SERVER_INTERNAL_INTENT_CALLER: unique symbol = Symbol(
  'SERVER_INTERNAL_INTENT_CALLER',
);

/**
 * Production sockets pass the verified principal string. Direct
 * in-process callers pass this marker (or omit the argument).
 */
export type IntentVerifiedPrincipal =
  | string
  | typeof SERVER_INTERNAL_INTENT_CALLER;

export interface IServerMatchHostIntentContext extends IServerMatchHostCaptureContext {
  readonly matchId: string;
  readonly store: IMatchStore;
  readonly session: InteractiveSession;
  readonly closed: boolean;
  readonly isPaused: boolean;
  readonly broadcast: (message: IServerMessage) => void;
  readonly broadcastEvent: (message: IEventMessage) => Promise<void>;
  /** Undelivered-only broadcast for the outbox resume pass (7.1); optional for test contexts, production always supplies it. */
  readonly broadcastUndeliveredEvent?: (
    message: IEventMessage,
  ) => Promise<void>;
  readonly closeMatch: () => Promise<void>;
  readonly handleLobbyIntent: (
    envelope: IIntent,
  ) => Promise<readonly IServerMessage[]>;
  readonly tryPublishOutcome: () => void;
  /**
   * Membership resolver used by the human-action gate. Required so
   * engine-mutating intents recheck viewer membership on every command.
   */
  readonly viewerResolver: AuthorizedViewerResolver;
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
  /**
   * Append-once rejection-audit sink (umbrella 18.2). Optional because a
   * host without a durable database - a browser session, a unit-test
   * harness - must still be able to refuse a command; absent means the
   * refusal simply goes unrecorded, never that it is withheld.
   */
  readonly commandRejectionAudit?: ICommandRejectionAuditPort;
  /** Present only when durable rollback facts prohibit command admission. */
  readonly rollbackBlockReason?: MatchRollbackBlockedReason;
  /** Present when this host was created with journal authority on. */
  readonly journalAuthority?: IJournalAuthorityHostHandle;
}

/**
 * Apply an intent.
 *
 * `connectionKey` identifies the inbound socket so the per-connection
 * rate limiter (design D6) can debit the right bucket. The WebSocket
 * upgrade handler passes the per-socket identity; tests pass any
 * stable string. When omitted (legacy callers) a shared `'default'`
 * bucket is used — still bounded, just not per-connection.
 *
 * `verifiedPrincipalId` is the CONNECTION'S admitted identity on the
 * production socket path. Envelope.playerId is a client claim and is
 * never the authorization input. Direct in-process callers may omit it
 * (or pass SERVER_INTERNAL_INTENT_CALLER) so existing host tests keep
 * working; that marker is not a wire path.
 */
export async function handleIntent(
  ctx: IServerMatchHostIntentContext,
  envelope: IIntent,
  connectionKey = 'default',
  verifiedPrincipalId: IntentVerifiedPrincipal = SERVER_INTERNAL_INTENT_CALLER,
): Promise<readonly IServerMessage[]> {
  const broadcasts: IServerMessage[] = [];

  if (ctx.closed) {
    const err = errorMessage(ctx.matchId, 'UNKNOWN_MATCH', 'Match is closed');
    ctx.broadcast(err);
    return [err];
  }

  const principalMismatch = rejectMismatchedPrincipal(
    ctx,
    envelope,
    verifiedPrincipalId,
  );
  if (principalMismatch) {
    return principalMismatch;
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
  // engine-mutating intent and has its own host-only authorization
  // (admission + revalidation). The command gate does not run here.
  if (isLobbyIntentKind(envelope.intent.kind)) {
    return ctx.handleLobbyIntent(envelope);
  }

  if (ctx.rollbackBlockReason != null) {
    const err = errorMessage(
      ctx.matchId,
      'INTERNAL_ERROR',
      `rollback-reader-blocked:${ctx.rollbackBlockReason}`,
      envelope.intentId,
    );
    ctx.broadcast(err);
    return [err];
  }

  const authorization = await refuseUnauthorizedCommand(
    ctx,
    envelope,
    verifiedPrincipalId,
  );
  if ('refusal' in authorization) {
    return authorization.refusal;
  }
  // The gate already resolved this viewer from durable membership.
  // Carrying it forward is what lets every refusal below name a
  // SERVER-derived actor on its audit row without resolving twice.
  const viewer = authorization.viewer;

  const foreignUnitRefusal = await refuseForeignUnitCommand(
    ctx,
    envelope,
    verifiedPrincipalId,
    viewer,
  );
  if (foreignUnitRefusal) {
    return foreignUnitRefusal;
  }

  // Design D6 — per-connection intent rate-limiting. An over-budget
  // intent is rejected with a non-fatal RATE_LIMITED error; the
  // connection stays open and no event is appended.
  if (!ctx.rateLimiter.tryConsume(connectionKey)) {
    return rejectCommand(
      ctx,
      envelope,
      viewer,
      'RATE_LIMITED',
      'Intent rate limit exceeded',
    );
  }

  // Design D7 — replay-attack protection. An intent whose id the
  // server has already accepted for this match is a replayed envelope;
  // reject it with DUPLICATE_INTENT and append no event.
  // Journal-authority owns idempotent retry (identity law + outbox
  // resume) for the same envelope, so D7 must not preempt that path.
  if (
    envelope.intentId != null &&
    ctx.acceptedIntents.isDuplicate(envelope.intentId) &&
    ctx.journalAuthority?.enabled !== true
  ) {
    return rejectCommand(
      ctx,
      envelope,
      viewer,
      'DUPLICATE_INTENT',
      'Intent id already accepted for this match',
    );
  }

  if (ctx.isPaused) {
    return rejectCommand(
      ctx,
      envelope,
      viewer,
      'MATCH_PAUSED',
      'Match is paused waiting for a peer to reconnect',
    );
  }

  if (ctx.session.getSession().currentState.status === GameStatus.Completed) {
    // The match is over. Engine-mutating intents were still accepted
    // here, and they were not harmless: MEASURED on a real one-sided
    // victory, the log continued past `game_ended` with
    // `movement_locked`, `attack_locked` and `attacks_revealed`, and
    // `deriveCombatOutcome` - the value the campaign consumes for
    // salvage and damage - came out DIFFERENT before and after.
    //
    // Nothing legitimate is refused by this. The only production caller
    // of `handleIntent` is the raw client wire frame; GM corrections
    // never touch this host (nothing under `src/lib/interventions/`
    // references it), and the designed rewind is a replacement BRANCH
    // rather than a command on a finished match.
    //
    // Gated on `status`, deliberately NOT on `isGameOver()`: that also
    // returns true when a side simply has no surviving units, which is
    // already the case at boot for a zero-unit harness, so it would
    // refuse the very first intent of such a match.
    //
    // Lobby intents are unaffected - they return above, before this.
    return rejectCommand(
      ctx,
      envelope,
      viewer,
      'INVALID_INTENT',
      'match-already-completed',
    );
  }

  if (intentHasForbiddenDiceField(envelope.intent)) {
    return rejectCommand(
      ctx,
      envelope,
      viewer,
      'INVALID_INTENT',
      'client-rolls-forbidden',
    );
  }

  if (ctx.journalAuthority?.enabled) {
    const result = await commitJournalAuthorityCommand(ctx, envelope);
    return result.messages;
  }

  ctx.installFreshCapture();
  const headIndex = ctx.session.getSession().events.length;
  try {
    dispatchToEngine(ctx.session, envelope.intent);
  } catch (e) {
    return rejectCommand(
      ctx,
      envelope,
      viewer,
      'INVALID_INTENT',
      e instanceof Error ? e.message : 'Engine rejected intent',
    );
  }

  // The engine accepted the intent. Record its id so a later replay of
  // the same envelope is caught (design D7), and stamp the id onto the
  // first produced event so recovery can rebuild the accepted-id set.
  let newEvents = ctx.stampRollsOnNewEvents(ctx.drainNewEvents());
  if (ctx.journalAuthority?.shadow === true) {
    const audience = await shadowAudienceInput(ctx.store, ctx.matchId);
    runLegacyShadowComparison(ctx.journalAuthority, {
      liveSession: ctx.session,
      headIndex,
      liveEvents: newEvents,
      intent: envelope.intent,
      intentId: envelope.intentId,
      ...(audience !== null ? { audience } : {}),
    });
  }
  if (envelope.intentId != null && newEvents.length > 0) {
    ctx.acceptedIntents.record(envelope.intentId);
    newEvents = stampIntentIdOnNewEvents(envelope.intentId, newEvents);
  }
  const published = await commitThenPublish({
    matchId: ctx.matchId,
    events: newEvents,
    intentId: envelope.intentId,
    appendEvent: (event) => ctx.store.appendEvent(ctx.matchId, event),
    broadcast: ctx.broadcast,
    broadcastEvent: ctx.broadcastEvent,
    closeMatch: ctx.closeMatch,
    ...(ctx.broadcastUndeliveredEvent != null
      ? { broadcastUndeliveredEvent: ctx.broadcastUndeliveredEvent }
      : {}),
    ...outboxCommitDeps(ctx.store, ctx.matchId, envelope, newEvents),
  });
  broadcasts.push(...published.messages);
  if (!published.committed) return broadcasts;

  ctx.tryPublishOutcome();
  return broadcasts;
}

/**
 * Refuses an envelope whose playerId differs from the connection's
 * verified principal. Production sockets always supply that principal.
 * The server-internal marker skips this comparison because there is no
 * wire identity to bind; membership is still rechecked below.
 */
function rejectMismatchedPrincipal(
  ctx: IServerMatchHostIntentContext,
  envelope: IIntent,
  verifiedPrincipalId: IntentVerifiedPrincipal,
): readonly IServerMessage[] | null {
  if (verifiedPrincipalId === SERVER_INTERNAL_INTENT_CALLER) return null;
  if (envelope.playerId === verifiedPrincipalId) return null;
  const err = errorMessage(
    ctx.matchId,
    'AUTH_REJECTED',
    'player-mismatch',
    envelope.intentId,
  );
  ctx.broadcast(err);
  return [err];
}

/**
 * Terminal command refusal WITH its audit row, in that order.
 *
 * The row is appended before the Error frame is built or broadcast, so
 * a reader who can observe the refusal on the wire can already observe
 * the record of it - "append then reject" cannot quietly become
 * "reject then append". Recording is deliberately best-effort (see
 * `CommandRejectionAudit`'s NEVER FATAL law): the command is refused
 * either way, and a failed audit must not upgrade a clean refusal into
 * an internal error.
 */
function rejectCommand(
  ctx: IServerMatchHostIntentContext,
  envelope: IIntent,
  viewer: IAuthorizedViewer,
  code: Extract<IServerMessage, { kind: 'Error' }>['code'],
  reason: string,
): readonly IServerMessage[] {
  ctx.commandRejectionAudit?.recordCommandRejection({
    viewer,
    matchId: ctx.matchId,
    commandId: envelope.intentId ?? null,
    intent: envelope.intent,
    occurredAt: nowIso(),
  });
  const err = errorMessage(ctx.matchId, code, reason, envelope.intentId);
  ctx.broadcast(err);
  return [err];
}

/**
 * Outcome of the command gate: either the frames to return, or the
 * server-derived viewer every later refusal records as its actor.
 */
type CommandAuthorizationResult =
  | { readonly refusal: readonly IServerMessage[] }
  | { readonly viewer: IAuthorizedViewer };

/**
 * Rechecks command authorization through the human-action gate before
 * any engine dispatch or store append. Broadcasts a typed Error and
 * returns it on refusal; returns the branded viewer when the caller may
 * proceed.
 *
 * A refusal HERE is deliberately not audited to `action_audit`: the row
 * requires a server-derived participant and role, and the whole content
 * of this refusal is that no such viewer resolved. Recording a row with
 * a client-supplied actor would be worse than recording nothing.
 */
async function refuseUnauthorizedCommand(
  ctx: IServerMatchHostIntentContext,
  envelope: IIntent,
  verifiedPrincipalId: IntentVerifiedPrincipal,
): Promise<CommandAuthorizationResult> {
  const principalId =
    verifiedPrincipalId === SERVER_INTERNAL_INTENT_CALLER
      ? envelope.playerId
      : verifiedPrincipalId;
  try {
    const viewer = await authorizeHumanAction(
      ctx.viewerResolver,
      principalId,
      ctx.matchId,
      commandRequestFromIntent(envelope.intent),
    );
    return { viewer };
  } catch (error) {
    if (error instanceof MembershipSourceUnavailableError) {
      const infra = errorMessage(
        ctx.matchId,
        'INTERNAL_ERROR',
        'membership verification unavailable',
        envelope.intentId,
      );
      ctx.broadcast(infra);
      return { refusal: [infra] };
    }
    if (
      error instanceof HumanActionAuthorizationError ||
      error instanceof AuthorizedViewerError
    ) {
      const err = errorMessage(
        ctx.matchId,
        'AUTH_REJECTED',
        `command refused: ${error.code}`,
        envelope.intentId,
      );
      ctx.broadcast(err);
      return { refusal: [err] };
    }
    throw error;
  }
}

/**
 * Refuses a unit-scoped command whose actor unit sits on a side the
 * caller does not hold.
 *
 * Force-scope authorization cannot catch this and never could: a Move
 * names `unitId`, not `forceId`, so `commandRequestFromIntent` builds an
 * EMPTY force claim and the subset check passes trivially. The engine
 * cannot catch it either — `EngineIntentHandler` is
 * `(session, intent) => void`, so the dispatch layer never learns who
 * sent the command. Measured 2026-08-26: without this, a seated opponent
 * moved a Player-side mech and the host committed it (movement_declared
 * + movement_locked, position changed).
 *
 * Both halves come from records the server already owns —
 * `sideAssignments` is its own note of which side it gave a player, and
 * every unit in engine state carries its side — so nothing new has to be
 * threaded through the wire to make the comparison.
 *
 * Deliberately narrow in three ways. Co-op matches are exempt, because
 * there both players' mechs sit on one shared side and a side check
 * would refuse a teammate their own roster. Server-internal callers are
 * exempt:
 * they are the host acting, not a principal claiming scope. And a
 * refusal needs BOTH sides to resolve, so a match whose meta carries no
 * `sideAssignments` keeps its previous behaviour instead of becoming
 * newly unplayable — closing the measured hole without betting the
 * match on a lookup this change did not verify everywhere.
 */
async function refuseForeignUnitCommand(
  ctx: IServerMatchHostIntentContext,
  envelope: IIntent,
  verifiedPrincipalId: IntentVerifiedPrincipal,
  viewer: IAuthorizedViewer,
): Promise<readonly IServerMessage[] | null> {
  if (verifiedPrincipalId === SERVER_INTERNAL_INTENT_CALLER) return null;

  const actorUnitId = readActorUnitId(envelope.intent);
  if (actorUnitId === null) return null;

  const unitSide =
    ctx.session.getSession().currentState.units[actorUnitId]?.side;
  if (unitSide === undefined) return null;

  const meta = await ctx.store.getMatchMeta(ctx.matchId);

  // Co-op pools every deploying player's units onto the shared `player`
  // side while a guest still sits in a `bravo` seat, so side stops being
  // an ownership signal and a side check reads a teammate as an intruder
  // — locking the guest out of the entire roster. What DOES express
  // ownership there is the per-unit map `ownsCoopUnit` was written for,
  // and it cannot be consulted from here: `coopSeats` never leave
  // `composeCoopEncounter`. Until that map reaches the host, co-op unit
  // commands are unconstrained, exactly as they were before this guard.
  if (meta?.coopCampaign) return null;

  const callerSide = meta?.sideAssignments.find(
    (assignment) => assignment.playerId === verifiedPrincipalId,
  )?.side;
  if (callerSide === undefined) return null;

  if (callerSide === unitSide) return null;

  return rejectCommand(
    ctx,
    envelope,
    viewer,
    'AUTH_REJECTED',
    'unit-not-owned',
  );
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
