import type { InteractiveSession } from '@/engine/InteractiveSession';
import type {
  IGameEvent,
  IGameState,
} from '@/types/gameplay/GameSessionInterfaces';
import type {
  IEventMessage,
  IServerMessage,
} from '@/types/multiplayer/Protocol';

import type { IMatchMeta, IMatchStore } from './IMatchStore';
import type { RollCapture } from './RollCapture';
import type { ServerMatchBroadcaster } from './ServerMatchBroadcaster';
import type { ServerMatchSocketLifecycle } from './ServerMatchSocketLifecycle';

import { filterEventForPlayer, FogOfWarVisibilityCache } from './fogOfWar';

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

export async function broadcastEvent(ctx: {
  readonly matchId: string;
  readonly store: IMatchStore;
  readonly session: InteractiveSession;
  readonly lifecycle: ServerMatchSocketLifecycle;
  readonly broadcaster: ServerMatchBroadcaster;
  readonly fogVisibilityCache: FogOfWarVisibilityCache;
  readonly message: IEventMessage;
  readonly broadcast: (message: IServerMessage) => void;
}): Promise<void> {
  let meta: IMatchMeta;
  try {
    meta = await ctx.store.getMatchMeta(ctx.matchId);
  } catch {
    ctx.broadcast(ctx.message);
    return;
  }

  if (!meta.config.fogOfWar) {
    ctx.broadcast(ctx.message);
    return;
  }

  const state = withVisibilityAssignments(
    ctx.session.getSession().currentState,
    meta,
  );
  for (const recipient of ctx.lifecycle.snapshotRecipients()) {
    const filtered = filterEventForPlayer(
      ctx.message.event as IGameEvent,
      recipient.playerId,
      state,
      {
        config: meta.config,
        cache: ctx.fogVisibilityCache,
      },
    );
    if (!filtered) continue;
    ctx.broadcaster.safeSend(recipient.socket, {
      ...ctx.message,
      event: filtered,
    });
  }
}

function withVisibilityAssignments(
  state: IGameState,
  meta: IMatchMeta,
): IGameState {
  return {
    ...state,
    sideAssignments: meta.sideAssignments,
  } as IGameState;
}
