/**
 * The batch contract, run against BOTH stores (umbrella task 2.2).
 *
 * `InMemoryMatchStore` is the dev/test adapter and `DurableMatchStore`
 * is production. A dev adapter that answers differently is worse than
 * none — every test written against it would be describing a store
 * production does not have, and the difference would only surface once
 * something real depended on it.
 *
 * So the contract is written once and both stores are made to pass it.
 * If they ever diverge, this file is where it shows, rather than in a
 * downstream test that happens to use one of them.
 */

import {
  GameEventType,
  GamePhase,
  type IGameEvent,
} from '@/types/gameplay/GameSessionInterfaces';

import type {
  IMatchCommandBatch,
  MatchBatchAppendResult,
} from '../matchCommandBatch';

import { DurableMatchStore } from '../DurableMatchStore';
import { MatchNotFoundError, type IMatchMeta } from '../IMatchStore';
import { InMemoryMatchStore } from '../InMemoryMatchStore';

const MATCH_ID = 'match-batch-contract';

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
    status: 'lobby',
    createdAt: now,
    updatedAt: now,
    config: { mapRadius: 4, turnLimit: 5 },
  };
}

function event(sequence: number, id = `evt-${sequence}`): IGameEvent {
  return {
    id,
    sequence,
    type: GameEventType.PhaseChanged,
    timestamp: '2026-08-25T00:00:00.000Z',
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
 * Both implementations, built the same way. `:memory:` still exercises
 * SQLite's real transactional path, so the durable side is not a
 * lookalike here either.
 */
const stores: ReadonlyArray<
  readonly [string, () => InMemoryMatchStore | DurableMatchStore]
> = [
  ['InMemoryMatchStore', () => new InMemoryMatchStore({ quiet: true })],
  ['DurableMatchStore', () => new DurableMatchStore({ path: ':memory:' })],
];

describe.each(stores)('%s appendCommandBatch contract', (_name, build) => {
  let store: InMemoryMatchStore | DurableMatchStore;

  beforeEach(async () => {
    store = build();
    await store.createMatch(meta());
  });

  async function append(
    input: Partial<IMatchCommandBatch> = {},
  ): Promise<MatchBatchAppendResult> {
    return store.appendCommandBatch!(MATCH_ID, batch(input));
  }

  it('commits a contiguous batch and returns a receipt describing it', async () => {
    const result = await append();

    expect(result.kind).toBe('committed');
    expect(result.kind === 'committed' && result.receipt).toMatchObject({
      commandId: 'cmd-1',
      actorId: 'p1',
      matchId: MATCH_ID,
      firstRevision: 0,
      lastRevision: 1,
      eventCount: 2,
    });
    expect(await store.getEvents(MATCH_ID)).toHaveLength(2);
    expect(await store.getCombatOutcomeOutbox(MATCH_ID)).toBeNull();
  });

  it('refuses an empty batch', async () => {
    // A receipt for a command that did nothing would let a later retry
    // "succeed" having still done nothing.
    const result = await append({ events: [] });

    expect(result.kind).toBe('empty-batch');
    expect(await store.getEvents(MATCH_ID)).toHaveLength(0);
  });

  it('refuses a batch with a gap and writes none of it', async () => {
    // A reader cannot tell a skipped revision from one it failed to
    // receive, so a gap has to be refused rather than tolerated.
    const result = await append({ events: [event(0), event(2)] });

    expect(result.kind).toBe('non-contiguous');
    expect(await store.getEvents(MATCH_ID)).toHaveLength(0);
  });

  it('recognises an identical retry instead of committing twice', async () => {
    await append();

    const retry = await append();

    expect(retry.kind).toBe('duplicate-command');
    expect(await store.getEvents(MATCH_ID)).toHaveLength(2);
  });

  it('refuses the same command id carrying different work', async () => {
    // Never a silent overwrite: the same id with different events is
    // not a retry, and treating it as one would let one player's
    // command be attributed to another's.
    await append();

    // Same sequences so contiguity still passes - the answer really is
    // about IDENTITY. The fingerprint keys on (sequence, id, type), so
    // different event ids under the same command id are different work.
    const conflict = await append({
      events: [event(0, 'evt-other-0'), event(1, 'evt-other-1')],
    });

    expect(conflict.kind).toBe('integrity-conflict');
    expect(await store.getEvents(MATCH_ID)).toHaveLength(2);
  });

  it('refuses the same command id carrying payload-divergent work', async () => {
    await append();

    const conflict = await append({
      events: [
        Object.assign(event(0), { payload: { target: 'alpha', damage: 8 } }),
        Object.assign(event(1), { payload: { target: 'beta', damage: 3 } }),
      ],
    });

    expect(conflict).toEqual({
      kind: 'integrity-conflict',
      commandId: 'cmd-1',
    });
    expect(await store.getEvents(MATCH_ID)).toHaveLength(2);
  });

  it('checks identity BEFORE the revision', async () => {
    // The ordering is load-bearing. A retry arriving after someone else
    // moved the stream is still a retry; calling it a revision conflict
    // sends the caller off to rebuild state it already has.
    await append();
    await append({
      commandId: 'cmd-2',
      expectedRevision: 2,
      events: [event(2)],
    });

    const retry = await append();

    expect(retry.kind).toBe('duplicate-command');
  });

  it('refuses a batch whose expected revision is stale', async () => {
    await append();

    // Contiguous from the STALE expectation on purpose: a batch that
    // is ALSO non-contiguous would be refused for that instead, and the
    // revision check would never be reached.
    const stale = await append({
      commandId: 'cmd-other',
      expectedRevision: 0,
      events: [event(0), event(1)],
    });

    expect(stale.kind).toBe('revision-conflict');
    expect(stale.kind === 'revision-conflict' && stale.actualRevision).toBe(2);
    expect(await store.getEvents(MATCH_ID)).toHaveLength(2);
  });

  it('throws for a match that does not exist', async () => {
    await expect(
      store.appendCommandBatch!('match-absent', batch()),
    ).rejects.toThrow(MatchNotFoundError);
  });

  it('carries the expected post-state digest onto the receipt', async () => {
    // Stored WITH the receipt so a later apply can be checked against
    // what the author intended, rather than confirming itself.
    const result = await append({ expectedPostStateDigest: 'digest-xyz' });

    expect(
      result.kind === 'committed' && result.receipt.expectedPostStateDigest,
    ).toBe('digest-xyz');
  });
});
