/**
 * Resuming publication from durable records (umbrella task 7.1).
 *
 * `Commit Precedes Recipient Publication` scenario 2: a process that
 * dies after the commit but before all socket sends must, on restart,
 * "resume at-least-once publication from durable records and cursors
 * WITHOUT RE-EXECUTING THE COMMAND". That last clause is the load-
 * bearing one - re-running the command would re-roll dice, re-derive
 * damage, and produce a second, different history.
 *
 * The drain is driven against the REAL `InMemoryMatchStore` rather than
 * a fake, so what is proven here is the store's own outbox behaviour
 * and not a double's imitation of it. The store's durable twin is held
 * to the identical contract by `matchPublicationOutbox.test.ts`.
 */

import type { IEventMessage } from '@/types/multiplayer/Protocol';

import {
  GameEventType,
  GamePhase,
  type IGameEvent,
} from '@/types/gameplay/GameSessionInterfaces';

import type { IMatchCommandBatch } from '../matchCommandBatch';

import { type IMatchMeta } from '../IMatchStore';
import { InMemoryMatchStore } from '../InMemoryMatchStore';
import {
  commitThenPublish,
  resumePendingPublications,
} from '../ServerMatchHostPublication';

const MATCH_ID = 'match-resume';

function meta(): IMatchMeta {
  const now = new Date().toISOString();
  return {
    matchId: MATCH_ID,
    hostPlayerId: 'p1',
    playerIds: ['p1', 'p2'],
    sideAssignments: [
      { playerId: 'p1', side: 'player' },
      { playerId: 'p2', side: 'opponent' },
    ],
    status: 'active',
    createdAt: now,
    updatedAt: now,
    config: { mapRadius: 4, turnLimit: 5 },
  };
}

function event(sequence: number): IGameEvent {
  return {
    id: `evt-${sequence}`,
    sequence,
    type: GameEventType.PhaseChanged,
    timestamp: '2026-08-26T00:00:00.000Z',
    phase: GamePhase.Movement,
    data: {},
  } as unknown as IGameEvent;
}

function batch(
  overrides: Partial<IMatchCommandBatch> = {},
): IMatchCommandBatch {
  return {
    commandId: 'cmd-1',
    actorId: 'p1',
    expectedRevision: 0,
    events: [event(0), event(1)],
    ...overrides,
  };
}

/**
 * A store holding one command that committed and was never published -
 * exactly the state a crash between the commit and the socket sends
 * leaves behind.
 */
async function storeWithUnpublishedCommand(): Promise<InMemoryMatchStore> {
  const store = new InMemoryMatchStore({ quiet: true });
  await store.createMatch(meta());
  await store.appendCommandBatch(MATCH_ID, batch());
  return store;
}

describe('resumePendingPublications', () => {
  it('publishes every pending record in sequence order', async () => {
    const store = await storeWithUnpublishedCommand();
    const sent: IEventMessage[] = [];

    const published = await resumePendingPublications({
      matchId: MATCH_ID,
      publications: store,
      broadcastEvent: async (message) => {
        sent.push(message);
      },
    });

    expect(sent.map((m) => (m.event as IGameEvent).sequence)).toEqual([0, 1]);
    expect(published).toHaveLength(2);
    expect(
      sent.every((m) => m.kind === 'Event' && m.matchId === MATCH_ID),
    ).toBe(true);
  });

  it('publishes NOTHING on a second drain', async () => {
    // The control. Without the mark, a drain would republish the same
    // events on every pass forever, and "at-least-once" would degrade
    // into "endlessly". This row is also what proves the first one is
    // not passing against a drain that simply never records anything.
    const store = await storeWithUnpublishedCommand();
    const sent: IEventMessage[] = [];
    const drain = () =>
      resumePendingPublications({
        matchId: MATCH_ID,
        publications: store,
        broadcastEvent: async (message) => {
          sent.push(message);
        },
      });

    await drain();
    const second = await drain();

    expect(second).toHaveLength(0);
    expect(sent).toHaveLength(2);
  });

  it('leaves a record pending when its send throws', async () => {
    // At-least-once, not at-most-once. Marking the whole set up front
    // would be cheaper and would silently drop the tail of a drain that
    // died halfway: the frames were never sent and nothing durable
    // would remember that they were owed.
    const store = await storeWithUnpublishedCommand();

    await expect(
      resumePendingPublications({
        matchId: MATCH_ID,
        publications: store,
        broadcastEvent: async () => {
          throw new Error('socket gone');
        },
      }),
    ).rejects.toThrow('socket gone');

    expect(
      (await store.listPendingPublications(MATCH_ID)).map((r) => r.sequence),
    ).toEqual([0, 1]);
  });

  it('resumes without re-executing the command', async () => {
    // The clause the scenario turns on. A resume that re-ran the
    // command would re-roll its dice and write a second, different
    // history; this one only re-reads what was already committed.
    const store = await storeWithUnpublishedCommand();

    await resumePendingPublications({
      matchId: MATCH_ID,
      publications: store,
      broadcastEvent: async () => {},
    });

    expect(await store.getEvents(MATCH_ID)).toHaveLength(2);
    // The command's identity is untouched, so the store still
    // recognises the original as already committed.
    expect((await store.appendCommandBatch(MATCH_ID, batch())).kind).toBe(
      'duplicate-command',
    );
  });

  it('answers an empty drain for a store with nothing pending', async () => {
    const store = new InMemoryMatchStore({ quiet: true });
    await store.createMatch(meta());

    const published = await resumePendingPublications({
      matchId: MATCH_ID,
      publications: store,
      broadcastEvent: async () => {
        throw new Error('must not send');
      },
    });

    expect(published).toEqual([]);
  });
});

describe('commitThenPublish with a publication outbox', () => {
  it("publishes a previous run's leftovers BEFORE this command", async () => {
    // Order is the point. The leftovers are older events, and a client
    // that received this command's events first would apply the match's
    // history out of order.
    const store = await storeWithUnpublishedCommand();
    const sent: IEventMessage[] = [];

    await commitThenPublish({
      matchId: MATCH_ID,
      events: [event(2)],
      intentId: 'intent-2',
      publications: store,
      appendEvent: (evt) => store.appendEvent(MATCH_ID, evt),
      broadcast: () => {},
      broadcastEvent: async (message) => {
        sent.push(message);
      },
      closeMatch: async () => {},
    });

    expect(sent.map((m) => (m.event as IGameEvent).sequence)).toEqual([
      0, 1, 2,
    ]);
  });

  it("marks this command's own records published", async () => {
    // Without this, the next command's resume pass would find this
    // command's records still pending and publish them a second time.
    //
    // The commit happens INSIDE the commit pass here, which is the
    // shape task 3.1 gives this path when it routes the pass through
    // `appendCommandBatch`. Committing before the call instead would
    // put the records in front of the resume pass, and they would go
    // out twice - which is the ordering this arrangement exists to fix.
    const store = new InMemoryMatchStore({ quiet: true });
    await store.createMatch(meta());
    const sent: IEventMessage[] = [];
    let committed = false;

    await commitThenPublish({
      matchId: MATCH_ID,
      events: [event(0), event(1)],
      publications: store,
      appendEvent: async () => {
        if (committed) return;
        committed = true;
        await store.appendCommandBatch(MATCH_ID, batch());
      },
      broadcast: () => {},
      broadcastEvent: async (message) => {
        sent.push(message);
      },
      closeMatch: async () => {},
    });

    expect(sent.map((m) => (m.event as IGameEvent).sequence)).toEqual([0, 1]);
    expect(await store.listPendingPublications(MATCH_ID)).toEqual([]);
  });

  it("still resumes a previous run's records when this commit fails", async () => {
    // A failed commit still resumes what a PREVIOUS run committed -
    // those events are durable and owed. What it must not do is publish
    // its own half-written work, which the existing commit/publish
    // split already guarantees.
    const store = await storeWithUnpublishedCommand();
    const sent: IEventMessage[] = [];

    const result = await commitThenPublish({
      matchId: MATCH_ID,
      events: [event(2)],
      publications: store,
      appendEvent: async () => {
        throw new Error('disk full');
      },
      broadcast: () => {},
      broadcastEvent: async (message) => {
        sent.push(message);
      },
      closeMatch: async () => {},
    });

    expect(result.committed).toBe(false);
    expect(sent.map((m) => (m.event as IGameEvent).sequence)).toEqual([0, 1]);
  });
});
