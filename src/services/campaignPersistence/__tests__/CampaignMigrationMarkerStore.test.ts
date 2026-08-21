/**
 * Cutover-marker store over a real migrated SQLite database (task 5.2).
 *
 * Pins: migration 9 creates the table on a fresh database; markers
 * round-trip through upsert; a missing row reads as not_found (implicit
 * legacy); corrupt payload surfaces as the tagged variant; and the marker
 * survives a service restart over the same file.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  createJournalNativeMarker,
  createLegacyMarker,
} from '@/lib/campaign/authority/campaignAuthorityMigration';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

import {
  readCampaignMigrationMarker,
  writeCampaignMigrationMarker,
} from '../CampaignMigrationMarkerStore';

describe('CampaignMigrationMarkerStore', () => {
  let directory: string;
  let dbPath: string;

  beforeEach(() => {
    directory = mkdtempSync(path.join(tmpdir(), 'campaign-marker-'));
    dbPath = path.join(directory, 'markers.db');
    resetSQLiteService();
    getSQLiteService({ path: dbPath }).initialize();
  });

  afterEach(() => {
    resetSQLiteService();
    rmSync(directory, { recursive: true, force: true });
  });

  it('reads not_found for a campaign with no marker (implicit legacy)', () => {
    expect(readCampaignMigrationMarker('campaign-none')).toEqual({
      kind: 'not_found',
    });
  });

  it('round-trips a marker and upserts state changes in place', () => {
    const legacy = createLegacyMarker('campaign-marker');
    writeCampaignMigrationMarker(legacy);
    expect(readCampaignMigrationMarker('campaign-marker')).toEqual({
      kind: 'ok',
      marker: legacy,
    });

    const journal = {
      ...createJournalNativeMarker('campaign-marker'),
      firstJournalAuthorityCommandId: 'cmd-1',
    };
    writeCampaignMigrationMarker(journal);
    expect(readCampaignMigrationMarker('campaign-marker')).toEqual({
      kind: 'ok',
      marker: journal,
    });
  });

  it('surfaces corrupt payloads as the tagged variant, never a throw', () => {
    writeCampaignMigrationMarker(createLegacyMarker('campaign-corrupt'));
    getSQLiteService()
      .getDatabase()
      .prepare(
        'UPDATE campaign_authority_migration SET payload = ? WHERE campaign_id = ?',
      )
      .run('{not json', 'campaign-corrupt');

    expect(readCampaignMigrationMarker('campaign-corrupt')).toEqual({
      kind: 'corrupt',
      campaignId: 'campaign-corrupt',
    });
  });

  it('survives a service restart over the same database file', () => {
    const marker = createJournalNativeMarker('campaign-restart');
    writeCampaignMigrationMarker(marker);

    resetSQLiteService();
    getSQLiteService({ path: dbPath }).initialize();

    expect(readCampaignMigrationMarker('campaign-restart')).toEqual({
      kind: 'ok',
      marker,
    });
  });
});
