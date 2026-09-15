/**
 * Task 6.1 / P0b, the clause the private-envelope slices left open: the
 * SOURCE MATERIALIZATION of the `campaigns` row is fenced.
 *
 * `spec.md:111` requires that "Borrowed-handle campaign writes SHALL use CAS
 * and a `sourceReplayFence` that rejects later generic whole-envelope
 * overwrites", and `design.md:104` places that fence beside the existing
 * `baseVersion` CAS in `CampaignPersistenceService.ts`. Before this slice the
 * borrowed-handle write landed by 6.2a-3 was an unconditional
 * `UPDATE campaigns SET payload = ?, version = ? WHERE id = ?`: it carried no
 * CAS predicate, recorded no watermark, and left a later whole-envelope PUT
 * free to clobber a materialization it had never seen as long as it happened
 * to hold the right `baseVersion`.
 *
 * Predicted red before the product edit:
 *  - (a) the committed row carries no `sourceReplayFence` at all;
 *  - (b) `materializeCampaignSourceRow` does not exist, so a replay of the
 *        SAME journal prefix has nothing to make it a no-op;
 *  - (b2) the same, with the STALE row version a real replay driver would
 *        hold. This row is what makes the fence-before-CAS ordering
 *        falsifiable rather than merely asserted: it is the only row whose
 *        version predicate is true when the fence block is reached, so
 *        swapping those two blocks turns it - and only it - red;
 *  - (c) a replay standing BEHIND the row's watermark has nothing to refuse
 *        it, so it would re-apply and regress the row;
 *  - (d) the write has no CAS predicate, so a rival whole-envelope PUT that
 *        already won is silently overwritten rather than conflicted;
 *  - (f) a whole-envelope PUT carrying the correct `baseVersion` but no
 *        fence overwrites the materialized row and drops the mission.
 * (e) passes before and after: the P0a prepared-transaction baseline capture
 * is 6.2a-3's, and this file pins it against the new write so the fence and
 * the baseline cannot drift apart. Its assertion is the discriminating one --
 * the captured `sourceRowVersion` is the PRE-materialization version, which
 * is only true if the capture happened inside the same transaction, before
 * the row moved.
 *
 * Real SQLite on a temp file with a cold reopen, because every property here
 * is durable: a fence that lives only in process memory fences nothing.
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
import type { ICampaignIntent } from '@/types/campaign/CampaignSync';
import type { IContract, IMission } from '@/types/campaign/Mission';
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import { readCampaignJournalEvents } from '@/lib/campaign/sync/campaignJournalReads';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import { saveCampaign } from '@/services/campaignPersistence/CampaignPersistenceService';
import { materializeCampaignSourceRow } from '@/services/campaignPersistence/campaignSourceMaterialization';
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
import { campaignSourcePrivateOf } from '../campaignSourcePrivateEnvelope';

const NOW = '3025-01-03T00:00:00.000Z';
const CAMPAIGN_ID = 'campaign-replay-fence';
const AUTHOR = 'pid-solo';
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
  readonly name?: string;
  readonly missions?: ReadonlyArray<readonly [string, IMission]>;
  readonly contractMarket?: ICampaignContractMarket;
};

function readRow(db: Database.Database): StoredRow {
  return db
    .prepare('SELECT version, payload FROM campaigns WHERE id = ?')
    .get(CAMPAIGN_ID) as StoredRow;
}

function recordOf(row: StoredRow): SerializedCampaign {
  return JSON.parse(row.payload) as SerializedCampaign;
}

function bodyOf(row: StoredRow): StoredBody {
  return (JSON.parse(row.payload) as { readonly body: StoredBody }).body;
}

describe('source materialization is fenced against replay and overwrite', () => {
  let directory: string;
  let databasePath: string;
  let journal: SQLiteEventJournal<ICampaignJournalEnvelope>;

  beforeEach(async () => {
    directory = await mkdtemp(path.join(tmpdir(), 'camp-replay-fence-'));
    databasePath = path.join(directory, 'replay-fence.db');
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
  function seedSourceRecord(body: Record<string, unknown>): void {
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

  function seedOneOffer(): void {
    seedSourceRecord({
      missions: [],
      contractMarket: {
        offers: [offer(STORED_ID), offer('contract-remaining')],
        declinedOfferIds: ['contract-declined'],
      },
    });
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

  /** Accept the seeded offer and hand back the materialized row. */
  async function materializeOnce(): Promise<StoredRow> {
    seedOneOffer();
    const result = await run(acceptContract(STORED_ID), 'cmd-accept');
    expect(result.kind).toBe('committed');
    return readRow(getSQLiteService().getDatabase());
  }

  it('(a) stamps a durable replay fence on the row it materializes, under CAS', async () => {
    const row = await materializeOnce();
    const events = await readCampaignJournalEvents(journal, CAMPAIGN_ID);

    // The fence is the journal revision the row was materialized THROUGH:
    // every event that existed when the acceptance committed. It is NOT the
    // private baseline's `rootPublicRevision`, which is the PRE-append
    // capture point, and it is NOT the row `version`.
    expect(recordOf(row).sourceReplayFence).toStrictEqual({
      rootPublicRevision: events.length,
    });
    expect(row.version).toBe(SEEDED_VERSION + 1);

    // Cold reopen: the fence is durable, not in-process state.
    resetSQLiteService();
    const reopened = new Database(databasePath);
    const cold = reopened
      .prepare('SELECT version, payload FROM campaigns WHERE id = ?')
      .get(CAMPAIGN_ID) as StoredRow;
    reopened.close();
    expect(recordOf(cold).sourceReplayFence?.rootPublicRevision).toBe(
      events.length,
    );
  });

  it('(b) makes a replay of the same journal prefix a no-op', async () => {
    const row = await materializeOnce();
    const fence = recordOf(row).sourceReplayFence;
    expect(fence).toBeDefined();
    if (fence === undefined) return;

    const db = getSQLiteService().getDatabase();
    // A replay driver re-running the SAME prefix hands the SAME watermark.
    // The payload it offers is deliberately different, so a write that did
    // happen would be visible; the row must not move at all.
    const replayed = materializeCampaignSourceRow(db, {
      campaignId: CAMPAIGN_ID,
      expectedRowVersion: row.version,
      fenceRevision: fence.rootPublicRevision,
      record: {
        ...recordOf(row),
        body: { ...recordOf(row).body, name: 'REPLAYED OVER THE TOP' },
      },
      nextVersion: row.version + 1,
    });

    expect(replayed).toStrictEqual({
      kind: 'noop',
      reason: 'already-at-fence',
    });
    const after = readRow(db);
    expect(after.version).toBe(row.version);
    expect(after.payload).toBe(row.payload);
  });

  it('(b2) is a no-op at the fence even when the replay version is stale', async () => {
    const row = await materializeOnce();
    const fence = recordOf(row).sourceReplayFence;
    expect(fence).toBeDefined();
    if (fence === undefined) return;

    const db = getSQLiteService().getDatabase();
    // The row that falsifies the ORDERING, not just the outcome. A replay
    // driver re-running an already-applied prefix necessarily holds the
    // version it read BEFORE that materialization moved the row, so this is
    // the real shape of the case row (b) models with a convenient version.
    // Fence-first, this is the same silent no-op. CAS-first, the stale
    // version loses and this returns
    // `{ kind: 'conflict', currentVersion: SEEDED_VERSION + 1 }` - so
    // swapping the two blocks in `materializeCampaignSourceRow` turns this
    // row red, and nothing else in the file notices.
    const replayed = materializeCampaignSourceRow(db, {
      campaignId: CAMPAIGN_ID,
      expectedRowVersion: SEEDED_VERSION,
      fenceRevision: fence.rootPublicRevision,
      record: {
        ...recordOf(row),
        body: { ...recordOf(row).body, name: 'STALE REPLAY OVER THE TOP' },
      },
      nextVersion: SEEDED_VERSION + 1,
    });

    expect(replayed).toStrictEqual({
      kind: 'noop',
      reason: 'already-at-fence',
    });
    const after = readRow(db);
    expect(after.version).toBe(row.version);
    expect(after.payload).toBe(row.payload);
  });

  it('(c) refuses a replay standing behind the row fence, with a typed reason', async () => {
    const row = await materializeOnce();
    const fence = recordOf(row).sourceReplayFence;
    expect(fence).toBeDefined();
    if (fence === undefined) return;

    const db = getSQLiteService().getDatabase();
    const stale = materializeCampaignSourceRow(db, {
      campaignId: CAMPAIGN_ID,
      expectedRowVersion: row.version,
      fenceRevision: fence.rootPublicRevision - 1,
      record: {
        ...recordOf(row),
        body: { ...recordOf(row).body, missions: [] },
      },
      nextVersion: row.version + 1,
    });

    expect(stale).toStrictEqual({
      kind: 'refused',
      reason: 'stale-replay-fence',
    });
    const after = readRow(db);
    expect(after.version).toBe(row.version);
    expect(after.payload).toBe(row.payload);
  });

  it('(d) takes the conflict path when a whole-envelope PUT already won the CAS', async () => {
    seedOneOffer();
    const db = getSQLiteService().getDatabase();
    const before = readRow(db);
    const events = await readCampaignJournalEvents(journal, CAMPAIGN_ID);

    // The rival PUT lands first and takes the row to SEEDED_VERSION + 1.
    const rival = saveCampaign(recordOf(before), SEEDED_VERSION);
    expect(rival.kind).toBe('ok');

    // The materialization still holds the version it read, so its CAS loses.
    const materialized = materializeCampaignSourceRow(db, {
      campaignId: CAMPAIGN_ID,
      expectedRowVersion: SEEDED_VERSION,
      fenceRevision: events.length,
      record: {
        ...recordOf(before),
        body: { ...recordOf(before).body, name: 'MATERIALIZED OVER THE TOP' },
      },
      nextVersion: SEEDED_VERSION + 1,
    });

    expect(materialized).toStrictEqual({
      kind: 'conflict',
      currentVersion: SEEDED_VERSION + 1,
    });
    const after = readRow(db);
    expect(after.version).toBe(SEEDED_VERSION + 1);
    expect(bodyOf(after).name).toBe('Grey Death Legion');
    expect(recordOf(after).sourceReplayFence).toBeUndefined();
  });

  it('(e) captured the P0a baseline under the prepared transaction, before the row moved', async () => {
    const row = await materializeOnce();

    resetSQLiteService();
    const reopened = new Database(databasePath);
    const rows = reopened
      .prepare(
        `SELECT payload_json AS payloadJson FROM event_journal_events
          WHERE stream_id = ? ORDER BY stream_revision`,
      )
      .all(CAMPAIGN_ID) as readonly { payloadJson: string }[];
    reopened.close();
    const carriers = rows.map((one) => ({
      payload: JSON.parse(one.payloadJson) as ICampaignJournalEnvelope,
    }));
    const facts = campaignSourcePrivateOf(carriers[carriers.length - 1]);
    expect(facts).not.toBeNull();
    if (facts === null) return;

    // The discriminating assertion. The baseline records the version the row
    // held BEFORE this acceptance moved it, which is only possible if the
    // read happened inside the same prepared transaction as the append and
    // the fenced row write - `SQLiteEventJournalWriter.appendPreparedWithExtension`.
    expect(facts.baseline.sourceRowVersion).toBe(SEEDED_VERSION);
    expect(row.version).toBe(SEEDED_VERSION + 1);
    // Three numbers that stay distinct: the captured source row version, the
    // pre-append capture revision, and the row's materialization watermark.
    expect(facts.baseline.rootPublicRevision).toBeLessThan(
      recordOf(row).sourceReplayFence?.rootPublicRevision ?? -1,
    );
    // The baseline body is the PRE-acceptance record: it still holds the
    // offer the acceptance consumed, so replay starts from the source record
    // rather than from the compact genesis snapshot.
    expect(facts.baseline.sourceRecordBody).toContain(STORED_ID);
  });

  it('(f) rejects a later generic whole-envelope overwrite that carries no fence', async () => {
    const row = await materializeOnce();
    const materialized = recordOf(row);
    expect(materialized.sourceReplayFence).toBeDefined();

    // A client PUT minted from a campaign it rendered before the acceptance:
    // the `baseVersion` is CURRENT, so the existing CAS lets it through, and
    // the body it carries has no mission and no knowledge of the fence.
    const { sourceReplayFence: _dropped, ...unfenced } = materialized;
    const result = saveCampaign(
      { ...unfenced, body: { ...materialized.body, missions: [] } },
      row.version,
    );

    expect(result.kind).toBe('conflict');
    if (result.kind !== 'conflict') return;
    // The conflict carries the stored record, and that record carries the
    // fence - so the client can see exactly what it was standing behind.
    expect(result.current.sourceReplayFence).toStrictEqual(
      materialized.sourceReplayFence,
    );

    const after = readRow(getSQLiteService().getDatabase());
    expect(after.payload).toBe(row.payload);
    expect(bodyOf(after).missions?.[0]?.[0]).toBe(STORED_ID);
  });
});
