import type { InteractiveSession } from '@/engine/InteractiveSession';
import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';
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

import {
  AuthorizedViewerError,
  type AuthorizedViewerResolver,
} from './authorization/AuthorizedViewer';
import {
  HumanActionAuthorizationError,
  authorizeHumanAction,
  type IHumanActionRequest,
} from './authorization/HumanActionAuthorizationGate';
import { MembershipSourceUnavailableError } from './authorization/MatchSeatMembershipSource';
import { isSpectatorPlayer } from './lobby/spectatorSeats';
import { dispatchToEngine } from './ServerMatchHostEngineDispatch';
import { stampIntentIdOnNewEvents } from './ServerMatchHostEvents';
import { isLobbyIntentKind } from './ServerMatchHostLobbyIntents';

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

  const commandRefusal = await refuseUnauthorizedCommand(
    ctx,
    envelope,
    verifiedPrincipalId,
  );
  if (commandRefusal) {
    return commandRefusal;
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
  const published = await commitThenPublish({
    matchId: ctx.matchId,
    events: newEvents,
    intentId: envelope.intentId,
    appendEvent: (event) => ctx.store.appendEvent(ctx.matchId, event),
    broadcast: ctx.broadcast,
    broadcastEvent: ctx.broadcastEvent,
    closeMatch: ctx.closeMatch,
  });
  broadcasts.push(...published.messages);
  if (!published.committed) return broadcasts;

  ctx.tryPublishOutcome();
  return broadcasts;
}

/** What `commitThenPublish` did. */
export interface ICommitThenPublishResult {
  /** False when an append failed; the caller must not continue. */
  readonly committed: boolean;
  /** Frames recorded - either every Event frame, or the failure. */
  readonly messages: readonly IServerMessage[];
}

/** Dependencies of `commitThenPublish`. */
export interface ICommitThenPublishDeps {
  readonly matchId: string;
  readonly events: readonly IGameEvent[];
  readonly intentId?: string;
  readonly appendEvent: (event: IGameEvent) => Promise<unknown>;
  readonly broadcast: (message: IServerMessage) => void;
  readonly broadcastEvent: (message: IEventMessage) => Promise<void>;
  readonly closeMatch: () => Promise<void>;
}

/**
 * Persist a command's events, and publish them ONLY once every one of
 * them is down.
 *
 * The two passes are the point. Appending and broadcasting in the same
 * pass meant a failure partway through had ALREADY told every client
 * about the events that landed before it - so a command that did not
 * succeed was still, in part, published. Recipients applied half a
 * command, the match then closed underneath them, and no reader
 * afterwards could tell that half-state from a command that
 * legitimately produced fewer events.
 *
 * NOT CLAIMED HERE: atomicity. The events still go down one at a time,
 * so a mid-command failure still leaves the earlier ones committed.
 * That boundary is the store adapters' `appendCommandBatch` (umbrella
 * task 3.1). What this fixes is narrower and worth stating exactly: a
 * partial commit is no longer PUBLISHED.
 */
export async function commitThenPublish(
  deps: ICommitThenPublishDeps,
): Promise<ICommitThenPublishResult> {
  // Pass 1 - commit. Nothing reaches a recipient from in here.
  for (const event of deps.events) {
    try {
      await deps.appendEvent(event);
    } catch (e) {
      const err = errorMessage(
        deps.matchId,
        'STORE_FAILURE',
        e instanceof Error ? e.message : 'Store append failed',
        deps.intentId,
      );
      deps.broadcast(err);
      await deps.closeMatch();
      // Returning at the first failure rather than pushing on: further
      // appends would only deepen a commit the caller is abandoning.
      return { committed: false, messages: [err] };
    }
  }

  // Pass 2 - publish. Reached only when the whole command is durable.
  const messages: IServerMessage[] = [];
  for (const event of deps.events) {
    const envelopeOut: IEventMessage = {
      kind: 'Event',
      matchId: deps.matchId,
      ts: nowIso(),
      event,
    };
    await deps.broadcastEvent(envelopeOut);
    messages.push(envelopeOut);
  }
  return { committed: true, messages };
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
 * Rechecks command authorization through the human-action gate before
 * any engine dispatch or store append. Broadcasts a typed Error and
 * returns it on refusal; returns null when the viewer may proceed.
 */
async function refuseUnauthorizedCommand(
  ctx: IServerMatchHostIntentContext,
  envelope: IIntent,
  verifiedPrincipalId: IntentVerifiedPrincipal,
): Promise<readonly IServerMessage[] | null> {
  const principalId =
    verifiedPrincipalId === SERVER_INTERNAL_INTENT_CALLER
      ? envelope.playerId
      : verifiedPrincipalId;
  try {
    await authorizeHumanAction(
      ctx.viewerResolver,
      principalId,
      ctx.matchId,
      commandRequestFromIntent(envelope.intent),
    );
    return null;
  } catch (error) {
    if (error instanceof MembershipSourceUnavailableError) {
      const infra = errorMessage(
        ctx.matchId,
        'INTERNAL_ERROR',
        'membership verification unavailable',
        envelope.intentId,
      );
      ctx.broadcast(infra);
      return [infra];
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
      return [err];
    }
    throw error;
  }
}

/**
 * Builds the command-kind gate request from fields the intent payload
 * actually named. Unknown keys are ignored; unit ids are not force ids.
 */
function commandRequestFromIntent(
  intent: IIntent['intent'],
): IHumanActionRequest {
  const claimedForceIds = readClaimedForceIds(intent);
  const claimedParticipantId = readOptionalStringField(intent, 'participantId');
  if (claimedParticipantId === undefined) {
    return { kind: 'command', claimedForceIds };
  }
  return { kind: 'command', claimedForceIds, claimedParticipantId };
}

/**
 * Collects forceId / forceIds claims from an intent payload. Missing
 * fields yield an empty list (no force-scope escalation to check).
 */
function readClaimedForceIds(intent: IIntent['intent']): readonly string[] {
  const ids: string[] = [];
  const forceId = readOptionalStringField(intent, 'forceId');
  if (forceId !== undefined) ids.push(forceId);
  const listed = Reflect.get(intent, 'forceIds');
  if (!Array.isArray(listed)) return ids;
  for (const item of listed) {
    if (typeof item === 'string' && item.length > 0) ids.push(item);
  }
  return ids;
}

/**
 * Reads a non-empty string property if the payload owns that key.
 */
function readOptionalStringField(
  intent: IIntent['intent'],
  key: string,
): string | undefined {
  if (!Object.prototype.hasOwnProperty.call(intent, key)) return undefined;
  const candidate = Reflect.get(intent, key);
  if (typeof candidate !== 'string' || candidate.length === 0) return undefined;
  return candidate;
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

/**
 * Builds a protocol Error envelope. `code` is the machine-readable
 * protocol union; `reason` must stay free of foreign session ids.
 */
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
