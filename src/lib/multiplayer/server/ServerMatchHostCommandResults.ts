import type { InteractiveSession } from '@/engine/InteractiveSession';
import type { ICommandCommitResult } from '@/types/command-screen';
import type { IEventMessage } from '@/types/multiplayer/Protocol';

import { buildPlayerSafeCommandResultEvent } from '@/lib/command-screen';
import { nowIso } from '@/types/multiplayer/Protocol';

import type { IMatchStore } from './IMatchStore';

export interface IPublishNetworkedCommandResultInput {
  readonly actorId: string;
  readonly source: 'host-command' | 'host-gm-intervention';
  readonly result: ICommandCommitResult;
  readonly eventId?: string;
  readonly timestamp?: string;
}

export interface IPublishNetworkedCommandResultContext {
  readonly matchId: string;
  readonly store: IMatchStore;
  readonly session: InteractiveSession;
  readonly broadcastEvent: (message: IEventMessage) => Promise<void>;
}

export async function publishNetworkedCommandResult(
  ctx: IPublishNetworkedCommandResultContext,
  input: IPublishNetworkedCommandResultInput,
): Promise<IEventMessage> {
  const current = ctx.session.getSession();
  const timestamp = input.timestamp ?? nowIso();
  const event = buildPlayerSafeCommandResultEvent({
    gameId: current.id,
    sequence: current.events.length,
    turn: current.currentState.turn,
    phase: current.currentState.phase,
    actorId: input.actorId,
    source: input.source,
    result: input.result,
    eventId: input.eventId,
    timestamp,
  });

  ctx.session.appendEvent(event);
  await ctx.store.appendEvent(ctx.matchId, event);

  const message: IEventMessage = {
    kind: 'Event',
    matchId: ctx.matchId,
    ts: timestamp,
    event,
  };
  await ctx.broadcastEvent(message);
  return message;
}
