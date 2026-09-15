/**
 * Task 6.2a (design D13): the stored offer is durable before the command
 * names it.
 *
 * Predicted red before the product edit: an AcceptContract naming an id no
 * persisted market holds still commits (the pipeline reads no source market
 * at all), `offer-not-durable` is not a `CampaignCommandResult` member, and
 * the committed compact fact mirrors the caller's contract object.
 *
 * Real SQLite throughout, on a temp file, because the property under test is
 * transactional: the market read and the append must be ONE immediate
 * transaction, and neither an in-memory journal nor a mock has one.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D13)
 * @spec openspec/changes/design-campaign-authority-and-sync/specs/campaign-authority/spec.md
 */

import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { ICampaignJournalEnvelope } from '@/lib/campaign/sync/JournalCampaignEventStore';
import type { ICampaignContractMarket } from '@/types/campaign/CampaignCommandExtensions';
import type { ICampaignIntent } from '@/types/campaign/CampaignSync';
import type { IContract } from '@/types/campaign/Mission';

import { readCampaignJournalEvents } from '@/lib/campaign/sync/campaignJournalReads';
import { CAMPAIGN_STREAM_TYPE } from '@/lib/campaign/sync/JournalCampaignEventStore';
import { ROOT_EVENT_BRANCH_ID } from '@/lib/events/journal/EventJournalContract';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';
import { AtBContractType } from '@/types/campaign/contracts/contractTypes';
import { MissionStatus } from '@/types/campaign/enums/MissionStatus';
import { Money } from '@/types/campaign/Money';
import { createPaymentTerms } from '@/types/campaign/PaymentTerms';
import { AtBMoraleLevel } from '@/types/campaign/scenario/scenarioTypes';

import type { CampaignAuthorityMode } from '../campaignAuthorityMode';

import { importCampaignBaseline } from '../campaignAuthorityMigration';
import { executeCampaignCommand } from '../campaignCommandPipeline';
import {
  CampaignSourcePrivateReplayError,
  campaignSourcePrivateOf,
  replayCampaignSourceContracts,
} from '../campaignSourcePrivateEnvelope';

const NOW = '3025-01-03T00:00:00.000Z';
const CAMPAIGN_ID = 'campaign-offer-durability';
const AUTHOR = 'pid-solo';
const STORED_ID = 'contract-stored';
const JOURNAL_AUTHORITY: CampaignAuthorityMode = { kind: 'journal' };

/** The persisted offer, with the employer the compact fact must carry. */
function offer(id: string, employerId = 'house-davion'): IContract {
  return {
    id,
    name: `Garrison duty (${id})`,
    status: MissionStatus.ACTIVE,
    type: 'contract',
    systemId: 'galatea',
    scenarioIds: [],
    createdAt: NOW,
    updatedAt: NOW,
    employerId,
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
    commandRights: 'Independent',
    moraleLevel: AtBMoraleLevel.OVERWHELMING,
    atbContractType: AtBContractType.GARRISON_DUTY,
  } as IContract;
}

/**
 * The caller's claim, deliberately carrying a DIFFERENT name and employer
 * than the stored offer, so a compact fact derived from it is visible.
 */
function acceptContract(contractId: string): ICampaignIntent {
  return {
    campaignId: CAMPAIGN_ID,
    intentId: `intent-${contractId}`,
    kind: 'AcceptContract',
    payload: {
      contract: {
        contractId,
        name: 'CALLER SUPPLIED NAME',
        employerFactionId: 'caller-supplied-employer',
      },
    },
  };
}

describe('campaign command pipeline contract-offer durability', () => {
  let directory: string;
  let databasePath: string;
  let journal: SQLiteEventJournal<ICampaignJournalEnvelope>;

  beforeEach(async () => {
    directory = await mkdtemp(path.join(tmpdir(), 'camp-offer-durable-'));
    databasePath = path.join(directory, 'durability.db');
    resetSQLiteService();
    getSQLiteService({ path: databasePath }).initialize();
    journal = new SQLiteEventJournal<ICampaignJournalEnvelope>(
      getSQLiteService().getDatabase(),
      () => NOW,
    );
    const imported = await importCampaignBaseline(journal, {
      campaignId: CAMPAIGN_ID,
      state: { ...createEmptyCampaignState(CAMPAIGN_ID), balance: 1_000_000 },
      sourceSnapshotRevision: 1,
      importedAt: NOW,
    });
    if (imported.kind !== 'imported') throw new Error(imported.kind);
  });

  afterEach(async () => {
    resetSQLiteService();
    await rm(directory, { recursive: true, force: true, maxRetries: 3 });
  });

  /** Write the campaigns row exactly as the whole-envelope PUT leaves it. */
  function seedSourceRecord(market: ICampaignContractMarket | null): string {
    const body = {
      name: 'Grey Death Legion',
      factionId: 'mercenary',
      currentDate: '3025-01-03',
      finances: { balance: 1_000_000 },
      missions: [],
      ...(market === null ? {} : { contractMarket: market }),
    };
    const record = {
      campaignId: CAMPAIGN_ID,
      version: 7,
      schemaVersion: 1,
      body,
      savedAt: NOW,
      originDeviceId: 'device-1',
    };
    const payload = JSON.stringify(record);
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
        body.currentDate,
        body.finances.balance,
        record.savedAt,
        record.originDeviceId,
        payload,
      );
    return JSON.stringify(body);
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

  it('refuses an offer the persisted source record does not hold, appending nothing', async () => {
    seedSourceRecord({
      offers: [offer('contract-something-else')],
      declinedOfferIds: [],
    });
    const before = await readCampaignJournalEvents(journal, CAMPAIGN_ID);

    const result = await run(acceptContract(STORED_ID), 'cmd-absent');

    // Distinct from every RULES refusal (`insufficient-standing`): an offer
    // that never reached the source is not one the rules turned down, and a
    // caller that conflates them retries the one that can never succeed.
    expect(result).toStrictEqual({
      kind: 'offer-not-durable',
      contractId: STORED_ID,
      reason: 'offer-absent',
    });
    const after = await readCampaignJournalEvents(journal, CAMPAIGN_ID);
    expect(after).toHaveLength(before.length);
    expect(await journal.getCommandReceipt('cmd-absent')).toBeNull();
  });

  it('refuses when the campaign has no persisted source record at all', async () => {
    const result = await run(acceptContract(STORED_ID), 'cmd-no-row');

    expect(result).toStrictEqual({
      kind: 'offer-not-durable',
      contractId: STORED_ID,
      reason: 'source-record-absent',
    });
    expect(await journal.getCommandReceipt('cmd-no-row')).toBeNull();
  });

  it('reads the market from the persisted body on a FIRST acceptance with no prior private row', async () => {
    const stored = offer(STORED_ID);
    const remaining = offer('contract-remaining');
    const sourceRecordBody = seedSourceRecord({
      offers: [stored, remaining],
      declinedOfferIds: ['contract-declined'],
    });

    // The state the read must survive: a replay of private rows has none
    // to replay, so a stored-baseline read would deadlock this command.
    const before = await journal.readStream({
      streamType: CAMPAIGN_STREAM_TYPE,
      streamId: CAMPAIGN_ID,
      branchId: ROOT_EVENT_BRANCH_ID,
      afterRevision: 0,
      limit: 500,
    });
    expect(() => replayCampaignSourceContracts(before)).toThrow(
      CampaignSourcePrivateReplayError,
    );

    const result = await run(acceptContract(STORED_ID), 'cmd-first');

    expect(result.kind).toBe('committed');
    if (result.kind !== 'committed') return;
    expect(result.events).toHaveLength(1);
    // Server-derived from the STORED offer, never from the caller's
    // object: the employer is the exact opaque `IContract.employerId`.
    expect(result.events[0].payload).toStrictEqual({
      contract: {
        contractId: STORED_ID,
        name: stored.name,
        employerFactionId: stored.employerId,
      },
    });

    // Cold reopen: the private facts are durable, not in-process state.
    resetSQLiteService();
    const reopened = new Database(databasePath);
    const rows = reopened
      .prepare(
        `SELECT payload_json AS payloadJson FROM event_journal_events
          WHERE stream_id = ? ORDER BY stream_revision`,
      )
      .all(CAMPAIGN_ID) as readonly { payloadJson: string }[];
    const carriers = rows.map((row) => ({
      payload: JSON.parse(row.payloadJson) as ICampaignJournalEnvelope,
    }));
    reopened.close();

    const projection = replayCampaignSourceContracts(carriers);
    expect(projection.baseline.sourceRecordBody).toBe(sourceRecordBody);
    expect(projection.baseline.sourceRowVersion).toBe(7);
    expect(projection.acceptedContracts).toHaveLength(1);
    expect(projection.acceptedContracts[0].id).toBe(STORED_ID);
    // The full contract went to the private envelope; the remaining market
    // lost exactly the accepted offer and kept the declines.
    expect(projection.acceptedContracts[0].targetId).toBe(stored.targetId);
    expect(
      projection.remainingMarket.offers.map((one) => one.id),
    ).toStrictEqual([remaining.id]);
    expect(projection.remainingMarket.declinedOfferIds).toStrictEqual([
      'contract-declined',
    ]);
    // The compact wire projection still carries none of it.
    const terminal = carriers[carriers.length - 1];
    expect(campaignSourcePrivateOf(terminal)).not.toBeNull();
    expect(JSON.stringify(terminal.payload.campaignEvent)).not.toContain(
      'paymentTerms',
    );
  });

  it('rolls back completely when the append fails after the in-transaction read', async () => {
    seedSourceRecord({ offers: [offer(STORED_ID)], declinedOfferIds: [] });
    const before = await readCampaignJournalEvents(journal, CAMPAIGN_ID);
    const highWaterBefore = await journal.captureHighWater();
    // Fails INSIDE the transaction, after `prepare` has already read the
    // market — the only window in which a partial write could exist.
    getSQLiteService()
      .getDatabase()
      .exec(
        `CREATE TEMP TRIGGER offer_durability_fail_append
           BEFORE INSERT ON event_journal_events
           BEGIN SELECT RAISE(ABORT, 'injected post-read append failure'); END`,
      );

    // Asserted on the MESSAGE, not via `.rejects.toThrow` /
    // `toBeInstanceOf(Error)`: better-sqlite3's `SqliteError` does not
    // always satisfy `instanceof Error` here (its prototype chain reaches a
    // different realm's `Error` depending on which suites shared the module
    // registry), so both matchers report "did not throw" for a rejection
    // that plainly happened.
    const failure = await run(acceptContract(STORED_ID), 'cmd-rollback').then(
      () => null,
      (error: unknown) => error,
    );
    expect((failure as { name?: string } | null)?.name).toBe('SqliteError');
    expect(String(failure)).toContain('injected post-read append failure');

    getSQLiteService()
      .getDatabase()
      .exec('DROP TRIGGER offer_durability_fail_append');
    const after = await readCampaignJournalEvents(journal, CAMPAIGN_ID);
    expect(after).toHaveLength(before.length);
    expect(await journal.getCommandReceipt('cmd-rollback')).toBeNull();
    expect(await journal.captureHighWater()).toStrictEqual(highWaterBefore);
    // Nothing was consumed: the retry re-reads the same market and still
    // derives its compact fact from the STORED offer.
    const retry = await run(acceptContract(STORED_ID), 'cmd-rollback');
    expect(retry.kind).toBe('committed');
    if (retry.kind !== 'committed') return;
    expect(retry.events[0].payload).toStrictEqual({
      contract: {
        contractId: STORED_ID,
        name: offer(STORED_ID).name,
        employerFactionId: 'house-davion',
      },
    });
  });

  it('closes the window between the market read and the append to a concurrent writer', async () => {
    seedSourceRecord({ offers: [offer(STORED_ID)], declinedOfferIds: [] });
    const rival = new Database(databasePath);
    // Zero timeout so the rival reports the contention instead of waiting
    // the transaction out and hiding it.
    rival.pragma('busy_timeout = 0');
    const rivalOutcome: string[] = [];
    const db = getSQLiteService().getDatabase();
    // A rival whole-envelope PUT that rewrites the SAME offer with a
    // different employer. If it could land between the read and the
    // append, the committed fact would name `rival-employer`.
    const rivalPayload = JSON.stringify({
      campaignId: CAMPAIGN_ID,
      version: 8,
      schemaVersion: 1,
      body: {
        contractMarket: {
          offers: [offer(STORED_ID, 'rival-employer')],
          declinedOfferIds: [],
        },
      },
      savedAt: NOW,
      originDeviceId: 'device-1',
    });
    db.function('offer_durability_rival_write', () => {
      try {
        rival
          .prepare(
            `UPDATE campaigns SET payload = ?, version = version + 1 WHERE id = ?`,
          )
          .run(rivalPayload, CAMPAIGN_ID);
        rivalOutcome.push('committed');
      } catch (cause) {
        rivalOutcome.push(
          (cause as { code?: string }).code ?? 'unknown-failure',
        );
      }
      return 0;
    });
    // Fires between `prepare`'s market read and the committed append.
    db.exec(
      `CREATE TEMP TRIGGER offer_durability_rival
         BEFORE INSERT ON event_journal_events
         WHEN offer_durability_rival_write() = 0 BEGIN SELECT 1; END`,
    );

    const result = await run(acceptContract(STORED_ID), 'cmd-serialized');

    db.exec('DROP TRIGGER offer_durability_rival');
    rival.close();
    expect(result.kind).toBe('committed');
    if (result.kind !== 'committed') return;
    // #1668's `appendPreparedWithExtension` runs `prepare` and the append
    // in ONE `.immediate()` transaction, which takes its write lock at
    // BEGIN. A rival writer therefore cannot land between them: SQLite
    // serializes it, and with no busy timeout that surfaces as SQLITE_BUSY.
    expect(rivalOutcome).toStrictEqual(['SQLITE_BUSY']);
    // And the commit names the market the transaction read, not the one
    // the rival wanted -- the read and the append saw one source state.
    expect(result.events[0].payload).toStrictEqual({
      contract: {
        contractId: STORED_ID,
        name: offer(STORED_ID).name,
        employerFactionId: 'house-davion',
      },
    });
    const survivor = getSQLiteService()
      .getDatabase()
      .prepare('SELECT payload FROM campaigns WHERE id = ?')
      .get(CAMPAIGN_ID) as { payload: string };
    expect(survivor.payload).not.toContain('rival-employer');
  });
});
