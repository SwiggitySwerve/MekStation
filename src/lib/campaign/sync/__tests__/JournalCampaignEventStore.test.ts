/**
 * Journal-backed campaign event store contract (task 5.1).
 *
 * Pins: `ICampaignEventStore` conformance over the shared journal (order,
 * gap-free reads, fromSeq filter, collision-as-typed-error with an
 * untouched log); atomic multi-event command batches with the expected
 * post-state digest committed on the terminal event; expected-revision race
 * losing cleanly with nothing applied; retry identity via duplicate-command
 * conflict; digest divergence detectability; and real-SQLite restart
 * recovery of the whole envelope. The cutover flag is on: the production
 * factory returns the journal store to a caller that passes a journal
 * factory and the in-memory store to one that passes none.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D1, D10)
 * @spec openspec/changes/design-campaign-authority-and-sync/specs/coop-campaign-sync/spec.md
 */

import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { IStoredEvent } from '@/lib/events/journal/EventJournalContract';
import type {
  ICampaignAuthoritativeState,
  ICampaignEvent,
} from '@/types/campaign/CampaignSync';
import type { IContract } from '@/types/campaign/Mission';

import { canonicalizeJsonV1 } from '@/lib/events/journal/EventJournalCanonicalizer';
import { InMemoryEventJournal } from '@/lib/events/journal/InMemoryEventJournal';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import { EVENT_JOURNAL_MIGRATION } from '@/services/persistence/SQLiteService.eventJournal.migration';
import { AtBContractType } from '@/types/campaign/contracts/contractTypes';
import { MissionStatus } from '@/types/campaign/enums/MissionStatus';
import { Money } from '@/types/campaign/Money';
import { createPaymentTerms } from '@/types/campaign/PaymentTerms';
import { AtBMoraleLevel } from '@/types/campaign/scenario/scenarioTypes';

import type { CampaignSourcePrivateReplayReason } from '../../authority/campaignSourcePrivateEnvelope';

import {
  buildCampaignSourcePrivateEnvelope,
  campaignSourcePrivateOf,
  CampaignSourcePrivateReplayError,
  replayCampaignSourceContracts,
} from '../../authority/campaignSourcePrivateEnvelope';
import {
  CampaignEventSequenceCollisionError,
  type ICampaignEventStore,
} from '../ICampaignEventStore';
import { InMemoryCampaignEventStore } from '../InMemoryCampaignEventStore';
import {
  appendCampaignCommandBatch,
  CAMPAIGN_JOURNAL_AUTHORITY_ENABLED,
  computeCampaignStateDigest,
  createDefaultCampaignEventStore,
  envelopeOf,
  JournalCampaignEventStore,
  type ICampaignJournalEnvelope,
} from '../JournalCampaignEventStore';

const NOW = '3025-01-03T00:00:00.000Z';

/**
 * Canonical bytes, event digest and state digest a PRE-private-field
 * envelope produced. Pinned from the base commit so a private field that
 * is ever written unconditionally -- as `{}` or as an enumerable
 * `undefined` -- changes the digest of history that has not changed and
 * turns these rows red.
 */
const LEGACY_CANONICAL_PAYLOAD =
  '{"campaignEvent":{"authorPlayerId":"pid-host","campaignId":"campaign-journal","payload":{"newDay":1},"scope":"campaign","sequence":0,"ts":"3025-01-03T00:00:00.000Z","type":"CampaignDayAdvanced"},"expectedPostStateDigest":null,"intentFingerprint":null}';
const LEGACY_EVENT_DIGEST =
  '061d860fbbcb6481e837dcc2c036253317688f201ab0276dc24389f52d99db42';
const LEGACY_STATE: ICampaignAuthoritativeState = {
  campaignId: 'campaign-journal',
  day: 3,
  balance: 4_850_000,
  rosterUnits: {},
  pilots: {},
  contracts: {
    'offer-taken': {
      contractId: 'offer-taken',
      name: 'Garrison Duty on Galatea',
      employerFactionId: 'house-davion',
    },
  },
  factionStanding: { 'house-davion': 2 },
  salvagePool: 0,
};
const LEGACY_STATE_DIGEST =
  'b05fc8809b072a0ce1c2a189ad2018be1ca566fa43fd1a77b54824bd135063bc';

/** A full `IContract` -- every field the compact wire fact omits. */
function fullContract(id: string): IContract {
  return {
    id,
    name: 'Garrison Duty on Galatea',
    status: MissionStatus.ACTIVE,
    type: 'contract',
    systemId: 'galatea',
    scenarioIds: [],
    createdAt: NOW,
    updatedAt: NOW,
    employerId: 'house-davion',
    targetId: 'house-liao',
    paymentTerms: createPaymentTerms({
      basePayment: new Money(1_250_000),
      successPayment: new Money(500_000),
      partialPayment: new Money(250_000),
      failurePayment: new Money(0),
      salvagePercent: 35,
      transportPayment: new Money(100_000),
      supportPayment: new Money(75_000),
    }),
    salvageRights: 'Integrated',
    salvagePercent: 35,
    hostileTerritory: true,
    exchangeSalvage: false,
    commandRights: 'Independent',
    moraleLevel: AtBMoraleLevel.OVERWHELMING,
    atbContractType: AtBContractType.GARRISON_DUTY,
  };
}

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
    scope: 'campaign',
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

  it('rejects divergent reuse of a command id without re-applying', async () => {
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
      kind: 'command-identity-conflict',
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

  it('hands a caller with a journal factory the journal store now that the flag is on', () => {
    expect(CAMPAIGN_JOURNAL_AUTHORITY_ENABLED).toBe(true);
    // The factory takes a thunk and calls it once, on the branch that uses
    // the journal it opens.
    const openJournal = jest.fn(() => journal);
    expect(
      createDefaultCampaignEventStore({ journal: openJournal }),
    ).toBeInstanceOf(JournalCampaignEventStore);
    expect(openJournal).toHaveBeenCalledTimes(1);
    // A caller with no journal factory (the browser-side co-op runtime)
    // still gets the in-memory store.
    expect(createDefaultCampaignEventStore()).toBeInstanceOf(
      InMemoryCampaignEventStore,
    );
  });
});

const commandBatchStores: readonly [string, () => ICampaignEventStore][] = [
  [
    'journal-backed',
    () =>
      new JournalCampaignEventStore(
        new InMemoryEventJournal<ICampaignJournalEnvelope>(() => NOW),
      ),
  ],
  ['in-memory', () => new InMemoryCampaignEventStore()],
];

describe.each(commandBatchStores)(
  '%s campaign command-batch contract',
  (_name, createStore) => {
    it('replays the accepted receipt and rejects divergent identity reuse', async () => {
      const store = createStore();
      const appendCommandBatch = store.appendCommandBatch;
      if (!appendCommandBatch) {
        throw new Error('campaign command-batch capability is required');
      }
      const input = {
        commandId: 'campaign-intent:campaign-journal:intent-once',
        intentFingerprint: 'intent-once-fingerprint',
        events: [campaignEvent(0)],
        expectedPostStateDigest: 'a'.repeat(64),
      };

      const committed = await appendCommandBatch('campaign-journal', input);
      const retry = await appendCommandBatch('campaign-journal', input);
      const conflict = await appendCommandBatch('campaign-journal', {
        ...input,
        intentFingerprint: 'different-work-fingerprint',
        events: [campaignEvent(1, 'CampaignDayAdvanced', { newDay: 2 })],
      });

      expect(committed.kind).toBe('committed');
      expect(retry).toMatchObject({
        kind: 'duplicate-command',
        receipt: { commandId: input.commandId, events: input.events },
      });
      expect(conflict).toEqual({
        kind: 'command-identity-conflict',
        commandId: input.commandId,
      });
      expect(await store.getEvents('campaign-journal')).toEqual(input.events);
    });
  },
);

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

describe('source-only private envelope (real SQLite reopen)', () => {
  let directory: string;

  beforeEach(() => {
    directory = mkdtempSync(path.join(tmpdir(), 'campaign-private-'));
  });
  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  /**
   * Opens a migrated file-backed journal. Separate from the restart suite
   * above so a private-envelope failure cannot be read as a restart bug.
   */
  function openJournal(file: string): {
    readonly db: Database.Database;
    readonly journal: SQLiteEventJournal<ICampaignJournalEnvelope>;
  } {
    const db = new Database(file);
    db.pragma('foreign_keys = ON');
    return { db, journal: new SQLiteEventJournal(db, () => NOW) };
  }

  it('recovers the full contract and market from the private field while envelopeOf stays compact', async () => {
    const file = path.join(directory, 'private.sqlite');
    const first = new Database(file);
    first.pragma('journal_mode = WAL');
    first.pragma('foreign_keys = ON');
    first.exec(EVENT_JOURNAL_MIGRATION.up);
    const journal = new SQLiteEventJournal<ICampaignJournalEnvelope>(
      first,
      () => NOW,
    );

    const sourceRecordBody = JSON.stringify({
      id: 'campaign-journal',
      contractMarket: {
        offers: [fullContract('offer-remaining'), fullContract('offer-taken')],
        declinedOfferIds: ['offer-declined'],
      },
    });
    const accepted = fullContract('offer-taken');
    const committed = await appendCampaignCommandBatch(journal, {
      campaignId: 'campaign-journal',
      commandId: 'command-accept-contract',
      events: [
        campaignEvent(0, 'ContractAccepted', {
          contract: {
            contractId: 'offer-taken',
            name: accepted.name,
            employerFactionId: accepted.employerId,
          },
        }),
      ],
      expectedPostStateDigest: null,
      sourcePrivate: buildCampaignSourcePrivateEnvelope({
        baseline: {
          sourceRecordBody,
          sourceRowVersion: 7,
          rootPublicRevision: 1,
        },
        acceptedContract: accepted,
        remainingMarket: {
          offers: [fullContract('offer-remaining')],
          declinedOfferIds: ['offer-declined'],
        },
      }),
    });
    expect(committed.kind).toBe('committed');
    first.close();

    // Cold reopen: nothing in-process survives.
    const reopened = openJournal(file);
    const rows = await reopened.journal.readStream({
      streamType: 'campaign',
      streamId: 'campaign-journal',
      branchId: 'root',
      afterRevision: 0,
      limit: 10,
    });
    expect(rows).toHaveLength(1);
    const stored = rows[0];

    // (a) The SOURCE recovers the full private detail from the journal.
    const replayed = replayCampaignSourceContracts(rows);
    expect(replayed.acceptedContracts).toHaveLength(1);
    const recovered = replayed.acceptedContracts[0];
    expect(recovered.employerId).toBe('house-davion');
    expect(recovered.targetId).toBe('house-liao');
    expect(recovered.salvageRights).toBe('Integrated');
    expect(recovered.commandRights).toBe('Independent');
    expect(recovered.moraleLevel).toBe(AtBMoraleLevel.OVERWHELMING);
    expect(recovered.atbContractType).toBe(AtBContractType.GARRISON_DUTY);
    expect(recovered.paymentTerms.basePayment).toBeInstanceOf(Money);
    expect(recovered.paymentTerms.basePayment.amount).toBe(1_250_000);
    expect(
      replayed.remainingMarket.offers.map(function (offer) {
        return offer.id;
      }),
    ).toEqual(['offer-remaining']);
    // Replay starts from the persisted source body, never the compact genesis.
    expect(replayed.baseline.sourceRecordBody).toBe(sourceRecordBody);
    expect(replayed.baseline.sourceRowVersion).toBe(7);
    expect(
      replayed.baselineMarket.offers.map(function (offer) {
        return offer.id;
      }),
    ).toEqual(['offer-remaining', 'offer-taken']);

    // (b) The wire narrowing on the SAME row yields only the compact fact.
    const wire = envelopeOf(stored);
    expect(wire.type).toBe('ContractAccepted');
    expect(JSON.stringify(wire)).not.toContain('house-liao');
    expect(JSON.stringify(wire)).not.toContain('Integrated');
    expect(JSON.stringify(wire)).not.toContain('offer-remaining');
    expect(Object.keys(wire)).not.toContain('sourcePrivate');
    reopened.db.close();
  });

  it('leaves a legacy envelope byte-identical and its digests unchanged', async () => {
    const file = path.join(directory, 'legacy.sqlite');
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
      commandId: 'command-legacy',
      events: [campaignEvent(0)],
      expectedPostStateDigest: null,
    });
    expect(committed.kind).toBe('committed');
    db.close();

    const reopened = openJournal(file);
    const rows = await reopened.journal.readStream({
      streamType: 'campaign',
      streamId: 'campaign-journal',
      branchId: 'root',
      afterRevision: 0,
      limit: 10,
    });
    const stored = rows[0];

    // Conditional absence: not `{}`, not an enumerable `undefined`.
    expect(Object.hasOwn(stored.payload, 'sourcePrivate')).toBe(false);
    expect(campaignSourcePrivateOf(stored)).toBeNull();
    expect(canonicalizeJsonV1(stored.payload)).toBe(LEGACY_CANONICAL_PAYLOAD);
    expect(stored.eventDigest).toBe(LEGACY_EVENT_DIGEST);
    expect(computeCampaignStateDigest(LEGACY_STATE)).toBe(LEGACY_STATE_DIGEST);
    reopened.db.close();
  });

  /**
   * Unwraps a typed replay refusal. A bare `toThrow()` would pass on a
   * TypeError and would not prove "no silent compact fallback", so this
   * rethrows anything that is not the typed error and fails outright when
   * the read RETURNS -- a returned compact fallback is the exact regression
   * these rows exist to catch.
   */
  function refusalReasonOf(
    read: () => unknown,
  ): CampaignSourcePrivateReplayReason {
    try {
      read();
    } catch (error) {
      if (error instanceof CampaignSourcePrivateReplayError)
        return error.reason;
      throw error;
    }
    throw new Error('expected a typed replay refusal, but the read returned');
  }

  /** Commits one private payload to a fresh file journal and returns the stored row. */
  async function storePrivate(
    name: string,
    sourcePrivate: ICampaignJournalEnvelope['sourcePrivate'],
  ): Promise<IStoredEvent<ICampaignJournalEnvelope>> {
    const file = path.join(directory, name);
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
      commandId: `command-${name}`,
      events: [campaignEvent(0)],
      expectedPostStateDigest: null,
      sourcePrivate,
    });
    expect(committed.kind).toBe('committed');
    db.close();

    const reopened = openJournal(file);
    const rows = await reopened.journal.readStream({
      streamType: 'campaign',
      streamId: 'campaign-journal',
      branchId: 'root',
      afterRevision: 0,
      limit: 10,
    });
    reopened.db.close();
    return rows[0];
  }

  /** A well-formed private payload; each refusal row corrupts one field of it. */
  function wellFormedPrivate(): NonNullable<
    ICampaignJournalEnvelope['sourcePrivate']
  > {
    return buildCampaignSourcePrivateEnvelope({
      baseline: {
        sourceRecordBody: JSON.stringify({ id: 'campaign-journal' }),
        sourceRowVersion: 4,
        rootPublicRevision: 1,
      },
      acceptedContract: fullContract('offer-taken'),
      remainingMarket: { offers: [], declinedOfferIds: [] },
    });
  }

  it('refuses an unsupported private schema version rather than falling back', async () => {
    const built = wellFormedPrivate();
    const stored = await storePrivate('schema.sqlite', {
      ...built,
      schemaVersion: built.schemaVersion + 1,
    });

    expect(() => campaignSourcePrivateOf(stored)).toThrow(
      CampaignSourcePrivateReplayError,
    );
    expect(refusalReasonOf(() => campaignSourcePrivateOf(stored))).toBe(
      'unsupported-schema',
    );
  });

  it('refuses a captured baseline whose digest does not match its own body', async () => {
    const built = wellFormedPrivate();
    const stored = await storePrivate('identity.sqlite', {
      ...built,
      baseline: { ...built.baseline, sourceBodyDigest: 'f'.repeat(64) },
    });

    expect(() => campaignSourcePrivateOf(stored)).toThrow(
      CampaignSourcePrivateReplayError,
    );
    expect(refusalReasonOf(() => campaignSourcePrivateOf(stored))).toBe(
      'source-identity-mismatch',
    );
  });

  it('refuses to replay a stream that carries no private payload', async () => {
    const file = path.join(directory, 'nopriv.sqlite');
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
      commandId: 'command-nopriv',
      events: hireBatch(0),
      expectedPostStateDigest: null,
    });
    expect(committed.kind).toBe('committed');
    db.close();

    const reopened = openJournal(file);
    const rows = await reopened.journal.readStream({
      streamType: 'campaign',
      streamId: 'campaign-journal',
      branchId: 'root',
      afterRevision: 0,
      limit: 10,
    });
    expect(rows).toHaveLength(2);

    // The compact wire projection is NOT an acceptable substitute here: it
    // does not carry these facts at all, so a silent fallback would report
    // "no contracts" for a campaign that may well have some.
    expect(() => replayCampaignSourceContracts(rows)).toThrow(
      CampaignSourcePrivateReplayError,
    );
    expect(refusalReasonOf(() => replayCampaignSourceContracts(rows))).toBe(
      'no-private-payload',
    );
    reopened.db.close();
  });
});
