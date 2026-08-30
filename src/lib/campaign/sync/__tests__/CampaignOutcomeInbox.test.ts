import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { reconcileCoopBattle } from '@/lib/campaign/coop/reconcileCoopBattle';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import { CampaignHostRegistry } from '@/lib/multiplayer/server/CampaignHostRegistry';
import { CampaignMatchHost } from '@/lib/multiplayer/server/CampaignMatchHost';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';

import {
  _setFailReceiptInsertForTests,
  JournalCampaignEventStore,
  type ICampaignJournalEnvelope,
} from '../JournalCampaignEventStore';

const CAMPAIGN_ID = 'campaign-outcome-inbox';
const HOST_ID = 'host-outcome-inbox';

interface IInboxRow {
  readonly outcome_id: string;
  readonly outcome_version: number;
  readonly first_stream_revision: number;
  readonly last_stream_revision: number;
}

describe('campaign combat outcome inbox', () => {
  let dir: string;
  let dbPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'campaign-outcome-inbox-'));
    dbPath = path.join(dir, 'campaign.db');
    resetSQLiteService();
  });

  afterEach(async () => {
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  function database(): Database.Database {
    getSQLiteService({ path: dbPath }).initialize();
    return getSQLiteService().getDatabase();
  }

  async function openHost(): Promise<{
    readonly host: CampaignMatchHost;
    readonly store: JournalCampaignEventStore;
  }> {
    const journal = new SQLiteEventJournal<ICampaignJournalEnvelope>(
      database(),
      () => '2026-08-29T12:00:00.000Z',
    );
    const store = new JournalCampaignEventStore(journal);
    const host = new CampaignMatchHost({
      campaignId: CAMPAIGN_ID,
      hostPlayerId: HOST_ID,
      eventStore: store,
      initialState: {
        ...createEmptyCampaignState(CAMPAIGN_ID),
        balance: 1_000_000,
      },
    });
    await host.open();
    return { host, store };
  }

  function consequences(outcomeVersion = 1) {
    return {
      campaignId: CAMPAIGN_ID,
      matchId: 'combat-outcome-1',
      outcomeVersion,
      fundsDelta: -25_000,
      fundsReason: 'Repair costs',
      salvageValue: 50_000,
      rosterChanges: [
        {
          unitId: 'unit-1',
          designation: 'Atlas AS7-D',
          status: 'damaged' as const,
        },
      ],
    };
  }

  function inboxRows(): readonly IInboxRow[] {
    return database()
      .prepare(
        `SELECT outcome_id, outcome_version, first_stream_revision,
                last_stream_revision
           FROM campaign_combat_outcome_inbox
          ORDER BY outcome_id, outcome_version`,
      )
      .all() as IInboxRow[];
  }

  it('commits one consequence batch and one durable receipt for duplicate delivery', async () => {
    const { host, store } = await openHost();

    const first = await reconcileCoopBattle(host, consequences());
    expect(first.ok).toBe(true);
    const afterFirst = await store.getEvents(CAMPAIGN_ID);

    const duplicate = await reconcileCoopBattle(host, consequences());
    expect(duplicate).toMatchObject({ ok: true, events: [] });
    expect(await store.getEvents(CAMPAIGN_ID)).toEqual(afterFirst);
    expect(inboxRows()).toEqual([
      {
        outcome_id: 'combat-outcome-1',
        outcome_version: 1,
        first_stream_revision: 2,
        last_stream_revision: 4,
      },
    ]);
  });

  it('rolls back consequences when receipt insertion fails, then applies one batch on redelivery', async () => {
    const { host, store } = await openHost();
    const before = await store.getEvents(CAMPAIGN_ID);

    // The deterministic crash seam: die between the consequence append
    // and the receipt insert, inside the extension transaction. A
    // missing outer transaction would leave journal consequences behind
    // without a receipt. (The first draft drove a CHECK-constraint
    // violation instead; CI's engine build did not throw where the
    // local one did, so the seam is now explicit.)
    _setFailReceiptInsertForTests(true);
    try {
      await expect(reconcileCoopBattle(host, consequences(1))).rejects.toThrow(
        /test-crash-before-receipt-insert/,
      );
    } finally {
      _setFailReceiptInsertForTests(false);
    }
    expect(await store.getEvents(CAMPAIGN_ID)).toEqual(before);
    expect(inboxRows()).toEqual([]);

    await expect(
      reconcileCoopBattle(host, consequences(1)),
    ).resolves.toMatchObject({
      ok: true,
    });
    expect(inboxRows()).toHaveLength(1);
    expect(await store.getEvents(CAMPAIGN_ID)).toHaveLength(before.length + 3);
  });

  it('keeps restart plus outbox replay idempotent and rejects a different version as a typed conflict', async () => {
    const first = await openHost();
    await expect(
      reconcileCoopBattle(first.host, consequences()),
    ).resolves.toMatchObject({
      ok: true,
    });
    const persisted = await first.store.getEvents(CAMPAIGN_ID);
    first.host.close();

    const recovered = await openHost();
    await expect(
      reconcileCoopBattle(recovered.host, consequences()),
    ).resolves.toMatchObject({ ok: true, events: [] });
    expect(await recovered.store.getEvents(CAMPAIGN_ID)).toEqual(persisted);

    await expect(
      reconcileCoopBattle(recovered.host, consequences(2)),
    ).resolves.toMatchObject({
      ok: false,
      conflict: {
        kind: 'outcome-version-conflict',
        outcomeId: 'combat-outcome-1',
        acceptedVersion: 1,
        receivedVersion: 2,
      },
    });
    expect(await recovered.store.getEvents(CAMPAIGN_ID)).toEqual(persisted);
    expect(inboxRows()).toHaveLength(1);
  });

  it('routes SQLite-backed server hosts through the durable inbox', async () => {
    database();
    const registry = new CampaignHostRegistry();
    const entry = await registry.register('campaign-inbox-match', {
      campaignId: CAMPAIGN_ID,
      hostPlayerId: HOST_ID,
      roomCode: 'ABC234',
      state: {
        ...createEmptyCampaignState(CAMPAIGN_ID),
        balance: 1_000_000,
      },
    });
    try {
      expect(entry.host.hasCombatOutcomeInbox()).toBe(true);
      await expect(
        reconcileCoopBattle(entry.host, consequences()),
      ).resolves.toMatchObject({
        ok: true,
      });
      expect(inboxRows()).toHaveLength(1);
    } finally {
      registry.dispose('campaign-inbox-match');
    }
  });
});
