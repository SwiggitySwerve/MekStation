/**
 * Task 6.2a-3 (design D13): the SOURCE RECORD follows the accepted contract
 * in the same committed transaction as the journal append.
 *
 * `spec.md:184-185` requires that "the source's own campaign record -- its
 * missions and its reduced remaining contract market -- and the compact
 * accepted-contract ledger SHALL both follow from that single committed
 * acceptance", and declares the halfway state ("the compact ledger records
 * an acceptance the source record does not") unreachable. After 6.2a the
 * reduced market existed only inside the journal's PRIVATE envelope and the
 * `campaigns` row was never touched, so that unreachable state was exactly
 * what a committed acceptance produced.
 *
 * Predicted red before the product edit:
 *  - (a) the row's `missions` stays empty, its market keeps the offer, and
 *        its `version` does not move;
 *  - (c) an unreadable stored payload throws `SyntaxError` out of the
 *        prepared transaction instead of refusing `source-record-absent`;
 *  - (d) a SECOND actor accepting the same offer commits again, because the
 *        market it reads still holds it (carry-forward R5);
 *  - (f) a record whose authority parses as a REPLICA commits, because the
 *        row write did not honor the D2 source-mutation gate every other
 *        writer of the `campaigns` table runs (review RE-1);
 *  - (g) an offer that is an object but not a contract throws
 *        `EventJournalCanonicalizationError: JCS cannot represent undefined`
 *        out of the prepared transaction, untyped (review RE-2);
 *  - (h) a contract-SHAPED offer whose `paymentTerms` is `{}` COMMITS, and
 *        is copied into the source record verbatim (review RE-2).
 * (b) passes before and after — it is the atomicity pin that the new write
 * must not break.
 *
 * The red was captured in two runs, not one over this file as it stands:
 * rows (a)-(e) against the base product file at b46433b1f (`red.log`), and
 * rows (f)/(g)/(h) against the post-split product file
 * (`red-review-edits.log`). Each row's red is real; no single run covers
 * all of them, because the later rows did not exist at the earlier base.
 *
 * Real SQLite on a temp file, with a cold reopen, because the property under
 * test is transactional and durable: an in-memory journal has no transaction
 * for the row write to share and no file for the reopen to prove.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D12, D13)
 * @spec openspec/changes/design-campaign-authority-and-sync/specs/campaign-authority/spec.md
 */

import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { ICampaignJournalEnvelope } from '@/lib/campaign/sync/JournalCampaignEventStore';
import type { ICampaignContractMarket } from '@/types/campaign/CampaignCommandExtensions';
import type {
  ICampaignAuthoritativeState,
  ICampaignEvent,
  ICampaignIntent,
} from '@/types/campaign/CampaignSync';
import type { IContract, IMission } from '@/types/campaign/Mission';
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import { replayCampaignEvents } from '@/lib/campaign/sync/applyCampaignEvent';
import { readCampaignJournalEvents } from '@/lib/campaign/sync/campaignJournalReads';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import { saveCampaign } from '@/services/campaignPersistence/CampaignPersistenceService';
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

import { appendDurableAcceptContract } from '../campaignAcceptContractCommand';
import { importCampaignBaseline } from '../campaignAuthorityMigration';
import { executeCampaignCommand } from '../campaignCommandPipeline';

const NOW = '3025-01-03T00:00:00.000Z';
const CAMPAIGN_ID = 'campaign-source-row';
const AUTHOR = 'pid-solo';
const OTHER_AUTHOR = 'pid-guest';
const STORED_ID = 'contract-stored';
const SEEDED_VERSION = 7;
const JOURNAL_AUTHORITY: CampaignAuthorityMode = { kind: 'journal' };

/** A market offer, in the PENDING status `buildContractRecord` mints. */
function offer(id: string, employerId = 'house-davion'): IContract {
  return {
    id,
    name: `Garrison duty (${id})`,
    status: MissionStatus.PENDING,
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

type StoredRow = { readonly version: number; readonly payload: string };
type StoredBody = {
  readonly missions?: ReadonlyArray<readonly [string, IMission]>;
  readonly contractMarket?: ICampaignContractMarket;
};

function readRow(db: Database.Database): StoredRow {
  return db
    .prepare('SELECT version, payload FROM campaigns WHERE id = ?')
    .get(CAMPAIGN_ID) as StoredRow;
}

function bodyOf(row: StoredRow): StoredBody {
  return (JSON.parse(row.payload) as { readonly body: StoredBody }).body;
}

describe('accepted contract materializes into the source record', () => {
  let directory: string;
  let databasePath: string;
  let journal: SQLiteEventJournal<ICampaignJournalEnvelope>;

  beforeEach(async () => {
    directory = await mkdtemp(path.join(tmpdir(), 'camp-source-row-'));
    databasePath = path.join(directory, 'source-row.db');
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

  /**
   * Write the campaigns row exactly as the whole-envelope PUT leaves it.
   *
   * `recordExtras` lands at the ENVELOPE level, beside `version` and
   * `savedAt`, which is where `authority` and `instanceId` live. The default
   * is none, so every row here is a pre-D2-shaped record with no parseable
   * authority - the shape the source read must stay tolerant of.
   */
  function seedSourceRecord(
    body: Record<string, unknown>,
    recordExtras: Record<string, unknown> = {},
  ): void {
    const record = {
      campaignId: CAMPAIGN_ID,
      version: SEEDED_VERSION,
      schemaVersion: 1,
      body: {
        id: CAMPAIGN_ID,
        name: 'Grey Death Legion',
        factionId: 'mercenary',
        currentDate: '3025-01-03',
        finances: { balance: 1_000_000 },
        ...body,
      },
      savedAt: NOW,
      originDeviceId: 'device-1',
      ...recordExtras,
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
        'Grey Death Legion',
        'mercenary',
        '3025-01-03',
        1_000_000,
        record.savedAt,
        record.originDeviceId,
        JSON.stringify(record),
      );
  }

  /** Overwrite the stored payload with a body no reader can use. */
  function corruptStoredPayload(payload: string): void {
    getSQLiteService()
      .getDatabase()
      .prepare('UPDATE campaigns SET payload = ? WHERE id = ?')
      .run(payload, CAMPAIGN_ID);
  }

  function run(intent: ICampaignIntent, commandId: string, author = AUTHOR) {
    return executeCampaignCommand(
      { journal, authority: JOURNAL_AUTHORITY },
      {
        campaignId: CAMPAIGN_ID,
        intent,
        authorPlayerId: author,
        commandId,
        ts: NOW,
      },
    );
  }

  it('(a) writes the mission and the reduced market into the row, and advances its version', async () => {
    const stored = offer(STORED_ID);
    const remaining = offer('contract-remaining');
    seedSourceRecord({
      missions: [],
      contractMarket: {
        offers: [stored, remaining],
        declinedOfferIds: ['contract-declined'],
      },
    });

    const result = await run(acceptContract(STORED_ID), 'cmd-accept');
    expect(result.kind).toBe('committed');

    const row = readRow(getSQLiteService().getDatabase());
    const body = bodyOf(row);
    // The client's `acceptContractOffer` adds `[id, contract]` to the
    // missions map with `status: ACTIVE` and filters the offer out of the
    // market. The source now produces exactly that, from the commit.
    expect(body.missions).toStrictEqual([
      [STORED_ID, { ...JSON.parse(JSON.stringify(stored)), status: 'Active' }],
    ]);
    expect(body.contractMarket?.offers.map((one) => one.id)).toStrictEqual([
      remaining.id,
    ]);
    expect(body.contractMarket?.declinedOfferIds).toStrictEqual([
      'contract-declined',
    ]);
    expect(row.version).toBe(SEEDED_VERSION + 1);
    // The envelope's own `version` is what GET hands the client and what the
    // client sends back as `baseVersion`, so it must move with the column.
    expect(
      (JSON.parse(row.payload) as { readonly version: number }).version,
    ).toBe(SEEDED_VERSION + 1);

    // Task 6.4's documented exposure, pinned rather than solved: a client
    // still holding the pre-acceptance base version loses the CAS.
    const stale = saveCampaign(
      JSON.parse(row.payload) as SerializedCampaign,
      SEEDED_VERSION,
    );
    expect(stale.kind).toBe('conflict');

    // Cold reopen: the row write is durable, not in-process state.
    resetSQLiteService();
    const reopened = new Database(databasePath);
    const cold = reopened
      .prepare('SELECT version, payload FROM campaigns WHERE id = ?')
      .get(CAMPAIGN_ID) as StoredRow;
    reopened.close();
    expect(cold.version).toBe(SEEDED_VERSION + 1);
    expect(bodyOf(cold).missions?.[0]?.[0]).toBe(STORED_ID);
    expect(
      bodyOf(cold).contractMarket?.offers.map((one) => one.id),
    ).toStrictEqual([remaining.id]);
  });

  it('(b) leaves the row untouched when the append loses its revision', async () => {
    seedSourceRecord({
      missions: [],
      contractMarket: { offers: [offer(STORED_ID)], declinedOfferIds: [] },
    });
    const db = getSQLiteService().getDatabase();
    const before = readRow(db);
    const events = await readCampaignJournalEvents(journal, CAMPAIGN_ID);
    const priorState: ICampaignAuthoritativeState = replayCampaignEvents(
      CAMPAIGN_ID,
      events,
    );

    // Called directly with an EMPTY prior history while the stream already
    // holds the imported baseline: `toJournalBatch` pins `expectedRevision`
    // to the first event's sequence, so the append lands on revision 0 and
    // the journal's head says 1. That is the lost-race arm, forced
    // deterministically, and it runs AFTER `prepare` has read the market -
    // the only window a partial row write could exist in.
    const intent = acceptContract(STORED_ID) as Extract<
      ICampaignIntent,
      { kind: 'AcceptContract' }
    >;
    const outcome = await appendDurableAcceptContract(
      journal,
      {
        campaignId: CAMPAIGN_ID,
        intent,
        authorPlayerId: AUTHOR,
        commandId: 'cmd-lost-race',
        ts: NOW,
      },
      intent,
      [] as readonly ICampaignEvent[],
      priorState,
    );

    expect(outcome.kind).toBe('refused');
    if (outcome.kind !== 'refused') return;
    expect(outcome.result.kind).toBe('conflict');
    const after = readRow(db);
    expect(after.version).toBe(before.version);
    expect(after.payload).toBe(before.payload);
    expect(await journal.getCommandReceipt('cmd-lost-race')).toBeNull();
    expect(await readCampaignJournalEvents(journal, CAMPAIGN_ID)).toHaveLength(
      events.length,
    );
  });

  it('(c) refuses a malformed stored body as source-record-absent, appending nothing', async () => {
    seedSourceRecord({
      missions: [],
      contractMarket: { offers: [offer(STORED_ID)], declinedOfferIds: [] },
    });
    const db = getSQLiteService().getDatabase();
    corruptStoredPayload('{ this is not json');
    const before = readRow(db);

    const result = await run(acceptContract(STORED_ID), 'cmd-corrupt');

    // Typed, not a thrown SyntaxError surfacing as an untyped 500
    // (carry-forward R2): an unreadable source record is the same fact to
    // the caller as a missing one.
    expect(result).toStrictEqual({
      kind: 'offer-not-durable',
      contractId: STORED_ID,
      reason: 'source-record-absent',
    });
    expect(await journal.getCommandReceipt('cmd-corrupt')).toBeNull();
    const after = readRow(db);
    expect(after.payload).toBe(before.payload);
    expect(after.version).toBe(before.version);
  });

  it('(f) refuses a stored record whose authority parses as a replica, appending nothing', async () => {
    seedSourceRecord(
      {
        missions: [],
        contractMarket: { offers: [offer(STORED_ID)], declinedOfferIds: [] },
      },
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
    const db = getSQLiteService().getDatabase();
    const before = readRow(db);

    const result = await run(acceptContract(STORED_ID), 'cmd-replica');

    // RE-1. Every other writer of this table runs the D2 source-mutation
    // gate first (`saveCampaign` through `prepareCampaignWrite`,
    // `storeRedeemedReplica` through its would-overwrite-source refusal).
    // The row write this slice added is a NEW writer, so it honors the same
    // gate rather than being the one door into `campaigns` that skips it.
    expect(result).toStrictEqual({
      kind: 'offer-not-durable',
      contractId: STORED_ID,
      reason: 'source-record-absent',
    });
    expect(await journal.getCommandReceipt('cmd-replica')).toBeNull();
    const after = readRow(db);
    expect(after.payload).toBe(before.payload);
    expect(after.version).toBe(before.version);
  });

  it('(d) refuses a SECOND actor accepting the offer the first acceptance consumed', async () => {
    seedSourceRecord({
      missions: [],
      contractMarket: { offers: [offer(STORED_ID)], declinedOfferIds: [] },
    });

    const first = await run(acceptContract(STORED_ID), 'cmd-first', AUTHOR);
    expect(first.kind).toBe('committed');

    // Carry-forward R5: command identity is actor-scoped, so a different
    // actor's retry is NOT a duplicate. The reduced market in the row is
    // what stops it.
    const second = await run(
      acceptContract(STORED_ID),
      'cmd-second-actor',
      OTHER_AUTHOR,
    );
    expect(second).toStrictEqual({
      kind: 'offer-not-durable',
      contractId: STORED_ID,
      reason: 'offer-absent',
    });
    expect(await journal.getCommandReceipt('cmd-second-actor')).toBeNull();
  });

  it('(g) refuses an offer that is an object but not a contract, appending nothing', async () => {
    seedSourceRecord({
      missions: [],
      // Passes the market's own shape guard - it IS an object with the
      // right id - and `isContract` is false, so `rehydrateCampaignMission`
      // hands it back untouched and every field the commit needs is
      // undefined.
      contractMarket: { offers: [{ id: STORED_ID }], declinedOfferIds: [] },
    });
    const db = getSQLiteService().getDatabase();
    const before = readRow(db);

    const result = await run(acceptContract(STORED_ID), 'cmd-not-a-contract');

    // RE-2. This reached `computeCampaignStateDigest` and threw
    // `EventJournalCanonicalizationError: JCS cannot represent undefined`
    // out of the prepared transaction - untyped, exactly the fault class
    // rows (c)/(c2)/(c3) exist to remove.
    expect(result).toStrictEqual({
      kind: 'offer-not-durable',
      contractId: STORED_ID,
      reason: 'offer-absent',
    });
    expect(await journal.getCommandReceipt('cmd-not-a-contract')).toBeNull();
    const after = readRow(db);
    expect(after.payload).toBe(before.payload);
    expect(after.version).toBe(before.version);
  });

  it('(h) refuses a contract-shaped offer whose payment terms are unreadable, appending nothing', async () => {
    seedSourceRecord({
      missions: [],
      contractMarket: {
        // `isContract` passes: `paymentTerms` is an object and non-null.
        // Rehydration turns the missing amounts into `Money.ZERO`, so the
        // command used to COMMIT and write this offer into the row verbatim
        // - a mission whose payment terms say nothing, presented as a
        // contract the campaign accepted.
        offers: [
          {
            ...(JSON.parse(JSON.stringify(offer(STORED_ID))) as Record<
              string,
              unknown
            >),
            paymentTerms: {},
          },
        ],
        declinedOfferIds: [],
      },
    });
    const db = getSQLiteService().getDatabase();
    const before = readRow(db);

    const result = await run(acceptContract(STORED_ID), 'cmd-empty-terms');

    expect(result).toStrictEqual({
      kind: 'offer-not-durable',
      contractId: STORED_ID,
      reason: 'offer-absent',
    });
    expect(await journal.getCommandReceipt('cmd-empty-terms')).toBeNull();
    const after = readRow(db);
    expect(after.payload).toBe(before.payload);
    expect(after.version).toBe(before.version);
  });
});
