/**
 * Commit precedes recipient publication (umbrella task 7.1).
 *
 * The append path had no test at all — the failure branch was pure
 * optimistic-path code. What it did was publish as it went, so a
 * command that failed partway through had already told every client
 * about the events that landed before it. Recipients applied half a
 * command, the match then closed underneath them, and no reader
 * afterwards could tell that half-state from a command that
 * legitimately produced fewer events.
 */

import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';
import type { IServerMessage } from '@/types/multiplayer/Protocol';

import { commitThenPublish } from '../ServerMatchHostIntent';

function gameEvent(sequence: number): IGameEvent {
  return { type: 'TestEvent', sequence } as unknown as IGameEvent;
}

function harness(failOnCall: number | null) {
  const appended: IGameEvent[] = [];
  const broadcast: IServerMessage[] = [];
  const published: IServerMessage[] = [];
  let closed = 0;

  return {
    appended,
    broadcast,
    published,
    get closed() {
      return closed;
    },
    deps: {
      matchId: 'match-commit',
      intentId: 'intent-1',
      appendEvent: async (event: IGameEvent) => {
        if (failOnCall !== null && appended.length + 1 === failOnCall) {
          throw new Error('disk full');
        }
        appended.push(event);
      },
      broadcast: (message: IServerMessage) => {
        broadcast.push(message);
      },
      broadcastEvent: async (message: IServerMessage) => {
        published.push(message);
      },
      closeMatch: async () => {
        closed += 1;
      },
    },
  };
}

describe('commitThenPublish', () => {
  it('publishes every event once the whole command is down', () => {
    const h = harness(null);

    return commitThenPublish({
      ...h.deps,
      events: [gameEvent(1), gameEvent(2)],
    }).then((result) => {
      expect(result.committed).toBe(true);
      expect(h.appended).toHaveLength(2);
      expect(h.published).toHaveLength(2);
      expect(h.closed).toBe(0);
    });
  });

  it('publishes NOTHING when an event partway through fails', async () => {
    // The defect. Three events, the second one fails: the first had
    // already gone out to every client before anyone knew the command
    // would not complete.
    const h = harness(2);

    const result = await commitThenPublish({
      ...h.deps,
      events: [gameEvent(1), gameEvent(2), gameEvent(3)],
    });

    expect(result.committed).toBe(false);
    expect(h.published).toHaveLength(0);
    expect(result.messages.every((m) => m.kind === 'Error')).toBe(true);
  });

  it('answers a failure with a truthful typed frame and closes the match', async () => {
    const h = harness(1);

    const result = await commitThenPublish({
      ...h.deps,
      events: [gameEvent(1)],
    });

    expect(result.committed).toBe(false);
    expect(h.broadcast).toEqual([
      expect.objectContaining({
        kind: 'Error',
        code: 'STORE_FAILURE',
        reason: 'disk full',
        intentId: 'intent-1',
      }),
    ]);
    expect(h.closed).toBe(1);
  });

  it('stops appending at the first failure', async () => {
    // Pushing on would deepen a commit the caller is about to abandon.
    const h = harness(2);

    await commitThenPublish({
      ...h.deps,
      events: [gameEvent(1), gameEvent(2), gameEvent(3)],
    });

    expect(h.appended).toHaveLength(1);
  });
});
