import type { InteractiveSession } from '@/engine/InteractiveSession';
import type { IMatchSeat } from '@/types/multiplayer/Lobby';
import type { IPlayerRef } from '@/types/multiplayer/Player';
import type {
  IIntent,
  ILobbyUpdated,
  IServerMessage,
} from '@/types/multiplayer/Protocol';

import { GameSide } from '@/types/gameplay/GameSessionInterfaces';
import { InvalidMatchStatusTransitionError } from '@/types/multiplayer/MatchStatus';
import { nowIso } from '@/types/multiplayer/Protocol';
import { logger } from '@/utils/logger';

import type { IMatchMeta, IMatchStore, ISideAssignment } from './IMatchStore';
import type { PendingPeerTracker } from './reconnection/PendingPeerTracker';
import type { IServerMatchHostCaptureContext } from './ServerMatchHostCaptureContext';

import {
  canLaunch,
  leaveSeat,
  LobbyStateError,
  occupySeat,
  reassignSeat,
  setAiSlot,
  setHumanSlot,
  setReady,
} from './lobby/lobbyStateMachine';
import { updateMatchSeats, type SeatUpdateResult } from './lobby/seatUpdate';
import { markMatchCompleted } from './matchCompletion';
import {
  isLobbyIntentKind,
  lobbyIntentAllowedInStatus,
  MATCH_INTENT_KINDS,
  type LobbyIntentKind,
} from './matchIntentKinds';
import { sideOfPlayer } from './sideAssignments';

export interface IServerMatchHostLobbyContext extends IServerMatchHostCaptureContext {
  readonly matchId: string;
  readonly store: IMatchStore;
  readonly session: InteractiveSession;
  readonly playerRefs: ReadonlyMap<string, IPlayerRef>;
  readonly pendingPeers: PendingPeerTracker;
  readonly broadcast: (message: IServerMessage) => void;
  readonly broadcastEvent: (
    message: IServerMessage & { kind: 'Event' },
  ) => Promise<void>;
  readonly maybeResume: () => void;
}

interface ILobbyIntentMutation {
  readonly seats: IMatchSeat[];
  readonly status?: IMatchMeta['status'];
  readonly clearRoomCode?: boolean;
  /**
   * Pending-peer entry to drop once the seat write is applied. The handler
   * can run again after a conflict, so it must not touch host state itself.
   */
  readonly clearPendingFor?: string;
}

type LobbyIntent = Extract<
  IIntent['intent'],
  {
    readonly kind: Exclude<LobbyIntentKind, 'ForfeitMatch'>;
  }
>;

type LobbyIntentHandler<K extends LobbyIntent['kind']> = (
  ctx: IServerMatchHostLobbyContext,
  seats: readonly IMatchSeat[],
  envelope: IIntent,
  intent: Extract<LobbyIntent, { readonly kind: K }>,
) => ILobbyIntentMutation;

type LobbyIntentHandlers = {
  readonly [K in LobbyIntent['kind']]: LobbyIntentHandler<K>;
};

const LOBBY_INTENT_HANDLERS: LobbyIntentHandlers = {
  OccupySeat: (ctx, seats, envelope, intent) => ({
    seats: handleOccupySeat(ctx.playerRefs, seats, intent.slotId, envelope),
  }),
  LeaveSeat: (_ctx, seats, envelope, intent) => ({
    seats: leaveSeat(seats, intent.slotId, envelope.playerId),
  }),
  ReassignSeat: (_ctx, seats, _envelope, intent) => ({
    seats: reassignSeat(seats, intent.slotId, intent.toSide, intent.toSeat),
  }),
  SetAiSlot: (_ctx, seats, _envelope, intent) => ({
    seats: setAiSlot(seats, intent.slotId, intent.aiProfile),
  }),
  SetHumanSlot: (_ctx, seats, _envelope, intent) => ({
    seats: setHumanSlot(seats, intent.slotId),
  }),
  SetReady: (_ctx, seats, envelope, intent) => ({
    seats: handleSetReady(
      seats,
      intent.slotId,
      envelope.playerId,
      intent.ready,
    ),
  }),
  LaunchMatch: (ctx, seats) => {
    const nextSeats = seats.slice();
    if (!canLaunch(nextSeats)) {
      throw new LobbyStateError(
        'Cannot launch: not all seats are filled and ready',
      );
    }
    logAiSeats(ctx.matchId, nextSeats);
    return { seats: nextSeats, status: 'active', clearRoomCode: true };
  },
  MarkSeatAi: (ctx, seats, _envelope, intent) => {
    const target = seats.find((s) => s.slotId === intent.slotId);
    if (!target) {
      throw new LobbyStateError(`Unknown slotId: ${intent.slotId}`);
    }
    const droppedPlayerId = target.occupant?.playerId ?? null;
    if (
      target.kind !== 'human' ||
      droppedPlayerId === null ||
      !ctx.pendingPeers
        .getAllPending()
        .some(
          (entry) =>
            entry.playerId === droppedPlayerId &&
            entry.slotId === target.slotId,
        )
    ) {
      throw new LobbyStateError(
        'MarkSeatAi requires a pending occupied human seat',
      );
    }
    return {
      seats: setAiSlot(seats, intent.slotId, intent.aiProfile),
      clearPendingFor: droppedPlayerId,
    };
  },
};

/** Status gate plus handler against the metadata it is handed; may throw. */
function deriveLobbyMutation(
  ctx: IServerMatchHostLobbyContext,
  meta: IMatchMeta,
  envelope: IIntent,
): ILobbyIntentMutation {
  const intent = envelope.intent;
  if (
    !isLobbyIntentKind(intent.kind) ||
    !lobbyIntentAllowedInStatus(intent.kind, meta.status)
  ) {
    throw new LobbyStateError(
      `Intent ${intent.kind} is not allowed in match status ${meta.status}`,
    );
  }
  const handler = LOBBY_INTENT_HANDLERS[intent.kind as LobbyIntent['kind']];
  if (!handler) {
    throw new LobbyStateError(
      `Unhandled lobby intent: ${(intent as { kind: string }).kind}`,
    );
  }
  return handler(ctx, meta.seats ?? [], envelope, intent as never);
}

export async function handleLobbyIntent(
  ctx: IServerMatchHostLobbyContext,
  envelope: IIntent,
): Promise<readonly IServerMessage[]> {
  const out: IServerMessage[] = [];
  const meta = await ctx.store.getMatchMeta(ctx.matchId);
  const intent = envelope.intent;

  const reject = (
    code: 'AUTH_REJECTED' | 'INVALID_INTENT' | 'STORE_FAILURE',
    reason: string,
  ): readonly IServerMessage[] => {
    const err: IServerMessage = {
      kind: 'Error',
      matchId: ctx.matchId,
      ts: nowIso(),
      code,
      intentId: envelope.intentId,
      reason,
    };
    ctx.broadcast(err);
    return [err];
  };
  const refuse = (e: unknown): readonly IServerMessage[] =>
    reject(
      'INVALID_INTENT',
      e instanceof Error ? e.message : 'Lobby state machine rejected',
    );

  if (
    isLobbyIntentKind(intent.kind) &&
    MATCH_INTENT_KINDS[intent.kind].hostOnly &&
    envelope.playerId !== meta.hostPlayerId
  ) {
    return reject(
      'AUTH_REJECTED',
      `Intent ${intent.kind} requires host privileges`,
    );
  }

  // Forfeit ends the game through the engine rather than writing seats, so
  // only it decides from this first read.
  if (intent.kind === 'ForfeitMatch') {
    if (!lobbyIntentAllowedInStatus(intent.kind, meta.status)) {
      return refuse(
        new LobbyStateError(
          `Intent ${intent.kind} is not allowed in match status ${meta.status}`,
        ),
      );
    }
    return handleForfeitMatch(ctx, meta);
  }

  // Every other lobby intent is derived from the metadata at write time and
  // stored with the revision it was derived from, so a concurrent seat write
  // (REST spectate, detach, another intent) is merged, never overwritten.
  const attempt: {
    mutation: ILobbyIntentMutation | null;
    refusal: unknown;
    derivations: number;
  } = { mutation: null, refusal: null, derivations: 0 };
  let result: SeatUpdateResult;
  try {
    result = await updateMatchSeats(ctx.store, ctx.matchId, (current) => {
      attempt.derivations += 1;
      attempt.mutation = null;
      attempt.refusal = null;
      let mutation: ILobbyIntentMutation;
      try {
        mutation = deriveLobbyMutation(ctx, current, envelope);
      } catch (e) {
        attempt.refusal = e;
        return null;
      }
      attempt.mutation = mutation;
      return {
        seats: mutation.seats,
        playerIds: lobbyPlayerIds(mutation.seats),
        sideAssignments: lobbySideAssignments(mutation.seats),
        status: mutation.status ?? current.status,
        ...(mutation.clearRoomCode ? { roomCode: null } : {}),
      };
    });
  } catch (e) {
    // The match moved on between the read and this write (for example it
    // completed under a LaunchMatch). That is a refused intent, not a store
    // fault, so it carries the intent code and is logged, never swallowed.
    if (e instanceof InvalidMatchStatusTransitionError) {
      logger.warn(
        `[ServerMatchHost ${ctx.matchId}] lobby intent ${intent.kind} refused: match status changed concurrently`,
        { from: e.from, to: e.to },
      );
      return refuse(e);
    }
    return reject(
      'STORE_FAILURE',
      e instanceof Error ? e.message : 'Lobby persist failed',
    );
  }

  if (attempt.refusal !== null) {
    if (attempt.derivations > 1) {
      // Only a concurrent change can make the second look differ from the
      // first, so a refusal here is a lost race worth a trace.
      logger.warn(
        `[ServerMatchHost ${ctx.matchId}] lobby intent ${intent.kind} refused after a concurrent metadata change`,
        { reason: String(attempt.refusal) },
      );
    }
    return refuse(attempt.refusal);
  }
  if (result.kind === 'busy') {
    return reject(
      'STORE_FAILURE',
      'Lobby update conflicted with concurrent changes; retry',
    );
  }
  if (attempt.mutation?.clearPendingFor !== undefined) {
    ctx.pendingPeers.clearPending(attempt.mutation.clearPendingFor);
  }

  const update: ILobbyUpdated = {
    kind: 'LobbyUpdated',
    intentId: envelope.intentId,
    matchId: ctx.matchId,
    ts: nowIso(),
    seats: [...(result.meta.seats ?? [])],
    status: result.meta.status,
    hostPlayerId: result.meta.hostPlayerId,
  };
  ctx.broadcast(update);
  out.push(update);
  ctx.maybeResume();
  return out;
}

async function handleForfeitMatch(
  ctx: IServerMatchHostLobbyContext,
  meta: Pick<IMatchMeta, 'hostPlayerId' | 'sideAssignments'>,
): Promise<readonly IServerMessage[]> {
  const out: IServerMessage[] = [];
  const hostSide = sideOfPlayer(meta.sideAssignments, meta.hostPlayerId);
  const concededSide: GameSide =
    hostSide === 'opponent' ? GameSide.Player : GameSide.Opponent;

  ctx.pendingPeers.clearAll();
  ctx.installFreshCapture();
  try {
    ctx.session.concede(concededSide);
  } catch (e) {
    const err: IServerMessage = {
      kind: 'Error',
      matchId: ctx.matchId,
      ts: nowIso(),
      code: 'INVALID_INTENT',
      reason: e instanceof Error ? e.message : 'Forfeit rejected by engine',
    };
    ctx.broadcast(err);
    return [err];
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
      return [err];
    }
    const envelopeOut: IServerMessage = {
      kind: 'Event',
      matchId: ctx.matchId,
      ts: nowIso(),
      event,
    };
    await ctx.broadcastEvent(envelopeOut);
    out.push(envelopeOut);
  }
  await markMatchCompleted(ctx.store, ctx.matchId, newEvents);
  return out;
}

function handleOccupySeat(
  playerRefs: ReadonlyMap<string, IPlayerRef>,
  seats: readonly IMatchSeat[],
  slotId: string,
  envelope: IIntent,
): IMatchSeat[] {
  const ref =
    playerRefs.get(envelope.playerId) ??
    ({
      playerId: envelope.playerId,
      displayName: envelope.playerId,
    } as IPlayerRef);
  return occupySeat(seats, slotId, ref);
}

function handleSetReady(
  seats: readonly IMatchSeat[],
  slotId: string,
  playerId: string,
  ready: boolean,
): IMatchSeat[] {
  const seat = seats.find((s) => s.slotId === slotId);
  if (!seat) {
    throw new LobbyStateError(`Unknown slotId: ${slotId}`);
  }
  if (!seat.occupant || seat.occupant.playerId !== playerId) {
    throw new LobbyStateError(
      `Player ${playerId} cannot toggle ready on slot ${slotId} they don't occupy`,
    );
  }
  return setReady(seats, slotId, ready);
}

function lobbyPlayerIds(seats: readonly IMatchSeat[]): string[] {
  return Array.from(
    new Set(
      seats
        .filter((seat) => seat.kind === 'human')
        .map((seat) => seat.occupant?.playerId)
        .filter((playerId): playerId is string => Boolean(playerId)),
    ),
  );
}

function lobbySideAssignments(seats: readonly IMatchSeat[]): ISideAssignment[] {
  const sideNames = Array.from(new Set(seats.map((seat) => seat.side))).sort(
    (left, right) => left.localeCompare(right),
  );
  const assignments: ISideAssignment[] = [];
  const assigned = new Set<string>();

  for (const seat of seats) {
    const playerId = seat.kind === 'human' ? seat.occupant?.playerId : null;
    if (!playerId || assigned.has(playerId)) continue;
    assigned.add(playerId);
    assignments.push({
      playerId,
      side:
        sideNames.indexOf(seat.side) <= 0
          ? ('player' as const)
          : ('opponent' as const),
    });
  }

  return assignments;
}

function logAiSeats(matchId: string, seats: readonly IMatchSeat[]): void {
  for (const seat of seats) {
    if (seat.kind === 'ai') {
      // eslint-disable-next-line no-console
      console.info(
        `[ServerMatchHost ${matchId}] AI seat would run BotPlayer here (slotId=${seat.slotId}, profile=${seat.aiProfile ?? 'basic'})`,
      );
    }
  }
}
