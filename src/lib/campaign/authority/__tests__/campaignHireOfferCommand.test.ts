/**
 * K14b: the durable hire command derives the recruit and the price from the
 * personnel offer the SOURCE record holds, never from the caller.
 *
 * Real SQLite on a temp file, as the accept-contract suite uses, because the
 * properties under test are transactional: the market read, the append and
 * the source-row write are one immediate transaction.
 *
 * Rules: MekHQ e7adc2c `ForceHumanResources.recruitPerson`
 * (MekHQ/src/mekhq/campaign/ForceHumanResources.java:2548-2575) debits the
 * recruitment cost FIRST and enrols nobody when the debit fails, with the
 * cost computed by the campaign (`RecruitmentCosts.getRecruitmentCost`),
 * never supplied by the person being hired.
 */

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { ICampaignJournalEnvelope } from '@/lib/campaign/sync/JournalCampaignEventStore';
import type { ICampaignIntent } from '@/types/campaign/CampaignSync';

import { readCampaignJournalEvents } from '@/lib/campaign/sync/campaignJournalReads';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';

import type { CampaignAuthorityMode } from '../campaignAuthorityMode';

import { importCampaignBaseline } from '../campaignAuthorityMigration';
import { executeCampaignCommand } from '../campaignCommandPipeline';

const NOW = '3025-01-03T00:00:00.000Z';
const CAMPAIGN_ID = 'campaign-hire-offer';
const AUTHOR = 'pid-guest';
const OFFER_ID = 'offer-stored';
const JOURNAL_AUTHORITY: CampaignAuthorityMode = { kind: 'journal' };

/** One stored personnel-market offer, in its JSON form. */
function storedOffer(
  id: string,
  patch: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id,
    name: `Recruit ${id}`,
    role: 'pilot',
    experienceLevel: 'regular',
    skills: { gunnery: 4, piloting: 5 },
    hireCost: 120_000,
    expirationDate: '3025-01-10',
    ...patch,
  };
}

function hireOffer(offerId: string): ICampaignIntent {
  return {
    campaignId: CAMPAIGN_ID,
    intentId: `intent-${offerId}`,
    kind: 'HireOffer',
    payload: { offerId },
  };
}

interface IStoredRow {
  readonly version: number;
  readonly balance: number;
  readonly payload: string;
}

describe('durable hire-offer command', () => {
  let directory: string;
  let journal: SQLiteEventJournal<ICampaignJournalEnvelope>;

  beforeEach(async () => {
    directory = await mkdtemp(path.join(tmpdir(), 'camp-hire-offer-'));
    resetSQLiteService();
    getSQLiteService({ path: path.join(directory, 'hire.db') }).initialize();
    journal = new SQLiteEventJournal<ICampaignJournalEnvelope>(
      getSQLiteService().getDatabase(),
      () => NOW,
    );
    const imported = await importCampaignBaseline(journal, {
      campaignId: CAMPAIGN_ID,
      state: { ...createEmptyCampaignState(CAMPAIGN_ID), balance: 500_000 },
      sourceSnapshotRevision: 1,
      importedAt: NOW,
    });
    if (imported.kind !== 'imported') throw new Error(imported.kind);
  });

  afterEach(async () => {
    resetSQLiteService();
    await rm(directory, { recursive: true, force: true, maxRetries: 3 });
  });

  /** Write the campaigns row as the whole-envelope PUT leaves it. */
  function seedSourceRecord(
    bodyPatch: Record<string, unknown>,
    recordPatch: Record<string, unknown> = {},
  ): void {
    const body = {
      name: 'Grey Death Legion',
      factionId: 'mercenary',
      currentDate: NOW,
      finances: { balance: 500_000, transactions: [] },
      missions: [],
      ...bodyPatch,
    };
    const record = {
      campaignId: CAMPAIGN_ID,
      version: 4,
      schemaVersion: 1,
      body,
      savedAt: NOW,
      originDeviceId: 'device-1',
      ...recordPatch,
    };
    getSQLiteService()
      .getDatabase()
      .prepare(
        `INSERT OR REPLACE INTO campaigns
           (id, version, schema_version, name, faction_id, campaign_date,
            balance, saved_at, origin_device_id, payload)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        CAMPAIGN_ID,
        record.version,
        record.schemaVersion,
        body.name,
        body.factionId,
        // The summary column is NOT NULL; only the body may lack a clock.
        body.currentDate ?? NOW,
        500_000,
        record.savedAt,
        record.originDeviceId,
        JSON.stringify(record),
      );
  }

  function storedRow(): IStoredRow {
    return getSQLiteService()
      .getDatabase()
      .prepare('SELECT version, balance, payload FROM campaigns WHERE id = ?')
      .get(CAMPAIGN_ID) as IStoredRow;
  }

  function run(intent: ICampaignIntent, commandId: string) {
    return executeCampaignCommand(
      { journal, authority: JOURNAL_AUTHORITY },
      {
        campaignId: CAMPAIGN_ID,
        intent,
        authorPlayerId: AUTHOR,
        commandId,
        ts: NOW,
      },
    );
  }

  async function expectNothingMoved(commandId: string, before: IStoredRow) {
    expect(await journal.getCommandReceipt(commandId)).toBeNull();
    expect(storedRow()).toStrictEqual(before);
  }

  it('derives the recruit and the price from the stored offer and consumes it in the row', async () => {
    seedSourceRecord({
      personnelMarket: [storedOffer(OFFER_ID), storedOffer('offer-other')],
    });

    const result = await run(hireOffer(OFFER_ID), 'cmd-hire');

    expect(result.kind).toBe('committed');
    if (result.kind !== 'committed') return;
    expect(result.events.map((event) => event.type)).toStrictEqual([
      'FundsChanged',
      'PilotHired',
    ]);
    expect(result.events[0].payload).toMatchObject({
      delta: -120_000,
      balance: 380_000,
    });
    expect(result.events[1].payload).toStrictEqual({
      pilot: { pilotId: `hired-${OFFER_ID}`, name: `Recruit ${OFFER_ID}` },
      cost: 120_000,
    });
    expect(result.state.balance).toBe(380_000);

    const row = storedRow();
    expect(row.version).toBe(5);
    expect(row.balance).toBe(380_000);
    const record = JSON.parse(row.payload) as {
      version: number;
      sourceReplayFence: { rootPublicRevision: number };
      body: {
        personnelMarket: { id: string }[];
        finances: {
          balance: number;
          transactions: { id: string; amount: number; date: string }[];
        };
      };
    };
    expect(record.version).toBe(5);
    expect(record.body.personnelMarket.map((one) => one.id)).toStrictEqual([
      'offer-other',
    ]);
    expect(record.body.finances.balance).toBe(380_000);
    // The id K14a's `isPersonnelOfferConsumed` reads, so the local
    // normalizer and this command agree the offer is spent.
    expect(record.body.finances.transactions).toStrictEqual([
      {
        id: `tx-hire-${OFFER_ID}`,
        type: 'expense',
        amount: 120_000,
        date: NOW,
        description: `Hired Recruit ${OFFER_ID} (pilot)`,
      },
    ]);
    expect(record.sourceReplayFence.rootPublicRevision).toBe(
      (await readCampaignJournalEvents(journal, CAMPAIGN_ID)).length,
    );
  });

  it('refuses an offer the source market does not hold', async () => {
    seedSourceRecord({ personnelMarket: [storedOffer('offer-other')] });
    const before = storedRow();

    const result = await run(hireOffer(OFFER_ID), 'cmd-absent');

    expect(result).toStrictEqual({
      kind: 'rejected',
      reason: 'offer-not-found',
    });
    await expectNothingMoved('cmd-absent', before);
  });

  it.each([
    ['no hire cost', { hireCost: undefined }],
    ['a negative hire cost', { hireCost: -1 }],
    ['a non-finite hire cost', { hireCost: 'lots' }],
    ['no name', { name: '' }],
    ['no expiration date', { expirationDate: undefined }],
  ])(
    'refuses a stored offer with %s instead of inventing the missing fact',
    async (_label, patch) => {
      seedSourceRecord({ personnelMarket: [storedOffer(OFFER_ID, patch)] });
      const before = storedRow();

      const result = await run(hireOffer(OFFER_ID), 'cmd-unusable');

      expect(result).toStrictEqual({
        kind: 'rejected',
        reason: 'offer-not-found',
      });
      await expectNothingMoved('cmd-unusable', before);
    },
  );

  it('refuses an expired offer against the source record date', async () => {
    seedSourceRecord({
      personnelMarket: [
        storedOffer(OFFER_ID, { expirationDate: '3025-01-02' }),
      ],
    });
    const before = storedRow();

    const result = await run(hireOffer(OFFER_ID), 'cmd-expired');

    expect(result).toStrictEqual({ kind: 'rejected', reason: 'offer-expired' });
    await expectNothingMoved('cmd-expired', before);
  });

  it('debits first: an unaffordable hire enrols nobody and writes nothing', async () => {
    seedSourceRecord({
      personnelMarket: [storedOffer(OFFER_ID, { hireCost: 500_001 })],
    });
    const before = storedRow();
    const eventsBefore = await readCampaignJournalEvents(journal, CAMPAIGN_ID);

    const result = await run(hireOffer(OFFER_ID), 'cmd-broke');

    expect(result).toStrictEqual({
      kind: 'rejected',
      reason: 'insufficient-funds',
    });
    expect(await readCampaignJournalEvents(journal, CAMPAIGN_ID)).toHaveLength(
      eventsBefore.length,
    );
    await expectNothingMoved('cmd-broke', before);
  });

  it('refuses a second hire of the same offer even if a stale save restored it', async () => {
    seedSourceRecord({ personnelMarket: [storedOffer(OFFER_ID)] });
    expect((await run(hireOffer(OFFER_ID), 'cmd-first')).kind).toBe(
      'committed',
    );
    // A whole-envelope PUT built before the hire puts the offer back.
    seedSourceRecord(
      { personnelMarket: [storedOffer(OFFER_ID)] },
      { version: 9 },
    );
    const before = storedRow();

    const result = await run(
      { ...hireOffer(OFFER_ID), intentId: 'intent-again' },
      'cmd-second',
    );

    expect(result).toStrictEqual({
      kind: 'rejected',
      reason: 'offer-consumed',
    });
    await expectNothingMoved('cmd-second', before);
  });

  it('answers a retried command as a duplicate without moving the row again', async () => {
    seedSourceRecord({ personnelMarket: [storedOffer(OFFER_ID)] });
    expect((await run(hireOffer(OFFER_ID), 'cmd-once')).kind).toBe('committed');
    const after = storedRow();

    const retry = await run(hireOffer(OFFER_ID), 'cmd-once');

    expect(retry).toStrictEqual({ kind: 'duplicate', commandId: 'cmd-once' });
    expect(storedRow()).toStrictEqual(after);
  });

  it.each([
    ['no campaigns row', null],
    ['a replica row', 'replica'],
    ['a body with no readable clock', 'no-clock'],
  ])('refuses when the source holds %s', async (_label, variant) => {
    if (variant === 'replica') {
      seedSourceRecord(
        { personnelMarket: [storedOffer(OFFER_ID)] },
        {
          instanceId: 'instance-replica',
          authority: {
            role: 'replica',
            sourceInstanceId: 'src-1',
            grantId: 'grant-1',
            scopes: ['campaign'],
          },
        },
      );
    } else if (variant === 'no-clock') {
      seedSourceRecord({
        personnelMarket: [storedOffer(OFFER_ID)],
        currentDate: undefined,
      });
    }
    const eventsBefore = await readCampaignJournalEvents(journal, CAMPAIGN_ID);

    const result = await run(hireOffer(OFFER_ID), 'cmd-no-source');

    expect(result).toStrictEqual({
      kind: 'rejected',
      reason: 'offer-source-unavailable',
    });
    expect(await readCampaignJournalEvents(journal, CAMPAIGN_ID)).toHaveLength(
      eventsBefore.length,
    );
    expect(await journal.getCommandReceipt('cmd-no-source')).toBeNull();
  });

  it('refuses a HirePilot, whatever recruit and price it names', async () => {
    seedSourceRecord({ personnelMarket: [storedOffer(OFFER_ID)] });
    const before = storedRow();

    const result = await run(
      {
        campaignId: CAMPAIGN_ID,
        intentId: 'intent-forged',
        kind: 'HirePilot',
        payload: { pilot: { pilotId: 'p-forged', name: 'Forged' }, cost: 0 },
      },
      'cmd-forged',
    );

    expect(result).toStrictEqual({
      kind: 'rejected',
      reason: 'hire-requires-market-offer',
    });
    await expectNothingMoved('cmd-forged', before);
  });
});
