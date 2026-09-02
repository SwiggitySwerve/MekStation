import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { SQLiteService } from '@/services/persistence/SQLiteService';

import type {
  EventHistoryBranchErrorCode,
  IEventHistoryBranch,
} from '../EventHistoryBranchContract';
import type {
  IBranchEventView,
  IBranchSegmentReader,
} from '../EventHistoryBranchResolver';

import {
  EVENT_HISTORY_GENESIS_DIGEST,
  EventHistoryBranchError,
  _branchCreationSeamForTests,
} from '../EventHistoryBranchContract';
import {
  journalBranchSegmentReader,
  materializeBranchPath,
  readEntityHistoryAtHead,
  resolveBranchPath,
} from '../EventHistoryBranchResolver';
import { SQLiteEventHistoryBranchStore } from '../SQLiteEventHistoryBranchStore';
import { SQLiteEventJournal } from '../SQLiteEventJournal';

const STREAM = { streamType: 'match', streamId: 'stream-1' } as const;
const DIGEST_A = 'a'.repeat(64);

/**
 * Deterministic 64-hex digest standing in for one event's identity. Hex
 * because the schema's digest CHECK is real: a stand-in that was not hex
 * would be rejected before the resolver ever saw it.
 */
function eventDigest(branchId: string, revision: number): string {
  let hex = '';
  for (const character of `${branchId}#${revision}`) {
    hex += character.charCodeAt(0).toString(16).padStart(2, '0');
  }
  return hex.padEnd(64, '0').slice(0, 64);
}

function view(
  branchId: string,
  revision: number,
  previousDigest: string | null,
  entity: string | null = null,
): IBranchEventView {
  return {
    eventId: `${branchId}#${revision}`,
    branchId,
    streamRevision: revision,
    eventVersion: 1,
    previousStreamEventDigest: previousDigest,
    eventDigest: eventDigest(branchId, revision),
    entityRefs:
      entity === null
        ? []
        : [{ entityType: 'unit', entityId: entity, role: 'subject' }],
  };
}

/**
 * The root carries revisions 1..4; a candidate branches at revision 2 and
 * carries 3..4 of its own. Both histories are complete and chained, so a
 * resolver that silently substituted the effective head for the prior one
 * would still return four events - just the wrong four.
 */
function completeHistory(): readonly IBranchEventView[] {
  return [
    view('root', 1, null, 'unit-a'),
    view('root', 2, eventDigest('root', 1), 'unit-b'),
    view('root', 3, eventDigest('root', 2), 'unit-a'),
    view('root', 4, eventDigest('root', 3), 'unit-a'),
    view('candidate-1', 3, eventDigest('root', 2), 'unit-a'),
    view('candidate-1', 4, eventDigest('candidate-1', 3), 'unit-c'),
  ];
}

function readerOver(events: readonly IBranchEventView[]): IBranchSegmentReader {
  return {
    read: async (_stream, segment) =>
      events.filter(
        (event) =>
          event.branchId === segment.branchId &&
          event.streamRevision > segment.fromRevision &&
          event.streamRevision <= segment.throughRevision,
      ),
  };
}

async function codeOf(
  run: () => Promise<unknown>,
): Promise<EventHistoryBranchErrorCode | 'no-throw'> {
  try {
    await run();
  } catch (error) {
    if (error instanceof EventHistoryBranchError) return error.code;
    throw error;
  }
  return 'no-throw';
}

describe('EventHistoryBranchResolver', () => {
  let dir: string;
  let service: SQLiteService;
  let db: Database.Database;
  let store: SQLiteEventHistoryBranchStore;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'event-history-resolver-'));
    service = new SQLiteService({ path: path.join(dir, 'branches.db') });
    service.initialize();
    db = service.getDatabase();
    db.prepare(
      `INSERT INTO event_journal_stream_heads
         (stream_type, stream_id, branch_id, stream_revision, event_digest)
       VALUES ('match', 'stream-1', 'root', 4, ?)`,
    ).run(DIGEST_A);
    store = new SQLiteEventHistoryBranchStore(
      db,
      _branchCreationSeamForTests(),
    );
    store.backfillGenesisBranches();
  });

  afterEach(async () => {
    service.close();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  function candidate(
    overrides: Partial<IEventHistoryBranch> = {},
  ): IEventHistoryBranch {
    return {
      ...STREAM,
      branchId: 'candidate-1',
      parentBranchId: 'root',
      ancestorDepth: 1,
      baseRevision: 2,
      baseEventId: 'root#2',
      baseDigest: eventDigest('root', 2),
      status: 'building',
      createdBy: 'gm-1',
      reason: 'authorized rewind',
      createdAt: '2026-09-02T00:00:00.000Z',
      ...overrides,
    };
  }

  it('resolves the root as a single suffix anchored at genesis', () => {
    expect(resolveBranchPath(store, STREAM, 'root', 4)).toEqual({
      ...STREAM,
      branchId: 'root',
      revision: 4,
      segments: [
        {
          kind: 'suffix',
          branchId: 'root',
          fromRevision: 0,
          throughRevision: 4,
          baseEventId: null,
          baseDigest: EVENT_HISTORY_GENESIS_DIGEST,
        },
      ],
    });
  });

  it('resolves a child as verified parent prefix plus contiguous child suffix', () => {
    store.createBranch(candidate());
    expect(resolveBranchPath(store, STREAM, 'candidate-1', 4)).toEqual({
      ...STREAM,
      branchId: 'candidate-1',
      revision: 4,
      segments: [
        {
          kind: 'prefix',
          branchId: 'root',
          fromRevision: 0,
          throughRevision: 2,
          baseEventId: null,
          baseDigest: EVENT_HISTORY_GENESIS_DIGEST,
        },
        {
          kind: 'suffix',
          branchId: 'candidate-1',
          fromRevision: 2,
          throughRevision: 4,
          baseEventId: 'root#2',
          baseDigest: eventDigest('root', 2),
        },
      ],
    });
  });

  it('materializes the prior head without substituting the effective one', async () => {
    store.createBranch(candidate());
    const reader = readerOver(completeHistory());

    const priorHead = resolveBranchPath(store, STREAM, 'root', 4);
    const priorEvents = await materializeBranchPath(reader, priorHead);
    expect(priorEvents.map((event) => event.eventId)).toEqual([
      'root#1',
      'root#2',
      'root#3',
      'root#4',
    ]);

    // The candidate is a DIFFERENT four-event history over the same
    // revisions. Asking for one must never answer with the other.
    const candidateHead = resolveBranchPath(store, STREAM, 'candidate-1', 4);
    expect(
      (await materializeBranchPath(reader, candidateHead)).map(
        (e) => e.eventId,
      ),
    ).toEqual(['root#1', 'root#2', 'candidate-1#3', 'candidate-1#4']);

    // An explicit earlier revision on the effective branch is a prior head
    // too, and truncates rather than reaching forward.
    const truncated = resolveBranchPath(store, STREAM, 'root', 2);
    expect(
      (await materializeBranchPath(reader, truncated)).map((e) => e.eventId),
    ).toEqual(['root#1', 'root#2']);
  });

  it('proves entity history at a prior head', async () => {
    store.createBranch(candidate());
    const reader = readerOver(completeHistory());
    const at = (branchId: string, revision: number) =>
      resolveBranchPath(store, STREAM, branchId, revision);

    // unit-a appears three times on the root and twice on the candidate:
    // the entity's history is a property of the head you ask at.
    expect(
      (
        await readEntityHistoryAtHead(reader, at('root', 4), {
          entityType: 'unit',
          entityId: 'unit-a',
        })
      ).map((event) => event.eventId),
    ).toEqual(['root#1', 'root#3', 'root#4']);
    expect(
      (
        await readEntityHistoryAtHead(reader, at('candidate-1', 4), {
          entityType: 'unit',
          entityId: 'unit-a',
        })
      ).map((event) => event.eventId),
    ).toEqual(['root#1', 'candidate-1#3']);
    // unit-c exists only on the candidate.
    expect(
      await readEntityHistoryAtHead(reader, at('root', 4), {
        entityType: 'unit',
        entityId: 'unit-c',
      }),
    ).toEqual([]);
    // The role filter narrows within a head rather than across heads.
    expect(
      await readEntityHistoryAtHead(reader, at('root', 4), {
        entityType: 'unit',
        entityId: 'unit-a',
        role: 'target',
      }),
    ).toEqual([]);
  });

  it('refuses an unresolvable or out-of-range head', () => {
    expect(() => resolveBranchPath(store, STREAM, 'ghost', 1)).toThrow(
      EventHistoryBranchError,
    );
    store.createBranch(candidate());
    // A revision at or below the branch's own base is not on this branch.
    expect(() =>
      resolveBranchPath(store, STREAM, 'candidate-1', 2),
    ).not.toThrow();
    expect(() => resolveBranchPath(store, STREAM, 'candidate-1', 1)).toThrow(
      /precedes/,
    );
    expect(() => resolveBranchPath(store, STREAM, 'root', -1)).toThrow(
      /non-negative/,
    );
  });

  it('resolves and proves entity history over the real SQLite journal', async () => {
    // The production adapter, against real stored events rather than a
    // hand-built view: the digest chain, revisions, and entity refs it
    // verifies are the ones the writer actually produced.
    const journal = new SQLiteEventJournal<{ value: string }>(
      db,
      () => '2026-09-02T00:00:00.000Z',
    );
    const appended = await journal.append({
      streamType: 'match',
      streamId: 'journal-stream',
      expectedBranchId: 'root',
      expectedRevision: 0,
      commandId: 'command-1',
      principal: {
        actorKind: 'human',
        actorId: 'player-1',
        authorityType: 'host',
        authorityId: 'host-1',
      },
      events: [1, 2, 3].map((index) => ({
        eventId: `journal-event-${index}`,
        eventType: 'TestEvent',
        eventVersion: 1,
        correlationId: 'correlation-1',
        causationEventIds: [],
        occurredAt: '2026-09-02T00:00:00.000Z',
        payload: { value: `value-${index}` },
        entityRefs:
          index === 2
            ? [{ entityType: 'unit', entityId: 'unit-b', role: 'subject' }]
            : [{ entityType: 'unit', entityId: 'unit-a', role: 'subject' }],
      })),
    });
    expect(appended.kind).toBe('committed');
    expect(store.backfillGenesisBranches()).toBe(1);

    const journalStream = { streamType: 'match', streamId: 'journal-stream' };
    const reader = journalBranchSegmentReader(journal);
    const head = resolveBranchPath(store, journalStream, 'root', 3);
    expect(
      (await materializeBranchPath(reader, head)).map((e) => e.eventId),
    ).toEqual(['journal-event-1', 'journal-event-2', 'journal-event-3']);
    // A prior head truncates against the real store, and entity history
    // follows that head rather than the current tail.
    expect(
      (
        await readEntityHistoryAtHead(
          reader,
          resolveBranchPath(store, journalStream, 'root', 2),
          { entityType: 'unit', entityId: 'unit-a' },
        )
      ).map((e) => e.eventId),
    ).toEqual(['journal-event-1']);
    // The journal holds one branch; asking it for another is refused, not
    // answered with root events under a candidate's name.
    expect(
      await codeOf(() =>
        reader.read(journalStream, {
          kind: 'suffix',
          branchId: 'candidate-1',
          fromRevision: 0,
          throughRevision: 3,
          baseEventId: null,
          baseDigest: EVENT_HISTORY_GENESIS_DIGEST,
        }),
      ),
    ).toBe('unknown-branch');
  });

  it('quarantines a gap, a wrong base, or a broken digest chain', async () => {
    store.createBranch(candidate());
    const head = resolveBranchPath(store, STREAM, 'candidate-1', 4);
    const complete = completeHistory();

    // Missing revision inside the child suffix.
    expect(
      await codeOf(() =>
        materializeBranchPath(
          readerOver(complete.filter((e) => e.eventId !== 'candidate-1#3')),
          head,
        ),
      ),
    ).toBe('branch-integrity');

    // The child anchors to a base event that is not what the parent
    // actually holds at that revision.
    expect(
      await codeOf(() =>
        materializeBranchPath(
          readerOver(
            complete.map((e) =>
              e.eventId === 'root#2' ? { ...e, eventId: 'root#2-other' } : e,
            ),
          ),
          head,
        ),
      ),
    ).toBe('branch-integrity');

    // Broken digest linkage across the parent/child boundary.
    expect(
      await codeOf(() =>
        materializeBranchPath(
          readerOver(
            complete.map((e) =>
              e.eventId === 'candidate-1#3'
                ? { ...e, previousStreamEventDigest: eventDigest('root', 1) }
                : e,
            ),
          ),
          head,
        ),
      ),
    ).toBe('branch-integrity');

    // A root prefix whose first event claims a predecessor.
    expect(
      await codeOf(() =>
        materializeBranchPath(
          readerOver(
            complete.map((e) =>
              e.eventId === 'root#1'
                ? { ...e, previousStreamEventDigest: DIGEST_A }
                : e,
            ),
          ),
          head,
        ),
      ),
    ).toBe('branch-integrity');

    // An event schema version that is not a positive safe integer.
    expect(
      await codeOf(() =>
        materializeBranchPath(
          readerOver(
            complete.map((e) =>
              e.eventId === 'root#1' ? { ...e, eventVersion: 0 } : e,
            ),
          ),
          head,
        ),
      ),
    ).toBe('branch-integrity');

    // A reader that answers with another branch's events.
    expect(
      await codeOf(() =>
        materializeBranchPath(
          {
            read: async () => [view('elsewhere', 1, null)],
          },
          head,
        ),
      ),
    ).toBe('branch-integrity');

    // The complete history still resolves, so the checks above are not
    // rejecting everything.
    await expect(
      materializeBranchPath(readerOver(complete), head),
    ).resolves.toHaveLength(4);
  });
});
