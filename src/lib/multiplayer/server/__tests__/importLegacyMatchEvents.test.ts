/**
 * Legacy event import into the match journal (leaf task 1.3 event-import
 * half; design D4).
 *
 * The baseline tuple already records what the retained log CONTAINS.
 * This half copies the retained events themselves, with a source label
 * that distinguishes them from journal-native appends, and without
 * inventing anything the log does not actually carry.
 *
 * Rows (a)–(c) are the pure-function proofs. (d) atomicity and (e)
 * post-import appendCommandBatch live in the sqlite companion, because
 * a transaction that is not a real SQLite transaction cannot fail the
 * way the crash row needs.
 */

import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';

import type { IMatchAuthorityBaseline } from '../matchAuthorityBaseline';

import {
  IMPORTED_LEGACY_SOURCE_KIND,
  importLegacyMatchEvents,
  type IImportedLegacyEvent,
  type ILegacyEventImportStore,
  type ILegacyImportMarker,
} from '../importLegacyMatchEvents';

function event(sequence: number, type = 'UnitMoved'): IGameEvent {
  return {
    id: `evt-${sequence}`,
    sequence,
    type,
  } as unknown as IGameEvent;
}

function baseline(
  overrides: Partial<IMatchAuthorityBaseline> = {},
): IMatchAuthorityBaseline {
  return {
    streamType: 'match',
    streamId: 'match-1',
    branchId: 'main',
    revision: 2,
    digest: 'digest',
    effectiveGeneration: 1,
    source: 'retained-log',
    firstRetainedRevision: 0,
    importedAt: NOW,
    ...overrides,
  };
}

/** In-memory store that can duplicate — the PK lives in SQLite, not here. */
function memoryStore() {
  const events: IImportedLegacyEvent[] = [];
  let marker: ILegacyImportMarker | null = null;
  const store: ILegacyEventImportStore = {
    readMarker: () => marker,
    runImport: (work) => work(),
    insertImportedEvent: (_matchId, row) => {
      events.push(row);
    },
    insertMarker: (next) => {
      marker = next;
    },
  };
  return {
    events,
    get marker() {
      return marker;
    },
    store,
  };
}

const NOW = '2026-08-28T00:00:00.000Z';
const SOURCE = { formatId: 'mp-match-events', formatVersion: 1 };

describe('importLegacyMatchEvents', () => {
  it('(a) copies a retained log of N events with source identities, in order', () => {
    const { events, store } = memoryStore();
    const retained = [event(0), event(1), event(2)];

    const result = importLegacyMatchEvents({
      matchId: 'match-1',
      retained,
      baseline: baseline({ revision: 2, firstRetainedRevision: 0 }),
      source: SOURCE,
      store,
      nowIso: () => NOW,
    });

    expect(result.kind).toBe('imported');
    expect(events.map((row) => row.event.sequence)).toEqual([0, 1, 2]);
    expect(events).toHaveLength(3);
    for (const row of events) {
      expect(row.source.kind).toBe(IMPORTED_LEGACY_SOURCE_KIND);
      expect(row.source.formatId).toBe(SOURCE.formatId);
      expect(row.source.formatVersion).toBe(SOURCE.formatVersion);
      expect(row.source.evidenceDigest).toMatch(/^[0-9a-f]{64}$/);
    }
    expect(result.kind === 'imported' && result.marker).toEqual({
      matchId: 'match-1',
      firstRevision: 0,
      lastRevision: 2,
      eventCount: 3,
      sourceLabel: IMPORTED_LEGACY_SOURCE_KIND,
      importedAt: NOW,
    });
  });

  it('(b) second import of the same log is already-imported and does not duplicate', () => {
    // MUTATION M1: remove the already-imported marker check. This row
    // then sees a doubled count, because the memory store appends.
    const { events, store } = memoryStore();
    const retained = [event(0), event(1)];
    const deps = {
      matchId: 'match-1',
      retained,
      baseline: baseline({ revision: 1, firstRetainedRevision: 0 }),
      source: SOURCE,
      store,
      nowIso: () => NOW,
    };

    const first = importLegacyMatchEvents(deps);
    const second = importLegacyMatchEvents(deps);

    expect(events).toHaveLength(2);
    expect(first.kind).toBe('imported');
    expect(second.kind).toBe('already-imported');
    expect(second.kind === 'already-imported' && second.marker).toEqual(
      first.kind === 'imported' ? first.marker : null,
    );
  });

  it('(c) a missing prefix stays missing: import writes K.. and nothing before', () => {
    // MUTATION M2: make the import backfill from 0. This row then sees
    // sequences below K, which are events nobody committed.
    const { events, store } = memoryStore();

    const result = importLegacyMatchEvents({
      matchId: 'match-2',
      retained: [event(5), event(6)],
      baseline: baseline({
        streamId: 'match-2',
        revision: 6,
        firstRetainedRevision: 5,
        source: 'legacy-baseline',
      }),
      source: SOURCE,
      store,
      nowIso: () => NOW,
    });

    expect(result.kind).toBe('imported');
    expect(events.map((row) => row.event.sequence)).toEqual([5, 6]);
    expect(events.some((row) => row.event.sequence < 5)).toBe(false);
    expect(result.kind === 'imported' && result.marker.firstRevision).toBe(5);
    expect(result.kind === 'imported' && result.marker.lastRevision).toBe(6);
  });

  it('refuses to invent a prefix boundary when no baseline was recorded', () => {
    const { events, store } = memoryStore();

    const result = importLegacyMatchEvents({
      matchId: 'match-3',
      retained: [event(0)],
      baseline: null,
      source: SOURCE,
      store,
      nowIso: () => NOW,
    });

    expect(result.kind).toBe('no-baseline');
    expect(events).toHaveLength(0);
  });

  it('writes nothing when there is no retained history', () => {
    const { events, store } = memoryStore();

    const result = importLegacyMatchEvents({
      matchId: 'match-4',
      retained: [],
      baseline: baseline({ revision: 0, firstRetainedRevision: 0 }),
      source: SOURCE,
      store,
      nowIso: () => NOW,
    });

    expect(result.kind).toBe('empty-log');
    expect(events).toHaveLength(0);
    expect(store.readMarker('match-4')).toBeNull();
  });
});
