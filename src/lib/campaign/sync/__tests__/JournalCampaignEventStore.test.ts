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
import { canonicalizeCommandIdentityV1 } from '@/lib/events/journal/EventJournalCommandIdentity';
import { InMemoryEventJournal } from '@/lib/events/journal/InMemoryEventJournal';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import { DurableMatchStore } from '@/lib/multiplayer/server/DurableMatchStore';
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
  CAMPAIGN_APPEND_CONTROLS_UNSUPPORTED,
  CampaignEventSequenceCollisionError,
  type ICampaignCommittedBatch,
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
  toJournalBatch,
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

/**
 * P2CG1B: the borrowed-transaction journal operation, the prewrite guard
 * threaded through the campaign store, and the actual-commit notification,
 * all against real file-backed SQLite. Every row reads durable tables
 * directly (or through a second connection after the native COMMIT), so
 * an in-process cache cannot stand in for a rollback or a commit.
 */
describe('P2CG1B borrowed append, prewrite guard and actual-commit signal (real SQLite)', () => {
  let directory: string;

  beforeEach(() => {
    directory = mkdtempSync(path.join(tmpdir(), 'campaign-p2cg1b-'));
  });
  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  function openFile(
    name: string,
    migrate = true,
  ): {
    readonly file: string;
    readonly db: Database.Database;
    readonly journal: SQLiteEventJournal<ICampaignJournalEnvelope>;
  } {
    const file = path.join(directory, name);
    const db = new Database(file);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    if (migrate) db.exec(EVENT_JOURNAL_MIGRATION.up);
    return {
      file,
      db,
      journal: new SQLiteEventJournal<ICampaignJournalEnvelope>(db, () => NOW),
    };
  }

  /** Every durable table an append touches, read on the given handle. */
  function durableCounts(db: Database.Database): Record<string, number> {
    const count = (sql: string): number =>
      (db.prepare(sql).get() as { readonly n: number }).n;
    return {
      batches: count('SELECT COUNT(*) AS n FROM event_journal_batches'),
      events: count('SELECT COUNT(*) AS n FROM event_journal_events'),
      heads: count('SELECT COUNT(*) AS n FROM event_journal_stream_heads'),
      refs: count('SELECT COUNT(*) AS n FROM event_journal_entity_refs'),
      highWater: count(
        'SELECT last_commit_position AS n FROM event_journal_store_state WHERE singleton_id = 1',
      ),
    };
  }

  function batchFor(commandId: string, sequence = 0) {
    return toJournalBatch({
      campaignId: 'campaign-journal',
      commandId,
      events: [campaignEvent(sequence)],
      expectedPostStateDigest: null,
    });
  }

  function commandInput(commandId: string, sequence = 0) {
    return {
      commandId,
      intentFingerprint: `${commandId}-fingerprint`,
      events: [campaignEvent(sequence)],
      expectedPostStateDigest: 'd'.repeat(64),
    };
  }

  it('borrowed append writes inside the caller transaction, synchronously, and vanishes with its rollback', () => {
    const { db, journal } = openFile('borrowed-rollback.sqlite');
    const empty = durableCounts(db);
    let inside: Record<string, number> | undefined;
    let returned: unknown;

    expect(() =>
      db.transaction(() => {
        returned = journal.appendInBorrowedTransaction(
          batchFor('command-borrowed-rollback'),
        );
        inside = durableCounts(db);
        throw new Error('outer body fails after the borrowed append');
      })(),
    ).toThrow('outer body fails after the borrowed append');

    // Synchronous: a plain result, not a promise or thenable.
    expect(returned).toMatchObject({ kind: 'committed' });
    expect((returned as { readonly then?: unknown }).then).toBeUndefined();
    expect(inside).toMatchObject({
      batches: 1,
      events: 1,
      heads: 1,
      highWater: 1,
    });
    // The receipt, events, head, high-water and entity refs all rolled back.
    expect(durableCounts(db)).toEqual(empty);
    db.close();
  });

  it('borrowed append is durable only through the outer owner commit and survives a reopen', async () => {
    const { db, journal } = openFile('borrowed-commit.sqlite');

    db.transaction(() => {
      const result = journal.appendInBorrowedTransaction(
        batchFor('command-borrowed-commit'),
      );
      expect(result.kind).toBe('committed');
      // It neither began nor ended a transaction of its own: the caller's
      // transaction is still the open one.
      expect(db.inTransaction).toBe(true);
    })();
    expect(db.inTransaction).toBe(false);
    db.close();

    const reopened = openFile('borrowed-commit.sqlite', false);
    expect(durableCounts(reopened.db)).toMatchObject({
      batches: 1,
      events: 1,
      heads: 1,
      highWater: 1,
    });
    expect(
      (await reopened.journal.getCommandReceipt('command-borrowed-commit'))
        ?.eventCount,
    ).toBe(1);
    reopened.db.close();
  });

  it('borrowed append refuses without an active transaction, and a released savepoint is not durable', () => {
    const { db, journal } = openFile('borrowed-no-transaction.sqlite');
    const empty = durableCounts(db);

    expect(() =>
      journal.appendInBorrowedTransaction(batchFor('command-no-transaction')),
    ).toThrow(/active transaction/);
    expect(durableCounts(db)).toEqual(empty);

    expect(() =>
      db.transaction(() => {
        // A nested better-sqlite3 transaction is a SAVEPOINT; releasing it
        // commits nothing durable while the outer transaction is open.
        db.transaction(() => {
          journal.appendInBorrowedTransaction(batchFor('command-savepoint'));
        })();
        expect(durableCounts(db).batches).toBe(1);
        throw new Error('outer rollback after the savepoint released');
      })(),
    ).toThrow('outer rollback after the savepoint released');
    expect(durableCounts(db)).toEqual(empty);
    db.close();
  });

  it('borrowed append shares the validation body: duplicate ids throw before writing, conflicts stay typed', () => {
    const { db, journal } = openFile('borrowed-validation.sqlite');
    const first = batchFor('command-validation-a');
    const duplicateIds = {
      ...batchFor('command-validation-dup'),
      events: [
        first.events[0],
        { ...first.events[0], occurredAt: '3025-01-04T00:00:00.000Z' },
      ],
    };

    db.transaction(() => {
      expect(() => journal.appendInBorrowedTransaction(duplicateIds)).toThrow(
        'Duplicate eventId',
      );
      expect(durableCounts(db).batches).toBe(0);
      expect(journal.appendInBorrowedTransaction(first).kind).toBe('committed');
      expect(
        journal.appendInBorrowedTransaction({
          ...batchFor('command-validation-stale'),
          expectedRevision: 0,
        }),
      ).toEqual({
        kind: 'revision-conflict',
        expectedRevision: 0,
        actualRevision: 1,
      });
      expect(
        journal.appendInBorrowedTransaction({
          ...first,
          expectedRevision: 1,
        }),
      ).toEqual({
        kind: 'command-identity-conflict',
        commandId: 'command-validation-a',
      });
    })();
    expect(durableCounts(db)).toMatchObject({ batches: 1, events: 1 });
    db.close();
  });

  it('the owning wrapper never notifies a savepoint: inside a caller transaction it refuses a commit notification before writing', async () => {
    const { db, journal } = openFile('savepoint-notify.sqlite');
    const notified: unknown[] = [];
    let settled: unknown = 'pending';

    db.transaction(() => {
      // Inside an open transaction better-sqlite3 turns the wrapper's own
      // IMMEDIATE transaction into a SAVEPOINT, whose release is not a
      // durable commit. A notification there would be a false commit.
      journal
        .appendWithExtension(
          batchFor('command-savepoint-notify'),
          (_handle, append) => append(),
          (result: unknown) => notified.push(result),
        )
        .then(
          () => {
            settled = 'resolved';
          },
          (error: unknown) => {
            settled = error;
          },
        );
    })();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(notified).toEqual([]);
    expect(settled).toMatchObject({
      message: expect.stringMatching(/outer transaction/),
    });
    expect(durableCounts(db).batches).toBe(0);
    db.close();
  });

  it('a guard runs on the append transaction handle before the batch is written; a typed refusal changes nothing', async () => {
    const { db, journal } = openFile('guard-refused.sqlite');
    const store = new JournalCampaignEventStore(journal);
    const empty = durableCounts(db);
    const seen: unknown[] = [];
    const notified: ICampaignCommittedBatch[] = [];
    const refusal = { kind: 'refused' as const, reason: 'not-converged' };

    const result = await store.appendControlledCommandBatch!(
      'campaign-journal',
      commandInput('command-guard-refused'),
      {
        guard: (handle) => {
          seen.push({
            inTransaction: handle.inTransaction,
            sameHandle: handle === db,
            batchesBeforeWrite: durableCounts(handle).batches,
          });
          return refusal;
        },
        onCommitted: (batch) => notified.push(batch),
      },
    );

    expect(result).toEqual(refusal);
    expect(seen).toEqual([
      { inTransaction: true, sameHandle: true, batchesBeforeWrite: 0 },
    ]);
    expect(notified).toEqual([]);
    expect(durableCounts(db)).toEqual(empty);
    expect(
      await store.getCommandReceipt(
        'campaign-journal',
        'command-guard-refused',
      ),
    ).toBeNull();
    db.close();
  });

  it('a passing guard allows exactly one append; an exact retry neither re-runs the guard nor re-notifies', async () => {
    const { db, journal } = openFile('guard-passed.sqlite');
    const store = new JournalCampaignEventStore(journal);
    let guardCalls = 0;
    const notified: ICampaignCommittedBatch[] = [];
    const controls = {
      guard: () => {
        guardCalls += 1;
        return null;
      },
      onCommitted: (batch: ICampaignCommittedBatch) => notified.push(batch),
    };

    const first = await store.appendControlledCommandBatch!(
      'campaign-journal',
      commandInput('command-guard-passed'),
      controls,
    );
    const retry = await store.appendControlledCommandBatch!(
      'campaign-journal',
      commandInput('command-guard-passed'),
      controls,
    );

    expect(first.kind).toBe('committed');
    expect(retry).toMatchObject({
      kind: 'duplicate-command',
      receipt: { commandId: 'command-guard-passed' },
    });
    expect(guardCalls).toBe(1);
    expect(notified).toHaveLength(1);
    expect(durableCounts(db)).toMatchObject({ batches: 1, events: 1 });
    db.close();
  });

  it('a throwing guard, a thenable guard result and a throwing saved-record extension all roll back with no notification', async () => {
    const { db, journal } = openFile('guard-rollback.sqlite');
    const store = new JournalCampaignEventStore(journal);
    const empty = durableCounts(db);
    const notified: ICampaignCommittedBatch[] = [];
    const onCommitted = (batch: ICampaignCommittedBatch) =>
      notified.push(batch);

    await expect(
      store.appendControlledCommandBatch!(
        'campaign-journal',
        commandInput('command-guard-throws'),
        {
          guard: () => {
            throw new Error('guard exploded');
          },
          onCommitted,
        },
      ),
    ).rejects.toThrow('guard exploded');
    await expect(
      store.appendControlledCommandBatch!(
        'campaign-journal',
        commandInput('command-guard-thenable'),
        { guard: () => Promise.resolve(null) as never, onCommitted },
      ),
    ).rejects.toThrow(/synchronously/);
    store.rewriteRecordAfterCommand = () => {
      throw new Error('saved-record rewrite failed');
    };
    await expect(
      store.appendControlledCommandBatch!(
        'campaign-journal',
        commandInput('command-extension-throws'),
        { guard: () => null, onCommitted },
      ),
    ).rejects.toThrow('saved-record rewrite failed');

    expect(notified).toEqual([]);
    expect(durableCounts(db)).toEqual(empty);
    db.close();
  });

  it('notifies once after the native COMMIT with a frozen plain identity an independent connection can already read', async () => {
    const { file, db, journal } = openFile('notify.sqlite');
    const store = new JournalCampaignEventStore(journal);
    const observed: unknown[] = [];

    const result = await store.appendControlledCommandBatch!(
      'campaign-journal',
      commandInput('command-notify'),
      {
        onCommitted: (batch) => {
          const other = new Database(file);
          try {
            observed.push({
              batch: { ...batch },
              frozen: Object.isFrozen(batch),
              ownerInTransaction: db.inTransaction,
              visibleElsewhere: other
                .prepare(
                  'SELECT command_id AS commandId FROM event_journal_batches WHERE command_id = ?',
                )
                .get('command-notify'),
            });
          } finally {
            other.close();
          }
        },
      },
    );

    expect(result.kind).toBe('committed');
    const receipt = await journal.getCommandReceipt('command-notify');
    expect(observed).toEqual([
      {
        batch: {
          campaignId: 'campaign-journal',
          commandId: 'command-notify',
          commandDigest: receipt?.commandDigest,
          firstCommitPosition: 1,
          lastCommitPosition: 1,
          eventCount: 1,
        },
        frozen: true,
        ownerInTransaction: false,
        visibleElsewhere: { commandId: 'command-notify' },
      },
    ]);
    db.close();
  });

  it('a throwing notification is reported on the committed result and never undoes the batch', async () => {
    const { db, journal } = openFile('notify-throws.sqlite');
    const store = new JournalCampaignEventStore(journal);
    const failure = new Error('commit observer failed');

    const result = await store.appendControlledCommandBatch!(
      'campaign-journal',
      commandInput('command-notify-throws'),
      {
        onCommitted: () => {
          throw failure;
        },
      },
    );

    expect(result).toMatchObject({
      kind: 'committed',
      notificationError: { error: failure },
    });
    db.close();
    const reopened = openFile('notify-throws.sqlite', false);
    expect(durableCounts(reopened.db)).toMatchObject({ batches: 1, events: 1 });
    reopened.db.close();
  });

  it('controls on a journal or store without the capability fail closed before any write', async () => {
    const memoryStore = new JournalCampaignEventStore(
      new InMemoryEventJournal<ICampaignJournalEnvelope>(() => NOW),
    );
    let guardCalls = 0;

    const guarded = await memoryStore.appendControlledCommandBatch!(
      'campaign-journal',
      commandInput('command-no-capability'),
      {
        guard: () => {
          guardCalls += 1;
          return null;
        },
      },
    );
    const notifyOnly = await memoryStore.appendControlledCommandBatch!(
      'campaign-journal',
      commandInput('command-no-capability'),
      { onCommitted: () => undefined },
    );

    expect(CAMPAIGN_APPEND_CONTROLS_UNSUPPORTED).toBe(
      'append-controls-unsupported',
    );
    expect(guarded).toEqual({
      kind: 'refused',
      reason: CAMPAIGN_APPEND_CONTROLS_UNSUPPORTED,
    });
    expect(notifyOnly).toEqual(guarded);
    expect(guardCalls).toBe(0);
    expect(await memoryStore.getEvents('campaign-journal')).toEqual([]);

    // A store with only the plain batch capability is not guard-capable:
    // it exposes no controlled operation the host could mistake for one.
    const plain: ICampaignEventStore = new InMemoryCampaignEventStore();
    expect(typeof plain.appendCommandBatch).toBe('function');
    expect(plain.appendControlledCommandBatch).toBeUndefined();
  });

  it('controls never reach the journal payload or the command identity', async () => {
    const guarded = openFile('identity-guarded.sqlite');
    const plain = openFile('identity-plain.sqlite');
    const input = commandInput('command-identity');

    const controlled = await new JournalCampaignEventStore(guarded.journal)
      .appendControlledCommandBatch!('campaign-journal', input, {
      guard: () => null,
      onCommitted: () => undefined,
    });
    const uncontrolled = await new JournalCampaignEventStore(
      plain.journal,
    ).appendCommandBatch('campaign-journal', input);
    expect(controlled.kind).toBe('committed');
    expect(uncontrolled.kind).toBe('committed');

    const rows = (db: Database.Database) =>
      db
        .prepare(
          'SELECT event_id AS eventId, payload_json AS payloadJson, event_digest AS eventDigest FROM event_journal_events ORDER BY commit_position',
        )
        .all() as Array<{ readonly payloadJson: string }>;
    const digests = (db: Database.Database) =>
      db
        .prepare(
          'SELECT command_digest AS commandDigest FROM event_journal_batches',
        )
        .all() as Array<{ readonly commandDigest: string }>;
    expect(rows(guarded.db)).toEqual(rows(plain.db));
    expect(digests(guarded.db)).toEqual(digests(plain.db));
    expect(digests(plain.db)[0].commandDigest).toBe(
      canonicalizeCommandIdentityV1(
        toJournalBatch({ campaignId: 'campaign-journal', ...input }),
      ).digest,
    );
    for (const row of rows(guarded.db)) {
      expect(row.payloadJson).not.toMatch(/guard|onCommitted|afterRelease/);
    }
    guarded.db.close();
    plain.db.close();
  });
  /**
   * P2CG1R (H-OPEN-1 / CF-E1): a real P2CG1C match reservation (M) taken in
   * the guard. The trace records M's transaction control with whether the
   * append's own transaction (C) is still open; a microtask queued at BEGIN
   * records 'tick' and then writes a foreign row on M - the write a late
   * (microtask) release would let nest under M and then discard.
   */
  function reservedMatch(campaign: Database.Database) {
    const file = path.join(directory, 'match.sqlite');
    const matches = new DurableMatchStore({ path: file });
    const match = matches.getDatabase();
    match.exec('CREATE TABLE r_foreign (id INTEGER PRIMARY KEY)');
    const trail: string[] = [];
    const exec = match.exec.bind(match);
    jest.spyOn(match, 'exec').mockImplementation((sql: string) => {
      if (/^(BEGIN|COMMIT|ROLLBACK)/.test(sql)) {
        trail.push(`M:${sql}:C-open=${String(campaign.inTransaction)}`);
        if (sql === 'BEGIN IMMEDIATE') {
          queueMicrotask(() => {
            trail.push('tick');
            match.transaction(() =>
              match.prepare('INSERT INTO r_foreign DEFAULT VALUES').run(),
            )();
          });
        }
      }
      return exec(sql);
    });
    let held: { release(): void } | null = null;
    let signals = 0;
    const controls = {
      guard: () => {
        held = matches.reserveMatchProgression();
        trail.push('guard');
        return null;
      },
      onNotCommitted: () => {
        signals += 1;
        const hold = held;
        held = null;
        hold?.release();
      },
    };
    const foreignRows = () => {
      const other = new Database(file, { readonly: true });
      try {
        return (
          other.prepare('SELECT COUNT(*) AS n FROM r_foreign').get() as {
            readonly n: number;
          }
        ).n;
      } finally {
        other.close();
      }
    };
    return {
      trail,
      controls,
      signals: () => signals,
      foreignRows,
      idle: () => !match.inTransaction,
      close: () => matches.close(),
    };
  }

  const abortTrigger =
    "CREATE TRIGGER r_abort BEFORE INSERT ON event_journal_batches BEGIN SELECT RAISE(ABORT, 'r native append abort'); END";

  it.each([
    ['a real revision conflict', 'conflict'],
    ['a native append abort', 'abort'],
    ['a throwing saved-record extension', 'extension'],
  ] as const)(
    'P2CG1R: %s after the guard admitted releases M inside the append, before a queued foreign write',
    async (_label, failure) => {
      const { db, journal } = openFile(`r-${failure}.sqlite`);
      const store = new JournalCampaignEventStore(journal);
      expect(
        (
          await store.appendCommandBatch(
            'campaign-journal',
            commandInput('command-r-first'),
          )
        ).kind,
      ).toBe('committed');
      if (failure === 'abort') db.exec(abortTrigger);
      if (failure === 'extension') {
        store.rewriteRecordAfterCommand = () => {
          throw new Error('saved-record rewrite failed');
        };
      }
      const before = durableCounts(db);
      const match = reservedMatch(db);
      try {
        const notified: ICampaignCommittedBatch[] = [];
        const controls = {
          ...match.controls,
          onCommitted: (batch: ICampaignCommittedBatch) => notified.push(batch),
        };
        // The conflict row aims at revision 0, already taken: the SQL
        // revision check refuses inside the append, after the guard admitted.
        const appended = store.appendControlledCommandBatch!(
          'campaign-journal',
          commandInput('command-r-failed', failure === 'conflict' ? 0 : 1),
          controls,
        );
        if (failure === 'conflict') {
          expect(await appended).toEqual({
            kind: 'sequence-conflict',
            expectedNextSequence: 0,
            actualNextSequence: 1,
          });
        } else {
          // A native SqliteError may come from another realm: match by message.
          await expect(appended).rejects.toMatchObject({
            message:
              failure === 'abort'
                ? 'r native append abort'
                : 'saved-record rewrite failed',
          });
        }
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(match.trail).toEqual([
          'M:BEGIN IMMEDIATE:C-open=true',
          'guard',
          'M:ROLLBACK:C-open=true',
          'tick',
        ]);
        expect(match.signals()).toBe(1);
        // Released before the queued write ran, so it committed on its own.
        expect(match.foreignRows()).toBe(1);
        expect(match.idle()).toBe(true);
        expect(notified).toEqual([]);
        expect(durableCounts(db)).toEqual(before);
      } finally {
        match.close();
        db.close();
      }
    },
  );

  it('P2CG1R: no not-committed signal on a guard refusal, a commit or a recorded retry; a throwing signal never replaces the outcome', async () => {
    const { db, journal } = openFile('r-signal.sqlite');
    try {
      const store = new JournalCampaignEventStore(journal);
      const signals: string[] = [];
      let guardCalls = 0;
      const refusal = { kind: 'refused' as const, reason: 'not-converged' };
      const refusing = {
        guard: () => refusal,
        onNotCommitted: () => signals.push('refused'),
      };
      const passing = {
        guard: () => {
          guardCalls += 1;
          return null;
        },
        onNotCommitted: () => signals.push('passing'),
      };
      const throwing = {
        guard: () => null,
        onNotCommitted: () => {
          signals.push('throwing');
          throw new Error('release failed');
        },
      };
      const append = (
        commandId: string,
        sequence: number,
        controls: typeof passing | typeof refusing | typeof throwing,
      ) =>
        store.appendControlledCommandBatch!(
          'campaign-journal',
          commandInput(commandId, sequence),
          controls,
        );

      expect(await append('command-r-once', 0, refusing)).toEqual(refusal);
      expect((await append('command-r-once', 0, passing)).kind).toBe(
        'committed',
      );
      expect(await append('command-r-once', 0, passing)).toMatchObject({
        kind: 'duplicate-command',
      });
      expect(guardCalls).toBe(1);
      expect(signals).toEqual([]);

      expect(await append('command-r-stale', 0, throwing)).toMatchObject({
        kind: 'sequence-conflict',
      });
      db.exec(abortTrigger);
      await expect(
        append('command-r-abort', 1, throwing),
      ).rejects.toMatchObject({
        message: 'r native append abort',
      });
      expect(signals).toEqual(['throwing', 'throwing']);
      expect(durableCounts(db)).toMatchObject({ batches: 1, events: 1 });
    } finally {
      db.close();
    }
  });

  it('P2CG1R: hook-only controls on a journal without the capability fail closed before any write', async () => {
    const memoryStore = new JournalCampaignEventStore(
      new InMemoryEventJournal<ICampaignJournalEnvelope>(() => NOW),
    );
    let signals = 0;
    // Only the not-committed hook: no guard and no commit notification.
    const hookOnly = {
      guard: undefined,
      onCommitted: undefined,
      onNotCommitted: () => {
        signals += 1;
      },
    };

    expect(
      await memoryStore.appendControlledCommandBatch!(
        'campaign-journal',
        commandInput('command-r-hook-only'),
        hookOnly,
      ),
    ).toEqual({
      kind: 'refused',
      reason: CAMPAIGN_APPEND_CONTROLS_UNSUPPORTED,
    });
    expect(signals).toBe(0);
    expect(await memoryStore.getEvents('campaign-journal')).toEqual([]);
  });
});
