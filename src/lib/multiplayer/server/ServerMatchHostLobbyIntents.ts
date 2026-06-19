import type { InteractiveSession } from '@/engine/InteractiveSession';
import type { IMatchSeat } from '@/types/multiplayer/Lobby';
import type { IPlayerRef } from '@/types/multiplayer/Player';
import type {
  IIntent,
  ILobbyUpdated,
  IServerMessage,
} from '@/types/multiplayer/Protocol';

import { GameSide } from '@/types/gameplay/GameSessionInterfaces';
import { nowIso } from '@/types/multiplayer/Protocol';

import type { IMatchMeta, IMatchStore } from './IMatchStore';
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
}

type LobbyIntent = Extract<
  IIntent['intent'],
  {
    readonly kind:
      | 'OccupySeat'
      | 'LeaveSeat'
      | 'ReassignSeat'
      | 'SetAiSlot'
      | 'SetHumanSlot'
      | 'SetReady'
      | 'LaunchMatch'
      | 'MarkSeatAi';
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
    const nextSeats = setAiSlot(seats, intent.slotId, intent.aiProfile);
    if (droppedPlayerId) {
      ctx.pendingPeers.clearPending(droppedPlayerId);
    }
    return { seats: nextSeats };
  },
};

export function isLobbyIntentKind(kind: IIntent['intent']['kind']): boolean {
  return (
    kind === 'OccupySeat' ||
    kind === 'LeaveSeat' ||
    kind === 'ReassignSeat' ||
    kind === 'SetAiSlot' ||
    kind === 'SetHumanSlot' ||
    kind === 'SetReady' ||
    kind === 'LaunchMatch' ||
    kind === 'MarkSeatAi' ||
    kind === 'ForfeitMatch'
  );
}

export async function handleLobbyIntent(
  ctx: IServerMatchHostLobbyContext,
  envelope: IIntent,
): Promise<readonly IServerMessage[]> {
  const out: IServerMessage[] = [];
  const meta = await ctx.store.getMatchMeta(ctx.matchId);
  const seats = meta.seats ?? [];
  const intent = envelope.intent;

  if (
    isHostOnlyLobbyIntent(intent.kind) &&
    envelope.playerId !== meta.hostPlayerId
  ) {
    const err: IServerMessage = {
      kind: 'Error',
      matchId: ctx.matchId,
      ts: nowIso(),
      code: 'AUTH_REJECTED',
      reason: `Intent ${intent.kind} requires host privileges`,
    };
    ctx.broadcast(err);
    return [err];
  }

  if (intent.kind === 'ForfeitMatch') {
    return handleForfeitMatch(ctx, meta);
  }

  let mutation: ILobbyIntentMutation;

  try {
    const handler = LOBBY_INTENT_HANDLERS[intent.kind as LobbyIntent['kind']];
    if (!handler) {
      throw new LobbyStateError(
        `Unhandled lobby intent: ${(intent as { kind: string }).kind}`,
      );
    }
    mutation = handler(ctx, seats, envelope, intent as never);
  } catch (e) {
    const err: IServerMessage = {
      kind: 'Error',
      matchId: ctx.matchId,
      ts: nowIso(),
      code: 'INVALID_INTENT',
      reason: e instanceof Error ? e.message : 'Lobby state machine rejected',
    };
    ctx.broadcast(err);
    return [err];
  }

  const nextSeats = mutation.seats;
  const nextStatus = mutation.status ?? meta.status;

  try {
    await ctx.store.updateMatchMeta(ctx.matchId, {
      seats: nextSeats,
      status: nextStatus,
      ...(mutation.clearRoomCode ? { roomCode: null } : {}),
    });
  } catch (e) {
    const err: IServerMessage = {
      kind: 'Error',
      matchId: ctx.matchId,
      ts: nowIso(),
      code: 'STORE_FAILURE',
      reason: e instanceof Error ? e.message : 'Lobby persist failed',
    };
    ctx.broadcast(err);
    return [err];
  }

  const update: ILobbyUpdated = {
    kind: 'LobbyUpdated',
    matchId: ctx.matchId,
    ts: nowIso(),
    seats: nextSeats,
    status: nextStatus,
    hostPlayerId: meta.hostPlayerId,
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
  const hostAssignment = meta.sideAssignments.find(
    (a) => a.playerId === meta.hostPlayerId,
  );
  const concededSide: GameSide =
    hostAssignment?.side === 'opponent' ? GameSide.Player : GameSide.Opponent;

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
  return out;
}

function isHostOnlyLobbyIntent(kind: IIntent['intent']['kind']): boolean {
  return (
    kind === 'ReassignSeat' ||
    kind === 'SetAiSlot' ||
    kind === 'SetHumanSlot' ||
    kind === 'LaunchMatch' ||
    kind === 'MarkSeatAi' ||
    kind === 'ForfeitMatch'
  );
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
