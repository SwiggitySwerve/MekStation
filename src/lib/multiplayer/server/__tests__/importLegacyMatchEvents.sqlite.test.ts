/**
 * SQLite proofs for legacy event import (leaf task 1.3 event-import half).
 *
 * (d) is the crash row: a well-formed import that fails PARTWAY through
 * the insert loop must leave nothing a reader can treat as complete, and
 * a retry must succeed. (e) is the control: journal-native
 * appendCommandBatch after an import continues at the next revision and
 * the contiguity guard still fires.
 *
 * The bulk path's own guards — global event-id uniqueness — live here
 * too, because they only exist as a database constraint.
 */

import {
  GameEventType,
  GamePhase,
  type IGameEvent,
} from '@/types/gameplay/GameSessionInterfaces';

import type { IMatchAuthorityBaseline } from '../matchAuthorityBaseline';

import { DurableMatchStore } from '../DurableMatchStore';
import { type IMatchMeta } from '../IMatchStore';
import { IMPORTED_LEGACY_SOURCE_KIND } from '../importLegacyMatchEvents';

const MATCH_ID = 'match-import';
const NOW = '2026-08-28T00:00:00.000Z';
const SOURCE = { formatId: 'mp-match-events', formatVersion: 1 };

function makeMeta(matchId: string): IMatchMeta {
  const now = new Date().toISOString();
  return {
    matchId,
    hostPlayerId: 'p1',
    playerIds: ['p1', 'p2'],
    sideAssignments: [
      { playerId: 'p1', side: 'player' },
      { playerId: 'p2', side: 'opponent' },
    ],
    status: 'active',
    createdAt: now,
    updatedAt: now,
    config: { mapRadius: 8, turnLimit: 20 },
  };
}

function makeEvent(matchId: string, sequence: number): IGameEvent {
  return {
    id: `evt-${matchId}-${sequence}`,
    gameId: matchId,
    sequence,
    timestamp: '3025-01-01T00:00:00.000Z',
    type: GameEventType.PhaseChanged,
    turn: 1,
    phase: GamePhase.Initiative,
    payload: {} as never,
  } as IGameEvent;
}

function makeBaseline(
  matchId: string,
  retained: readonly IGameEvent[],
): IMatchAuthorityBaseline {
  const first = retained[0]?.sequence ?? 0;
  const last = retained[retained.length - 1]?.sequence ?? 0;
  return {
    streamType: 'match',
    streamId: matchId,
    branchId: 'main',
    revision: last,
    digest: 'digest',
    effectiveGeneration: 1,
    source: first === 0 ? 'retained-log' : 'legacy-baseline',
    firstRetainedRevision: first,
    importedAt: NOW,
  };
}

describe('importLegacyMatchEvents sqlite', () => {
  let store: DurableMatchStore;

  beforeEach(async () => {
    store = new DurableMatchStore({ path: ':memory:' });
    await store.createMatch(makeMeta(MATCH_ID));
  });

  afterEach(() => {
    store.close();
  });

  it('(d) an injected failure mid-import leaves no partial state and a retry succeeds', async () => {
    // MUTATION M3: drop the transaction around the insert loop (or skip
    // the completion marker). This row then sees the first event survive
    // and the retry fail to land cleanly.
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const poisoned = makeEvent(MATCH_ID, 1);
    (poisoned as { payload: unknown }).payload = circular;

    const retained = [makeEvent(MATCH_ID, 0), poisoned];
    expect(() =>
      store.importLegacyEvents({
        matchId: MATCH_ID,
        retained,
        baseline: makeBaseline(MATCH_ID, [
          makeEvent(MATCH_ID, 0),
          makeEvent(MATCH_ID, 1),
        ]),
        source: SOURCE,
        nowIso: () => NOW,
      }),
    ).toThrow();

    expect(await store.getEvents(MATCH_ID, 0)).toHaveLength(0);
    expect(store.getLegacyImportMarker(MATCH_ID)).toBeNull();

    const retry = store.importLegacyEvents({
      matchId: MATCH_ID,
      retained: [makeEvent(MATCH_ID, 0), makeEvent(MATCH_ID, 1)],
      baseline: makeBaseline(MATCH_ID, [
        makeEvent(MATCH_ID, 0),
        makeEvent(MATCH_ID, 1),
      ]),
      source: SOURCE,
      nowIso: () => NOW,
    });
    expect(retry.kind).toBe('imported');
    expect(await store.getEvents(MATCH_ID, 0)).toHaveLength(2);
    expect(store.getLegacyImportMarker(MATCH_ID)?.eventCount).toBe(2);
  });

  it('(e) journal-native appends after import continue at the next revision', async () => {
    const retained = [makeEvent(MATCH_ID, 5), makeEvent(MATCH_ID, 6)];
    const imported = store.importLegacyEvents({
      matchId: MATCH_ID,
      retained,
      baseline: makeBaseline(MATCH_ID, retained),
      source: SOURCE,
      nowIso: () => NOW,
    });
    expect(imported.kind).toBe('imported');
    expect(await store.getEvents(MATCH_ID, 0)).toHaveLength(2);

    const native = await store.appendCommandBatch(MATCH_ID, {
      commandId: 'cmd-native',
      actorId: 'p1',
      expectedRevision: 7,
      events: [makeEvent(MATCH_ID, 7)],
    });
    expect(native.kind).toBe('committed');
    expect(await store.getEvents(MATCH_ID, 0)).toHaveLength(3);

    const skipped = await store.appendCommandBatch(MATCH_ID, {
      commandId: 'cmd-skip',
      actorId: 'p1',
      expectedRevision: 8,
      events: [makeEvent(MATCH_ID, 8), makeEvent(MATCH_ID, 10)],
    });
    expect(skipped.kind).toBe('non-contiguous');
    expect(await store.getEvents(MATCH_ID, 0)).toHaveLength(3);
  });

  it('refuses a reused event id across matches rather than silently sharing identity', async () => {
    const first = [makeEvent(MATCH_ID, 0)];
    expect(
      store.importLegacyEvents({
        matchId: MATCH_ID,
        retained: first,
        baseline: makeBaseline(MATCH_ID, first),
        source: SOURCE,
        nowIso: () => NOW,
      }).kind,
    ).toBe('imported');

    await store.createMatch(makeMeta('match-other'));
    const colliding = makeEvent('match-other', 0);
    (colliding as { id: string }).id = first[0].id;

    expect(() =>
      store.importLegacyEvents({
        matchId: 'match-other',
        retained: [colliding],
        baseline: makeBaseline('match-other', [colliding]),
        source: SOURCE,
        nowIso: () => NOW,
      }),
    ).toThrow();
    expect(await store.getEvents('match-other', 0)).toHaveLength(0);
    expect(store.getLegacyImportMarker('match-other')).toBeNull();
  });

  it('round-trips imported source identities next to the events', async () => {
    const retained = [makeEvent(MATCH_ID, 0), makeEvent(MATCH_ID, 1)];
    store.importLegacyEvents({
      matchId: MATCH_ID,
      retained,
      baseline: makeBaseline(MATCH_ID, retained),
      source: SOURCE,
      nowIso: () => NOW,
    });

    const sources = store.getImportedEventSources(MATCH_ID);
    expect(sources.map((row) => row.sequence)).toEqual([0, 1]);
    expect(
      sources.every((row) => row.sourceKind === IMPORTED_LEGACY_SOURCE_KIND),
    ).toBe(true);
    expect(sources[0].eventId).toBe(retained[0].id);
  });
});
