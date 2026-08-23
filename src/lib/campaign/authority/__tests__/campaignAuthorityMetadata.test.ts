/**
 * D2 authority metadata on the campaign record (task 1.1 remainder).
 *
 * The user requirement is that a shared instance KNOWS it is not the
 * direct source. D2 makes that a stored, surfaced fact rather than an
 * inference from connection state, so these tests pin the three ways
 * that fact could silently degrade: a pre-D2 record quietly loading
 * without one, a corrupt role quietly reading as source, and a replica
 * quietly accepting a mutation.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D2)
 */

import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { MigratableCampaignSnapshot } from '@/lib/campaign/persistence/campaignMigration';

import {
  CURRENT_CAMPAIGN_SCHEMA_VERSION,
  migrateSerializedCampaign,
} from '@/lib/campaign/persistence/campaignMigration';
import { CAMPAIGN_HOST_INSTANCE_MIGRATION } from '@/services/persistence/SQLiteService.campaignHostInstance.migration';

import {
  assertSourceAuthority,
  isSourceInstance,
  parseCampaignAuthority,
  sourceCampaignAuthority,
} from '../campaignAuthority';
import { getOrCreateHostInstanceId } from '../campaignHostInstance';

const HOST_ID = 'host-instance-under-test';

/** A stored envelope from before D2 existed: no instanceId, no authority. */
function preAuthoritySnapshot(): MigratableCampaignSnapshot {
  return {
    schemaVersion: 1,
    campaignId: 'campaign-legacy',
    savedAt: '2026-06-01T00:00:00.000Z',
    originDeviceId: 'device-legacy',
    version: 4,
    body: { id: 'campaign-legacy' },
  } as unknown as MigratableCampaignSnapshot;
}

describe('D2 authority metadata', () => {
  describe('migration backfill', () => {
    it('stamps a pre-D2 record as source with this host instance id', () => {
      const migrated = migrateSerializedCampaign(
        preAuthoritySnapshot(),
        HOST_ID,
      );

      expect(migrated.schemaVersion).toBe(CURRENT_CAMPAIGN_SCHEMA_VERSION);
      expect(migrated.authority).toEqual({ role: 'source' });
      expect(migrated.instanceId).toBe(HOST_ID);
      // The campaign body is carried through untouched by the backfill.
      expect(migrated.campaignId).toBe('campaign-legacy');
      expect(migrated.version).toBe(4);
    });

    it('leaves a record that already carries authority untouched', () => {
      const replica = {
        ...preAuthoritySnapshot(),
        instanceId: 'other-host',
        authority: {
          role: 'replica',
          sourceInstanceId: 'source-host',
          grantId: 'grant-1',
          scopes: ['campaign'],
        },
      } as unknown as MigratableCampaignSnapshot;

      const migrated = migrateSerializedCampaign(replica, HOST_ID);

      // A replica must NOT be rewritten into a source by a backfill that
      // happens to run on the consuming device.
      expect(migrated.authority).toEqual({
        role: 'replica',
        sourceInstanceId: 'source-host',
        grantId: 'grant-1',
        scopes: ['campaign'],
      });
      expect(migrated.instanceId).toBe('other-host');
    });

    it('is idempotent across repeated migration', () => {
      const once = migrateSerializedCampaign(preAuthoritySnapshot(), HOST_ID);
      const twice = migrateSerializedCampaign(
        once as unknown as MigratableCampaignSnapshot,
        'a-different-host',
      );
      // The second run must not re-stamp a different host id onto a
      // record that already knows where it lives.
      expect(twice.instanceId).toBe(HOST_ID);
      expect(twice.authority).toEqual({ role: 'source' });
    });
  });

  describe('fail-closed parsing', () => {
    it('refuses an unknown role rather than treating it as source', () => {
      const parsed = parseCampaignAuthority({ role: 'archivist' });
      expect(parsed.kind).toBe('failed');
      // The whole point: an unrecognized role is never optimistically
      // read as the writable one.
      expect(parsed.kind === 'failed' && parsed.reason).toBe(
        'unknown-authority-role',
      );
    });

    it('refuses non-authority values', () => {
      const values: readonly unknown[] = [
        null,
        undefined,
        'source',
        42,
        {},
        { role: 5 },
      ];
      for (const value of values) {
        expect(parseCampaignAuthority(value).kind).toBe('failed');
      }
    });

    it('accepts the two legitimate roles', () => {
      expect(parseCampaignAuthority({ role: 'source' }).kind).toBe('ok');
      expect(
        parseCampaignAuthority({
          role: 'replica',
          sourceInstanceId: 'src',
          grantId: 'g',
          scopes: ['campaign'],
        }).kind,
      ).toBe('ok');
    });
  });

  describe('command gate', () => {
    it('permits a mutation on a source record', () => {
      expect(isSourceInstance(sourceCampaignAuthority())).toBe(true);
      expect(assertSourceAuthority(sourceCampaignAuthority())).toEqual({
        kind: 'ok',
      });
    });

    it('refuses a mutation on a replica record, distinguishably', () => {
      const replica = parseCampaignAuthority({
        role: 'replica',
        sourceInstanceId: 'src',
        grantId: 'g',
        scopes: ['campaign'],
      });
      expect(replica.kind).toBe('ok');
      if (replica.kind !== 'ok') return;

      const refusal = assertSourceAuthority(replica.authority);
      expect(refusal.kind).toBe('refused');
      // Distinguishable from a generic failure AND from the corrupt-role
      // case, so a caller can say "this device is not the source" rather
      // than "something went wrong".
      expect(refusal.kind === 'refused' && refusal.reason).toBe(
        'replica-not-source',
      );
      expect(isSourceInstance(replica.authority)).toBe(false);
    });
  });

  describe('host instance identity', () => {
    let dir: string;
    let dbPath: string;

    beforeEach(async () => {
      dir = await mkdtemp(path.join(tmpdir(), 'host-instance-'));
      dbPath = path.join(dir, 'host.db');
    });

    afterEach(async () => {
      await rm(dir, { recursive: true, force: true, maxRetries: 3 });
    });

    /** Opens the db and applies only the host-instance migration. */
    function openDb(file: string): Database.Database {
      const db = new Database(file);
      db.exec(CAMPAIGN_HOST_INSTANCE_MIGRATION.up);
      return db;
    }

    it('is stable across repeated reads and a reopen', () => {
      const first = openDb(dbPath);
      const minted = getOrCreateHostInstanceId(first);
      expect(minted.length).toBeGreaterThan(0);
      // Repeated reads in the same process do not remint.
      expect(getOrCreateHostInstanceId(first)).toBe(minted);
      first.close();

      // Simulated restart against the same database file.
      const reopened = openDb(dbPath);
      expect(getOrCreateHostInstanceId(reopened)).toBe(minted);
      reopened.close();
    });

    it('mints distinct ids for distinct hosts', async () => {
      const a = openDb(dbPath);
      const idA = getOrCreateHostInstanceId(a);
      a.close();

      const otherDir = await mkdtemp(path.join(tmpdir(), 'host-instance-b-'));
      const b = openDb(path.join(otherDir, 'host.db'));
      const idB = getOrCreateHostInstanceId(b);
      b.close();
      await rm(otherDir, { recursive: true, force: true, maxRetries: 3 });

      // A replica grant pins sourceInstanceId, so two hosts sharing an
      // id would let one impersonate the other.
      expect(idA).not.toBe(idB);
    });
  });
});
