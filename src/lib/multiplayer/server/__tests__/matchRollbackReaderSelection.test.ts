import {
  GameEventType,
  GamePhase,
  type IGameEvent,
} from '@/types/gameplay/GameSessionInterfaces';

import type { IMatchMeta } from '../IMatchStore';
import type {
  IMatchJournalAuthorityHead,
  IMatchJournalAuthorityStarted,
} from '../matchJournalAuthority';

import { DurableMatchStore } from '../DurableMatchStore';
import {
  MATCH_ROLLBACK_PRESERVED_FACTS,
  selectMatchRollbackReader,
  type IMatchRollbackReaderHead,
  type IMatchRollbackReaderFacts,
} from '../matchRollbackReaderSelection';

const MATCH_ID = 'rollback-reader-match';
const SUPPORTED_GENERATION = 1;

interface IStartedFact {
  readonly matchId: string;
  readonly commandId: string;
  readonly firstRevision: number;
  readonly lastRevision: number;
  readonly head: IMatchRollbackReaderHead;
  readonly committedAt: string;
}

function head(
  overrides: Partial<IMatchRollbackReaderHead> = {},
): IMatchRollbackReaderHead {
  return {
    streamType: 'match',
    streamId: MATCH_ID,
    branchId: 'main',
    revision: 4,
    digest: 'active-digest',
    effectiveGeneration: SUPPORTED_GENERATION,
    ...overrides,
  };
}

function started(overrides: Partial<IStartedFact> = {}): IStartedFact {
  return {
    matchId: MATCH_ID,
    commandId: 'command-1',
    firstRevision: 3,
    lastRevision: 4,
    head: {
      streamType: 'match',
      streamId: MATCH_ID,
      branchId: 'main',
      revision: 4,
      digest: 'active-digest',
      effectiveGeneration: SUPPORTED_GENERATION,
    },
    committedAt: '2026-08-29T00:00:00.000Z',
    ...overrides,
  };
}

function facts(
  overrides: Partial<IMatchRollbackReaderFacts> = {},
): IMatchRollbackReaderFacts {
  return {
    baseline: null,
    started: null,
    recordedHead: head(),
    refoldedHead: head(),
    supportedEffectiveGeneration: SUPPORTED_GENERATION,
    ...overrides,
  };
}

describe('selectMatchRollbackReader', () => {
  it('allows the compatible legacy reader for a pre-cutover match', () => {
    expect(selectMatchRollbackReader(facts())).toEqual({
      kind: 'legacy-compatible',
    });
  });

  it('allows the compatible legacy reader when the active head exactly equals the baseline', () => {
    const baseline = head();

    expect(selectMatchRollbackReader(facts({ baseline }))).toEqual({
      kind: 'legacy-compatible',
    });
  });

  it.each([
    ['streamType', head({ streamType: 'other' })],
    ['streamId', head({ streamId: 'other-match' })],
    ['branchId', head({ branchId: 'other-branch' })],
    ['revision', head({ revision: 5 })],
    ['digest', head({ digest: 'other-digest' })],
    ['effectiveGeneration', head({ effectiveGeneration: 2 })],
  ])(
    'refuses legacy when baseline %s differs by one field',
    (_field, baseline) => {
      const decision = selectMatchRollbackReader(facts({ baseline }));

      expect(decision.kind).not.toBe('legacy-compatible');
    },
  );

  it('selects the journal reader when a started fact and refolded head reproduce the recorded active head', () => {
    const active = head();

    expect(
      selectMatchRollbackReader(
        facts({
          started: started({ head: active }),
          recordedHead: active,
          refoldedHead: active,
        }),
      ),
    ).toEqual({ kind: 'journal-compatible', head: active });
  });

  it('blocks and names every retained fact when refolding changes the recorded digest', () => {
    const active = head();
    const decision = selectMatchRollbackReader(
      facts({
        started: started({ head: active }),
        recordedHead: active,
        refoldedHead: head({ digest: 'refolded-digest' }),
      }),
    );

    expect(decision).toEqual({
      kind: 'blocked',
      reason: 'digest-mismatch',
      preserved: MATCH_ROLLBACK_PRESERVED_FACTS,
    });
  });

  it('blocks an unsupported effective generation without choosing legacy', () => {
    const unsupported = head({ effectiveGeneration: 2 });
    const decision = selectMatchRollbackReader(
      facts({
        started: started({ head: unsupported }),
        recordedHead: unsupported,
        refoldedHead: unsupported,
      }),
    );

    expect(decision).toEqual({
      kind: 'blocked',
      reason: 'unsupported-effective-generation',
      preserved: MATCH_ROLLBACK_PRESERVED_FACTS,
    });
  });

  it('blocks a started match when its journal rows cannot provide a head', () => {
    expect(
      selectMatchRollbackReader(
        facts({ started: started(), recordedHead: null, refoldedHead: null }),
      ),
    ).toEqual({
      kind: 'blocked',
      reason: 'missing-journal-head',
      preserved: MATCH_ROLLBACK_PRESERVED_FACTS,
    });
  });

  it('does not mutate durable rows, receipts, head facts, delivery rows, or recovery metadata during selection', async () => {
    const store = new DurableMatchStore({ path: ':memory:' });
    const matchId = 'rollback-reader-preservation';
    const active: IMatchJournalAuthorityHead = {
      streamType: 'match',
      streamId: matchId,
      branchId: 'main',
      revision: 4,
      digest: 'durable-head',
      effectiveGeneration: 1,
    };
    const firstStarted: IMatchJournalAuthorityStarted = {
      matchId,
      commandId: 'command-1',
      firstRevision: 3,
      lastRevision: 4,
      head: active,
      committedAt: '2026-08-29T00:00:00.000Z',
    };
    const meta: IMatchMeta = {
      matchId,
      hostPlayerId: 'p1',
      playerIds: ['p1', 'p2'],
      sideAssignments: [
        { playerId: 'p1', side: 'player' },
        { playerId: 'p2', side: 'opponent' },
      ],
      status: 'active',
      createdAt: '2026-08-29T00:00:00.000Z',
      updatedAt: '2026-08-29T00:00:00.000Z',
      config: { mapRadius: 4, turnLimit: 5 },
    };
    const event = (sequence: number): IGameEvent => ({
      id: `event-${sequence}`,
      gameId: matchId,
      sequence,
      timestamp: '2026-08-29T00:00:00.000Z',
      type: GameEventType.PhaseChanged,
      turn: 1,
      phase: GamePhase.Initiative,
      payload: {} as never,
    });

    try {
      await store.createMatch(meta);
      store.insertJournalAuthorityBaseline(active);
      await store.appendCommandBatch(matchId, {
        commandId: firstStarted.commandId,
        actorId: 'p1',
        expectedRevision: 0,
        events: [event(0), event(1), event(2), event(3), event(4)],
        expectedPostStateDigest: active.digest,
        journalAuthorityStarted: firstStarted,
      });
      await store.appendViewerDeliveryRecord({
        matchId,
        playerId: 'p1',
        deliverySequence: 0,
        authoritySequence: 4,
      });
      const dump = async (): Promise<string> =>
        JSON.stringify({
          rows: await store.getEvents(matchId),
          receipts: [
            await store.getCommandReceipt(matchId, firstStarted.commandId),
            await store.getLastCommandReceipt(matchId),
          ],
          baseline: store.getJournalAuthorityBaseline(matchId),
          started: await store.getJournalAuthorityStarted(matchId),
          deliveries: await store.listViewerDeliveryRecords(matchId),
          recovery: await store.getMatchMeta(matchId),
        });
      const before = await dump();

      expect(
        selectMatchRollbackReader(
          facts({
            baseline: active,
            started: firstStarted,
            recordedHead: active,
            refoldedHead: active,
          }),
        ),
      ).toEqual({ kind: 'journal-compatible', head: active });

      expect(await dump()).toBe(before);
    } finally {
      store.close();
    }
  });
});
