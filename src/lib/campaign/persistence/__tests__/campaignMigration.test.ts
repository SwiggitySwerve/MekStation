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

function currentVersionSnapshot(): SerializedCampaign {
  return buildSerializedCampaign(buildPopulatedCampaign(), 'device-x', 1);
}

describe('migrateSerializedCampaign', () => {
  it('exposes a current schema version of 1', () => {
    expect(CURRENT_CAMPAIGN_SCHEMA_VERSION).toBe(1);
  });

  it('returns a current-version snapshot unchanged', () => {
    const snapshot = currentVersionSnapshot();
    const migrated = migrateSerializedCampaign(snapshot);
    expect(migrated).toEqual(snapshot);
  });

  it('is idempotent — two runs produce an identical snapshot', () => {
    const snapshot = currentVersionSnapshot();
    const once = migrateSerializedCampaign(snapshot);
    const twice = migrateSerializedCampaign(once);
    expect(twice).toEqual(once);
  });

  it('upgrades a legacy schemaVersion-0 snapshot to the current version', () => {
    const legacy: SerializedCampaign = {
      ...currentVersionSnapshot(),
      schemaVersion: 0,
    };
    const migrated = migrateSerializedCampaign(legacy);
    expect(migrated.schemaVersion).toBe(CURRENT_CAMPAIGN_SCHEMA_VERSION);
  });

  it('leaves an unknown future-version snapshot unchanged (forward-compatible)', () => {
    const future: SerializedCampaign = {
      ...currentVersionSnapshot(),
      schemaVersion: 999,
    };
    const migrated = migrateSerializedCampaign(future);
    expect(migrated.schemaVersion).toBe(999);
  });
});
