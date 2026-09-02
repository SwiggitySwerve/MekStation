/**
 * Seam 2.4: a snapshot written one catalog step short of head must
 * still project the same fields after the real runner finishes.
 * 2.1/2.3 already pin at-head re-apply of named migrations; this file
 * does not restate that no-op.
 */

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import {
  buildSerializedCampaign,
  toCampaignSummary,
} from '@/lib/campaign/persistence/campaignEnvelope';
import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import {
  readCampaign,
  saveCampaign,
} from '@/services/campaignPersistence/CampaignPersistenceService';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { MIGRATIONS } from '@/services/persistence/SQLiteService.migrations';

const HEAD = Math.max(...MIGRATIONS.map((migration) => migration.version));
const PREVIOUS = Math.max(
  ...MIGRATIONS.filter((migration) => migration.version < HEAD).map(
    (migration) => migration.version,
  ),
);

interface ISnapshotProjection {
  readonly schemaVersion: number;
  readonly campaignId: string;
  readonly version: number;
  readonly originDeviceId: string;
  readonly instanceId: string;
  readonly authority: SerializedCampaign['authority'];
  readonly name: string;
  readonly factionId: string;
  readonly currentDate: string;
  readonly balance: number;
  readonly savedAt: string;
}

function projectSnapshot(record: SerializedCampaign): ISnapshotProjection {
  const summary = toCampaignSummary(record);
  return {
    schemaVersion: record.schemaVersion,
    campaignId: record.campaignId,
    version: record.version,
    originDeviceId: record.originDeviceId,
    instanceId: record.instanceId,
    authority: record.authority,
    name: summary.name,
    factionId: summary.factionId,
    currentDate: summary.currentDate,
    balance: summary.balance,
    savedAt: summary.updatedAt,
  };
}

describe('SQLiteService migration contract', () => {
  let dir: string;
  let dbPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'sqlite-contract-migration-'));
    dbPath = path.join(dir, 'contract.db');
    resetSQLiteService();
  });

  afterEach(async () => {
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  it('reads a previous-schema snapshot with identical projected fields after migrating to head', () => {
    getSQLiteService({
      path: dbPath,
      maxMigrationVersion: PREVIOUS,
    }).initialize();
    expect(
      getSQLiteService()
        .getDatabase()
        .prepare('SELECT MAX(version) AS v FROM migrations')
        .get(),
    ).toEqual({ v: PREVIOUS });

    const envelope = {
      ...buildSerializedCampaign(buildPopulatedCampaign(), 'device-2-4', 1),
      savedAt: '3025-07-04T00:00:00.000Z',
    };
    const saved = saveCampaign(envelope, 0);
    expect(saved.kind).toBe('ok');
    if (saved.kind !== 'ok') return;
    const written = projectSnapshot(saved.record);

    resetSQLiteService();
    getSQLiteService({ path: dbPath }).initialize();
    expect(
      getSQLiteService()
        .getDatabase()
        .prepare('SELECT MAX(version) AS v FROM migrations')
        .get(),
    ).toEqual({ v: HEAD });

    const read = readCampaign(envelope.campaignId);
    expect(read.kind).toBe('ok');
    if (read.kind !== 'ok') return;
    expect(projectSnapshot(read.record)).toEqual(written);
  });
});
