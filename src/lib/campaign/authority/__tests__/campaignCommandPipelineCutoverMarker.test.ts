/**
 * The command pipeline reports its first commit to the cutover marker
 * (design-campaign-authority-and-sync task 5.7; design D10).
 *
 * D10's rollback law has two guards, and the first one — "no
 * journal-authority command has committed" — reads a field nothing was
 * writing. `recordFirstJournalAuthorityCommand` existed and was correct;
 * the command pipeline simply never called it, so
 * `firstJournalAuthorityCommandId` stayed null for the life of every
 * campaign and the guard could not fire. A rollback would then fall
 * through to the second guard (journal head vs imported baseline), which
 * is a real check but a DIFFERENT one: it cannot tell a campaign that
 * merely replayed its baseline apart from one whose owner has been
 * issuing commands against the journal.
 *
 * These rows are written against real SQLite rather than a seam, because
 * the marker and the journal append have to land on the same database
 * handle the route already opens — a seam would have proven the wiring in
 * a world the production route does not live in.
 */

import type { ICampaignIntent } from '@/types/campaign/CampaignSync';

import {
  advanceAfterShadowParity,
  evaluateShadowParity,
  importCampaignBaseline,
  rollbackToSnapshotAuthority,
  type ICampaignCutoverMarker,
} from '@/lib/campaign/authority/campaignAuthorityMigration';
import { executeCampaignCommand } from '@/lib/campaign/authority/campaignCommandPipeline';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import {
  readCampaignMigrationMarker,
  writeCampaignMigrationMarker,
} from '@/services/campaignPersistence/CampaignMigrationMarkerStore';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';

import type { ICampaignJournalEnvelope } from '../../sync/JournalCampaignEventStore';
import type { CampaignAuthorityMode } from '../campaignAuthorityMode';

import { JournalCampaignEventStore } from '../../sync/JournalCampaignEventStore';

const NOW = '3025-01-03T00:00:00.000Z';
const CAMPAIGN_ID = 'campaign-cutover-marker';
const AUTHOR = 'pid-operator';
const OPENING_BALANCE = 1_000_000;

const JOURNAL_AUTHORITY: CampaignAuthorityMode = { kind: 'journal' };
const SNAPSHOT_AUTHORITY: CampaignAuthorityMode = { kind: 'snapshot' };

function spend(amount: number, intentId = 'intent-1'): ICampaignIntent {
  return {
    campaignId: CAMPAIGN_ID,
    intentId,
    kind: 'SpendFunds',
    payload: { amount, reason: 'repairs' },
  } as unknown as ICampaignIntent;
}

describe('command pipeline records the first journal-authority command', () => {
  let journal: SQLiteEventJournal<ICampaignJournalEnvelope>;

  /**
   * Walks the real migration path rather than stamping a marker: import a
   * baseline (which is what puts events in the journal at all), prove
   * parity against the same state, and advance. A campaign that reached
   * `journal` any other way would not have an imported baseline for the
   * rollback rows below to be about.
   */
  async function migrateToJournalAuthority(): Promise<ICampaignCutoverMarker> {
    const state = {
      ...createEmptyCampaignState(CAMPAIGN_ID),
      balance: OPENING_BALANCE,
    };
    const imported = await importCampaignBaseline(journal, {
      campaignId: CAMPAIGN_ID,
      state,
      sourceSnapshotRevision: 1,
      importedAt: NOW,
    });
    if (imported.kind !== 'imported') throw new Error(imported.kind);

    const store = new JournalCampaignEventStore(journal);
    const replayed = await store.getEvents(CAMPAIGN_ID, 0);
    expect(replayed.length).toBeGreaterThan(0);

    const advanced = advanceAfterShadowParity(
      imported.marker,
      evaluateShadowParity(state, state),
    );
    if (advanced.kind !== 'ok') throw new Error(advanced.kind);
    expect(advanced.marker.state).toBe('journal');
    writeCampaignMigrationMarker(advanced.marker);
    return advanced.marker;
  }

  function storedMarker(): ICampaignCutoverMarker {
    const read = readCampaignMigrationMarker(CAMPAIGN_ID);
    if (read.kind !== 'ok') throw new Error(read.kind);
    return read.marker;
  }

  function run(
    intent: ICampaignIntent,
    commandId: string,
    authority: CampaignAuthorityMode = JOURNAL_AUTHORITY,
  ) {
    return executeCampaignCommand(
      { journal, authority },
      {
        campaignId: CAMPAIGN_ID,
        intent,
        authorPlayerId: AUTHOR,
        commandId,
        ts: NOW,
      },
    );
  }

  beforeEach(() => {
    resetSQLiteService();
    getSQLiteService({ path: ':memory:' }).initialize();
    journal = new SQLiteEventJournal<ICampaignJournalEnvelope>(
      getSQLiteService().getDatabase(),
      () => NOW,
    );
  });

  afterEach(() => {
    resetSQLiteService();
  });

  it('records a committed command on the durable marker', async () => {
    await migrateToJournalAuthority();

    const result = await run(spend(250_000), 'cmd-first');

    expect(result.kind).toBe('committed');
    expect(storedMarker().firstJournalAuthorityCommandId).toBe('cmd-first');
  });

  it('records only the FIRST command, not the latest one', async () => {
    // The field is provenance, not a cursor. Overwriting it with each
    // commit would make a campaign look freshly cut over forever.
    await migrateToJournalAuthority();
    await run(spend(10_000), 'cmd-first');

    const second = await run(spend(10_000, 'intent-2'), 'cmd-second');

    expect(second.kind).toBe('committed');
    expect(storedMarker().firstJournalAuthorityCommandId).toBe('cmd-first');
  });

  it('leaves the marker alone for a campaign still on snapshot authority', async () => {
    // A `shadowing` campaign keeps the snapshot authoritative, so nothing
    // it does is a journal-authority command — recording one would forbid
    // a rollback the campaign is still entitled to.
    const state = {
      ...createEmptyCampaignState(CAMPAIGN_ID),
      balance: OPENING_BALANCE,
    };
    const imported = await importCampaignBaseline(journal, {
      campaignId: CAMPAIGN_ID,
      state,
      sourceSnapshotRevision: 1,
      importedAt: NOW,
    });
    if (imported.kind !== 'imported') throw new Error(imported.kind);
    writeCampaignMigrationMarker(imported.marker);

    const result = await run(spend(10_000), 'cmd-snapshot', SNAPSHOT_AUTHORITY);

    expect(result.kind).toBe('blocked');
    expect(storedMarker().state).toBe('shadowing');
    expect(storedMarker().firstJournalAuthorityCommandId).toBeNull();
  });

  it('leaves the marker untouched when the command never commits', async () => {
    // The record is a fact about a commit. A command the campaign
    // refused is not one, and a marker that recorded it would close off
    // rollback on the strength of something that never happened.
    await migrateToJournalAuthority();

    const result = await run(spend(OPENING_BALANCE * 5), 'cmd-unaffordable');

    expect(result.kind).toBe('rejected');
    expect(storedMarker().firstJournalAuthorityCommandId).toBeNull();
  });

  it('refuses a rollback once a journal-authority command has committed', async () => {
    // The whole point of the field. The reason has to be the COMMAND
    // guard: a rollback refused only because the head moved cannot tell
    // an owner that their own commands are what closed the door.
    await migrateToJournalAuthority();
    await run(spend(250_000), 'cmd-first');

    const store = new JournalCampaignEventStore(journal);
    const decision = rollbackToSnapshotAuthority(
      storedMarker(),
      await store.highestSequence(CAMPAIGN_ID),
    );

    expect(decision).toEqual({
      kind: 'rollback-prohibited',
      reason: 'journal-authority-command-committed',
    });
  });
});
