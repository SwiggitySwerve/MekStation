/**
 * Campaign rewind-impact preview module (seam 16.1-a), red-first.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/audit-timeline/spec.md
 */

import type Database from 'better-sqlite3';

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { ICampaignJournalEnvelope } from '@/lib/campaign/sync/JournalCampaignEventStore';
import type { ICampaignEvent } from '@/types/campaign/CampaignSync';

import { importCampaignBaseline } from '@/lib/campaign/authority/campaignAuthorityMigration';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

import { UNDERIVABLE_AFFECTED_FAMILIES } from '../GmCampaignAffectedFamilies';
import {
  previewGmCampaignRewind,
  readCampaignJournalForRewindPreview,
} from '../GmCampaignRewindImpactPreview';

const CAMPAIGN_ID = 'campaign-rewind-impact';
const NOW = '3025-01-03T00:00:00.000Z';
const TABLES = [
  'campaigns',
  'campaign_session_participant',
  'event_journal_events',
  'event_journal_batches',
  'private_record',
] as const;

function event<T extends ICampaignEvent['type']>(
  type: T,
  sequence: number,
  payload: Extract<ICampaignEvent, { type: T }>['payload'],
): ICampaignEvent {
  return {
    type,
    sequence,
    campaignId: CAMPAIGN_ID,
    ts: NOW,
    authorPlayerId: 'gm',
    scope: 'campaign',
    payload,
  } as ICampaignEvent;
}

const BASELINE = event('CampaignSnapshotPublished', 0, {
  state: { ...createEmptyCampaignState(CAMPAIGN_ID), balance: 1_000_000 },
  revision: 0,
});

function census(db: Database.Database): Record<string, number> {
  return Object.fromEntries(
    TABLES.map((table) => [
      table,
      (db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get() as { c: number })
        .c,
    ]),
  );
}

describe('previewGmCampaignRewind', () => {
  it('a preview declares the families its own diff found and names the underivable ten', async () => {
    const result = await previewGmCampaignRewind({
      campaignId: CAMPAIGN_ID,
      cutoff: 1,
      role: 'gm',
      readEvents: async () => [
        BASELINE,
        event('FundsChanged', 1, {
          delta: -250_000,
          reason: 'repairs',
          balance: 750_000,
        }),
      ],
    });
    expect(result).toMatchObject({
      kind: 'preview',
      families: ['finances'],
      currentRevision: 2,
    });
    if (result.kind !== 'preview') throw new Error('expected preview');
    expect(result.underivable).toEqual([...UNDERIVABLE_AFFECTED_FAMILIES]);

    // salvagePool is not a root field, so this diff must stay empty
    // rather than defaulting to all eighteen families.
    const salvageOnly = await previewGmCampaignRewind({
      campaignId: CAMPAIGN_ID,
      cutoff: 1,
      role: 'gm',
      readEvents: async () => [
        BASELINE,
        event('SalvageAllocated', 1, { value: 10, poolRemaining: 40 }),
      ],
    });
    expect(salvageOnly.kind).toBe('preview');
    if (salvageOnly.kind !== 'preview') throw new Error('expected preview');
    expect(salvageOnly.families).toStrictEqual([]);
    expect(salvageOnly.underivable).toEqual([...UNDERIVABLE_AFFECTED_FAMILIES]);
  });

  it('a cutoff equal to the current revision is refused cutoff-is-current', async () => {
    await expect(
      previewGmCampaignRewind({
        campaignId: CAMPAIGN_ID,
        cutoff: 1,
        role: 'gm',
        readEvents: async () => [BASELINE],
      }),
    ).resolves.toMatchObject({
      kind: 'refused',
      reason: 'cutoff-is-current',
    });
  });

  it('a preview writes nothing', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'rewind-impact-'));
    resetSQLiteService();
    const service = getSQLiteService({ path: path.join(dir, 'impact.db') });
    service.initialize();
    const journal = new SQLiteEventJournal<ICampaignJournalEnvelope>(
      service.getDatabase(),
      () => NOW,
    );
    const imported = await importCampaignBaseline(journal, {
      campaignId: CAMPAIGN_ID,
      state: { ...createEmptyCampaignState(CAMPAIGN_ID), balance: 1_000_000 },
      sourceSnapshotRevision: 1,
      importedAt: NOW,
    });
    if (imported.kind !== 'imported') throw new Error(imported.kind);
    const before = census(service.getDatabase());
    const result = await previewGmCampaignRewind({
      campaignId: CAMPAIGN_ID,
      cutoff: 0,
      role: 'gm',
      readEvents: readCampaignJournalForRewindPreview,
    });
    expect(result.kind).toBe('preview');
    expect(census(service.getDatabase())).toEqual(before);
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });
});
