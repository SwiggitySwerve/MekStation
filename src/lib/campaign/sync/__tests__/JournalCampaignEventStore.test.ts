/**
 * Journal-backed campaign event store contract (task 5.1).
 *
 * Pins: `ICampaignEventStore` conformance over the shared journal (order,
 * gap-free reads, fromSeq filter, collision-as-typed-error with an
 * untouched log); atomic multi-event command batches with the expected
 * post-state digest committed on the terminal event; expected-revision race
 * losing cleanly with nothing applied; retry identity via duplicate-command
 * conflict; digest divergence detectability; and real-SQLite restart
 * recovery of the whole envelope. The cutover flag stays disabled — the
 * production factory keeps returning the in-memory store.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D1, D10)
 * @spec openspec/changes/design-campaign-authority-and-sync/specs/coop-campaign-sync/spec.md
 */

import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { ICampaignEvent } from '@/types/campaign/CampaignSync';

import { InMemoryEventJournal } from '@/lib/events/journal/InMemoryEventJournal';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import { EVENT_JOURNAL_MIGRATION } from '@/services/persistence/SQLiteService.eventJournal.migration';

import { CampaignEventSequenceCollisionError } from '../ICampaignEventStore';
import { InMemoryCampaignEventStore } from '../InMemoryCampaignEventStore';
import {
  appendCampaignCommandBatch,
  CAMPAIGN_JOURNAL_AUTHORITY_ENABLED,
  computeCampaignStateDigest,
  createDefaultCampaignEventStore,
  JournalCampaignEventStore,
  type ICampaignJournalEnvelope,
} from '../JournalCampaignEventStore';

const NOW = '3025-01-03T00:00:00.000Z';

function campaignEvent(
  sequence: number,
  type: ICampaignEvent['type'] = 'CampaignDayAdvanced',
  payload: unknown = { newDay: sequence + 1 },
): ICampaignEvent {
  return {
    sequence,
    campaignId: 'campaign-journal',
    ts: NOW,
    authorPlayerId: 'pid-host',
    type,
    payload,
  } as ICampaignEvent;
}

function hireBatch(fromSequence: number): readonly ICampaignEvent[] {
  return [
    campaignEvent(fromSequence, 'FundsChanged', {
      delta: -150_000,
      reason: 'hire',
      balance: 4_850_000,
    }),
    campaignEvent(fromSequence + 1, 'PilotHired', {
      pilot: { pilotId: 'pilot-1', name: 'Natasha Kerensky' },
      cost: 150_000,
    }),
  ];
}

describe('JournalCampaignEventStore (in-memory journal)', () => {
  let journal: InMemoryEventJournal<ICampaignJournalEnvelope>;
  let store: JournalCampaignEventStore;

  beforeEach(() => {
    journal = new InMemoryEventJournal<ICampaignJournalEnvelope>(() => NOW);
    store = new JournalCampaignEventStore(journal);
  });

  it('conforms to the ICampaignEventStore read/write contract', async () => {
    expect(await store.highestSequence('campaign-journal')).toBe(-1);
    expect(await store.getEvents('campaign-journal')).toEqual([]);

    await store.appendEvent('campaign-journal', campaignEvent(0));
    await store.appendEvent('campaign-journal', campaignEvent(1));
    await store.appendEvent('campaign-journal', campaignEvent(2));

    const all = await store.getEvents('campaign-journal');
    expect(all.map((event) => event.sequence)).toEqual([0, 1, 2]);
    expect(all[1]).toEqual(campaignEvent(1));
    expect(
      (await store.getEvents('campaign-journal', 2)).map((e) => e.sequence),
    ).toEqual([2]);
    expect(await store.highestSequence('campaign-journal')).toBe(2);
    expect(await store.getEvents('campaign-other')).toEqual([]);
  });

  it('matches the in-memory store observable behavior on the same script', async () => {
    const reference = new InMemoryCampaignEventStore();
    for (const target of [store, reference]) {
      await target.appendEvent('campaign-journal', campaignEvent(0));
      await target.appendEvent('campaign-journal', campaignEvent(1));
    }
    expect(await store.getEvents('campaign-journal', 1)).toEqual(
      await reference.getEvents('campaign-journal', 1),
    );
    expect(await store.highestSequence('campaign-journal')).toBe(
      await reference.highestSequence('campaign-journal'),
    );
  });

  it('rejects a sequence collision with the typed error and an untouched log', async () => {
    await store.appendEvent('campaign-journal', campaignEvent(0));
    await expect(
      store.appendEvent(
        'campaign-journal',
        campaignEvent(0, 'FundsChanged', {
          delta: 1,
          reason: 'race',
          balance: 1,
        }),
      ),
    ).rejects.toThrow(CampaignEventSequenceCollisionError);

    const all = await store.getEvents('campaign-journal');
    expect(all).toHaveLength(1);
    expect(all[0].type).toBe('CampaignDayAdvanced');
  });

  it('commits a multi-event command batch atomically with the digest on the terminal event', async () => {
    const digest = computeCampaignStateDigest({
      campaignId: 'campaign-journal',
      day: 0,
      balance: 4_850_000,
      rosterUnits: {},
      pilots: { 'pilot-1': { pilotId: 'pilot-1', name: 'Natasha Kerensky' } },
      contracts: {},
      factionStanding: {},
      salvagePool: 0,
    });
    const result = await appendCampaignCommandBatch(journal, {
      campaignId: 'campaign-journal',
      commandId: 'command-hire-1',
      events: hireBatch(0),
      expectedPostStateDigest: digest,
    });

    expect(result.kind).toBe('committed');
    if (result.kind !== 'committed') return;
    expect(result.receipt.eventCount).toBe(2);
    expect(result.receipt.firstStreamRevision).toBe(1);
    expect(result.receipt.lastStreamRevision).toBe(2);
    expect(result.expectedPostStateDigest).toBe(digest);

    const stored = await journal.readStream({
      streamType: 'campaign',
      streamId: 'campaign-journal',
      branchId: 'root',
      afterRevision: 0,
      limit: 10,
    });
    expect(stored.map((row) => row.payload.expectedPostStateDigest)).toEqual([
      null,
      digest,
    ]);
    expect(
      (await store.getEvents('campaign-journal')).map((e) => e.type),
    ).toEqual(['FundsChanged', 'PilotHired']);
  });

  it('loses an expected-revision race cleanly with nothing applied', async () => {
    const first = await appendCampaignCommandBatch(journal, {
      campaignId: 'campaign-journal',
      commandId: 'command-a',
      events: hireBatch(0),
      expectedPostStateDigest: 'a'.repeat(64),
    });
    expect(first.kind).toBe('committed');

    const loser = await appendCampaignCommandBatch(journal, {
      campaignId: 'campaign-journal',
      commandId: 'command-b',
      events: hireBatch(0),
      expectedPostStateDigest: 'b'.repeat(64),
    });
    expect(loser).toEqual({
      kind: 'sequence-conflict',
      expectedNextSequence: 0,
      actualNextSequence: 2,
    });
    expect(await store.highestSequence('campaign-journal')).toBe(1);
    expect(
      (await store.getEvents('campaign-journal')).every(
        (event) => event.authorPlayerId === 'pid-host',
      ),
    ).toBe(true);
  });

  it('reports a retried command id as duplicate-command without re-applying', async () => {
    await appendCampaignCommandBatch(journal, {
      campaignId: 'campaign-journal',
      commandId: 'command-hire-1',
      events: hireBatch(0),
      expectedPostStateDigest: null,
    });
    const retry = await appendCampaignCommandBatch(journal, {
      campaignId: 'campaign-journal',
      commandId: 'command-hire-1',
      events: hireBatch(2),
      expectedPostStateDigest: null,
    });
    expect(retry).toEqual({
      kind: 'duplicate-command',
      commandId: 'command-hire-1',
    });
    expect(await store.highestSequence('campaign-journal')).toBe(1);
  });

  it('rejects an empty or non-contiguous batch before touching the journal', async () => {
    await expect(
      appendCampaignCommandBatch(journal, {
        campaignId: 'campaign-journal',
        commandId: 'command-empty',
        events: [],
        expectedPostStateDigest: null,
      }),
    ).rejects.toThrow('at least one event');
    await expect(
      appendCampaignCommandBatch(journal, {
        campaignId: 'campaign-journal',
        commandId: 'command-gap',
        events: [campaignEvent(0), campaignEvent(2)],
        expectedPostStateDigest: null,
      }),
    ).rejects.toThrow('contiguous');
    expect(await store.highestSequence('campaign-journal')).toBe(-1);
  });

  it('state digests detect divergence and ignore key order', () => {
    const state = {
      campaignId: 'campaign-journal',
      day: 3,
      balance: 100,
      rosterUnits: {},
      pilots: {},
      contracts: {},
      factionStanding: {},
      salvagePool: 0,
    };
    const reordered = {
      salvagePool: 0,
      factionStanding: {},
      contracts: {},
      pilots: {},
      rosterUnits: {},
      balance: 100,
      day: 3,
      campaignId: 'campaign-journal',
    };
    expect(computeCampaignStateDigest(state)).toBe(
      computeCampaignStateDigest(reordered),
    );
    expect(computeCampaignStateDigest({ ...state, balance: 99 })).not.toBe(
      computeCampaignStateDigest(state),
    );
  });

  it('keeps the production factory on the in-memory store while the flag is disabled', () => {
    expect(CAMPAIGN_JOURNAL_AUTHORITY_ENABLED).toBe(false);
    expect(createDefaultCampaignEventStore({ journal })).toBeInstanceOf(
      InMemoryCampaignEventStore,
    );
    expect(createDefaultCampaignEventStore()).toBeInstanceOf(
      InMemoryCampaignEventStore,
    );
  });
});

describe('JournalCampaignEventStore (real SQLite restart)', () => {
  let directory: string;

  beforeEach(() => {
    directory = mkdtempSync(path.join(tmpdir(), 'campaign-journal-'));
  });
  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  it('recovers the committed batch and digest envelope across a process restart', async () => {
    const file = path.join(directory, 'journal.sqlite');
    const digest = 'c'.repeat(64);

    const db = new Database(file);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.exec(EVENT_JOURNAL_MIGRATION.up);
    const journal = new SQLiteEventJournal<ICampaignJournalEnvelope>(
      db,
      () => NOW,
    );
    const committed = await appendCampaignCommandBatch(journal, {
      campaignId: 'campaign-journal',
      commandId: 'command-hire-1',
      events: hireBatch(0),
      expectedPostStateDigest: digest,
    });
    expect(committed.kind).toBe('committed');
    db.close();

    // Restart: a fresh handle over the same file, no migration re-run.
    const reopened = new Database(file);
    reopened.pragma('foreign_keys = ON');
    const recovered = new SQLiteEventJournal<ICampaignJournalEnvelope>(
      reopened,
      () => NOW,
    );
    const store = new JournalCampaignEventStore(recovered);

    expect(await store.highestSequence('campaign-journal')).toBe(1);
    expect(
      (await store.getEvents('campaign-journal')).map((e) => e.type),
    ).toEqual(['FundsChanged', 'PilotHired']);
    const rows = await recovered.readStream({
      streamType: 'campaign',
      streamId: 'campaign-journal',
      branchId: 'root',
      afterRevision: 0,
      limit: 10,
    });
    expect(rows[1].payload.expectedPostStateDigest).toBe(digest);
    expect(rows[1].previousStreamEventDigest).toBe(rows[0].eventDigest);

    // The recovered head still enforces the expected-revision guard.
    const stale = await appendCampaignCommandBatch(recovered, {
      campaignId: 'campaign-journal',
      commandId: 'command-late',
      events: hireBatch(0),
      expectedPostStateDigest: null,
    });
    expect(stale.kind).toBe('sequence-conflict');
    reopened.close();
  });
});
