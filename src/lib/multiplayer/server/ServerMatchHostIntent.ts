import type { InteractiveSession } from '@/engine/InteractiveSession';
import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';
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

import { dispatchToEngine } from './ServerMatchHostEngineDispatch';
import { isLobbyIntentKind } from './ServerMatchHostLobbyIntents';

export interface IServerMatchHostIntentContext {
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
  readonly installFreshCapture: () => void;
  readonly drainNewEvents: () => readonly IGameEvent[];
  readonly stampRollsOnNewEvents: (
    events: readonly IGameEvent[],
  ) => readonly IGameEvent[];
  readonly tryPublishOutcome: () => void;
}

export async function handleIntent(
  ctx: IServerMatchHostIntentContext,
  envelope: IIntent,
): Promise<readonly IServerMessage[]> {
  const broadcasts: IServerMessage[] = [];

  if (ctx.closed) {
    const err = errorMessage(ctx.matchId, 'UNKNOWN_MATCH', 'Match is closed');
    ctx.broadcast(err);
    return [err];
  }

  if (isLobbyIntentKind(envelope.intent.kind)) {
    return ctx.handleLobbyIntent(envelope);
  }

  if (ctx.isPaused) {
    const err = errorMessage(
      ctx.matchId,
      'MATCH_PAUSED',
      'Match is paused waiting for a peer to reconnect',
    );
    ctx.broadcast(err);
    return [err];
  }

  if (intentHasForbiddenDiceField(envelope.intent)) {
    const err = errorMessage(
      ctx.matchId,
      'INVALID_INTENT',
      'client-rolls-forbidden',
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
    );
    ctx.broadcast(err);
    return [err];
  }

  const newEvents = ctx.stampRollsOnNewEvents(ctx.drainNewEvents());
  for (const event of newEvents) {
    try {
      await ctx.store.appendEvent(ctx.matchId, event);
    } catch (e) {
      const err = errorMessage(
        ctx.matchId,
        'STORE_FAILURE',
        e instanceof Error ? e.message : 'Store append failed',
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

function errorMessage(
  matchId: string,
  code: Extract<IServerMessage, { kind: 'Error' }>['code'],
  reason: string,
): Extract<IServerMessage, { kind: 'Error' }> {
  return {
    kind: 'Error',
    matchId,
    ts: nowIso(),
    code,
    reason,
  };
}
