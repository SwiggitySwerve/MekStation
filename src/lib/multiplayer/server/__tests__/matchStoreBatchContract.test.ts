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

import type { IEventHistoryBranch } from '@/lib/events/journal/EventHistoryBranchContract';
import { EventHistoryBranchError } from '@/lib/events/journal/EventHistoryBranchContract';
import type { IParticipantAckAuthorization } from '@/lib/events/storeCapabilityPorts';
import { InMemoryCampaignEventStore } from '@/lib/campaign/sync/InMemoryCampaignEventStore';

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

const STREAM = { streamType: 'match', streamId: 'stream-ports' } as const;
const BOUND_AT = '2026-01-01T00:00:00.000Z';
const REVOKED_AT = '2026-01-01T01:00:00.000Z';

function sampleBranch(): IEventHistoryBranch {
  return {
    streamType: STREAM.streamType,
    streamId: STREAM.streamId,
    branchId: 'branch-1',
    parentBranchId: null,
    ancestorDepth: 0,
    baseRevision: 0,
    baseEventId: null,
    baseDigest: 'digest-unused-while-seam-disabled',
    status: 'building',
    createdBy: 'contract',
    reason: 'prefix-port-contract',
    createdAt: BOUND_AT,
  };
}

function bindInput(
  participantId: string,
  seat: 'gm' | 'player',
): {
  readonly campaignId: string;
  readonly sessionId: string;
  readonly participantId: string;
  readonly seat: 'gm' | 'player';
  readonly boundAt: string;
} {
  return {
    campaignId: 'campaign-ports',
    sessionId: 'session-ports',
    participantId,
    seat,
    boundAt: BOUND_AT,
  };
}

function cursorAuth(): IParticipantAckAuthorization {
  return {
    grant: {
      grantId: 'grant-1',
      campaignId: 'campaign-ports',
      participantId: 'viewer-1',
      active: true,
    },
    viewerAuthorized: true,
    currentEpochId: 'epoch-1',
    highestAssigned: 3,
  };
}

/**
 * In-memory builders only. DurableMatchStore / JournalCampaignEventStore
 * join this describe in the next seam.
 */
const inMemoryPortStores: ReadonlyArray<
  readonly [string, () => InMemoryMatchStore | InMemoryCampaignEventStore]
> = [
  ['InMemoryMatchStore', () => new InMemoryMatchStore({ quiet: true })],
  ['InMemoryCampaignEventStore', () => new InMemoryCampaignEventStore()],
];

describe.each(inMemoryPortStores)(
  '%s optional capability ports',
  (_name, build) => {
    it('exposes the three optional ports', () => {
      const store = build();
      expect(typeof store.readBranch).toBe('function');
      expect(typeof store.bindCampaignSessionParticipant).toBe('function');
      expect(typeof store.readParticipantDeliveryCursor).toBe('function');
    });

    it('readEffectiveHead is null until an effective branch exists', () => {
      expect(build().readEffectiveHead(STREAM)).toBeNull();
    });

    it('requireBranch on an unknown branch throws EventHistoryBranchError unknown-branch', () => {
      expect(() => build().requireBranch(STREAM, 'no-such-branch')).toThrow(
        EventHistoryBranchError,
      );
      try {
        build().requireBranch(STREAM, 'no-such-branch');
        throw new Error('expected EventHistoryBranchError');
      } catch (error) {
        expect(error).toBeInstanceOf(EventHistoryBranchError);
        expect((error as EventHistoryBranchError).code).toBe('unknown-branch');
      }
    });

    it('createBranch honors the disabled production seam', () => {
      expect(() => build().createBranch(sampleBranch())).toThrow(
        EventHistoryBranchError,
      );
      try {
        build().createBranch(sampleBranch());
        throw new Error('expected EventHistoryBranchError');
      } catch (error) {
        expect(error).toBeInstanceOf(EventHistoryBranchError);
        expect((error as EventHistoryBranchError).code).toBe(
          'branch-creation-disabled',
        );
      }
    });

    it('bind then active membership, revoke hides it, isRevoked true', () => {
      const store = build();
      const bound = store.bindCampaignSessionParticipant(bindInput('p1', 'gm'));
      expect(bound.kind).toBe('bound');
      expect(
        store.activeCampaignSessionMembership(
          'campaign-ports',
          'session-ports',
          'p1',
        ),
      ).not.toBeNull();
      // A live seat is not revoked: the predicate must read the timestamp, not the row's existence.
      expect(
        store.isRevokedCampaignSessionParticipant(
          'campaign-ports',
          'session-ports',
          'p1',
        ),
      ).toBe(false);
      expect(
        store.revokeCampaignSessionParticipant({
          campaignId: 'campaign-ports',
          sessionId: 'session-ports',
          participantId: 'p1',
          revokedAt: REVOKED_AT,
        }),
      ).toBe(true);
      expect(
        store.activeCampaignSessionMembership(
          'campaign-ports',
          'session-ports',
          'p1',
        ),
      ).toBeNull();
      expect(
        store.isRevokedCampaignSessionParticipant(
          'campaign-ports',
          'session-ports',
          'p1',
        ),
      ).toBe(true);
    });

    it('a second active GM is gm-seat-taken', () => {
      const store = build();
      expect(store.bindCampaignSessionParticipant(bindInput('gm-1', 'gm')).kind)
        .toBe('bound');
      expect(store.bindCampaignSessionParticipant(bindInput('gm-2', 'gm'))).toEqual(
        { kind: 'gm-seat-taken' },
      );
    });

    it('a third tactical player is tactical-seats-full', () => {
      const store = build();
      expect(
        store.bindCampaignSessionParticipant(bindInput('player-1', 'player'))
          .kind,
      ).toBe('bound');
      expect(
        store.bindCampaignSessionParticipant(bindInput('player-2', 'player'))
          .kind,
      ).toBe('bound');
      expect(
        store.bindCampaignSessionParticipant(bindInput('player-3', 'player')),
      ).toEqual({ kind: 'tactical-seats-full', limit: 2 });
    });

    it('cursor read is null, an identical ack applies then is stale', async () => {
      const store = build();
      const key = {
        campaignId: 'campaign-ports',
        grantId: 'grant-1',
        participantId: 'viewer-1',
      };
      expect(store.readParticipantDeliveryCursor(key)).toBeNull();
      const request = {
        principal: { principalId: 'viewer-1' },
        grantId: 'grant-1',
        deliveryEpochId: 'epoch-1',
        ackedSequence: 1,
      };
      const authorization = cursorAuth();
      const applied = await store.recordParticipantAcknowledgement(
        request,
        authorization,
        BOUND_AT,
      );
      expect(applied.kind).toBe('applied');
      const stale = await store.recordParticipantAcknowledgement(
        request,
        authorization,
        BOUND_AT,
      );
      expect(stale.kind).toBe('stale');
    });

    it('an ack past highestAssigned is gap', async () => {
      const store = build();
      const gap = await store.recordParticipantAcknowledgement(
        {
          principal: { principalId: 'viewer-1' },
          grantId: 'grant-1',
          deliveryEpochId: 'epoch-1',
          ackedSequence: 9,
        },
        cursorAuth(),
        BOUND_AT,
      );
      expect(gap).toEqual({ kind: 'gap', highestAssigned: 3 });
    });
  },
);
