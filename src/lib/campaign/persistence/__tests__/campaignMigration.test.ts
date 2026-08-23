/**
 * Campaign migration ladder tests (tasks 2.3)
 *
 * @spec openspec/changes/add-campaign-persistence/specs/campaign-persistence/spec.md
 *   - Requirement: Schema Version and Migration Ladder
 */

import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import { buildSerializedCampaign } from '../campaignEnvelope';
import {
  CURRENT_CAMPAIGN_SCHEMA_VERSION,
  migrateSerializedCampaign,
} from '../campaignMigration';
import { buildPopulatedCampaign } from './campaignFixture';

/** Stand-in for the hosting server's durable id (D2 backfill input). */
const TEST_HOST_INSTANCE_ID = 'host-instance-test';

function currentVersionSnapshot(): SerializedCampaign {
  return buildSerializedCampaign(buildPopulatedCampaign(), 'device-x', 1);
}

describe('migrateSerializedCampaign', () => {
  it('exposes a current schema version of 2', () => {
    expect(CURRENT_CAMPAIGN_SCHEMA_VERSION).toBe(2);
  });

  it('returns a current-version snapshot unchanged', () => {
    const snapshot = currentVersionSnapshot();
    const migrated = migrateSerializedCampaign(snapshot, TEST_HOST_INSTANCE_ID);
    expect(migrated).toEqual(snapshot);
  });

  it('is idempotent — two runs produce an identical snapshot', () => {
    const snapshot = currentVersionSnapshot();
    const once = migrateSerializedCampaign(snapshot, TEST_HOST_INSTANCE_ID);
    const twice = migrateSerializedCampaign(once, TEST_HOST_INSTANCE_ID);
    expect(twice).toEqual(once);
  });

  it('upgrades a legacy schemaVersion-0 snapshot to the current version', () => {
    const legacy: SerializedCampaign = {
      ...currentVersionSnapshot(),
      schemaVersion: 0,
    };
    const migrated = migrateSerializedCampaign(legacy, TEST_HOST_INSTANCE_ID);
    expect(migrated.schemaVersion).toBe(CURRENT_CAMPAIGN_SCHEMA_VERSION);
  });

  it('leaves an unknown future-version snapshot unchanged (forward-compatible)', () => {
    const future: SerializedCampaign = {
      ...currentVersionSnapshot(),
      schemaVersion: 999,
    };
    const migrated = migrateSerializedCampaign(future, TEST_HOST_INSTANCE_ID);
    expect(migrated.schemaVersion).toBe(999);
  });

  it('backfills a pre-authority v1 record as source with the host instanceId', () => {
    const current = currentVersionSnapshot();
    const preAuthority = {
      schemaVersion: 1,
      campaignId: current.campaignId,
      savedAt: current.savedAt,
      originDeviceId: current.originDeviceId,
      version: current.version,
      body: current.body,
    };
    const migrated = migrateSerializedCampaign(
      preAuthority,
      TEST_HOST_INSTANCE_ID,
    );
    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.instanceId).toBe(TEST_HOST_INSTANCE_ID);
    expect(migrated.authority).toEqual({ role: 'source' });
  });

  it('leaves a record that already carries authority untouched', () => {
    const replica: SerializedCampaign = {
      ...currentVersionSnapshot(),
      instanceId: 'replica-host-aaa',
      authority: {
        role: 'replica',
        sourceInstanceId: 'source-host-bbb',
        grantId: 'grant-ccc',
        scopes: ['campaign'],
      },
    };
    const migrated = migrateSerializedCampaign(replica, TEST_HOST_INSTANCE_ID);
    expect(migrated).toEqual(replica);
  });
});
