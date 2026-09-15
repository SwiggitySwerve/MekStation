/**
 * Task 6.2a (design D13): the stored offer is durable before the command
 * names it.
 *
 * This prefix owns the REFUSAL half: an AcceptContract naming an id no
 * persisted market holds must be turned away, under a read that shares the
 * command's own transaction. Deriving the committed fact from the stored
 * offer is the next prefix.
 *
 * Predicted red before the product edit: such a command still commits,
 * because the pipeline reads no source market at all, and
 * `offer-not-durable` is not a `CampaignCommandResult` member.
 *
 * Real SQLite throughout, on a temp file, because the property under test is
 * transactional: the market read and the append must be ONE immediate
 * transaction, and neither an in-memory journal nor a mock has one.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D13)
 * @spec openspec/changes/design-campaign-authority-and-sync/specs/campaign-authority/spec.md
 */

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { ICampaignJournalEnvelope } from '@/lib/campaign/sync/JournalCampaignEventStore';
import type { ICampaignContractMarket } from '@/types/campaign/CampaignCommandExtensions';
import type { ICampaignIntent } from '@/types/campaign/CampaignSync';
import type { IContract } from '@/types/campaign/Mission';

import { readCampaignJournalEvents } from '@/lib/campaign/sync/campaignJournalReads';
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
});
