/**
 * Campaign envelope hydration
 *
 * Runs the schema ladder then parses D2 authority. Unknown roles fail
 * closed here so read and write paths share one refuse-as-source rule.
 *
 * Kept off campaignMigration.ts so the ladder stays a pure version
 * stepper, and off campaignAuthority.ts so parse does not import SQLite
 * or the ladder.
 */

import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import {
  parseCampaignAuthority,
  UNKNOWN_AUTHORITY_ROLE_REASON,
} from '@/lib/campaign/authority/campaignAuthority';
import {
  migrateSerializedCampaign,
  type MigratableCampaignSnapshot,
} from '@/lib/campaign/persistence/campaignMigration';

export type CampaignHydrationResult =
  | { readonly kind: 'ok'; readonly record: SerializedCampaign }
  | {
      readonly kind: 'failed';
      readonly reason: typeof UNKNOWN_AUTHORITY_ROLE_REASON;
    };

/**
 * Migrate a stored or incoming envelope and parse its authority.
 * Fail closed when role is missing or unknown after migration.
 */
export function hydrateCampaignRecord(
  raw: unknown,
  hostInstanceId: string,
): CampaignHydrationResult {
  if (typeof raw !== 'object' || raw === null) {
    return { kind: 'failed', reason: UNKNOWN_AUTHORITY_ROLE_REASON };
  }
  const migrated = migrateSerializedCampaign(
    raw as MigratableCampaignSnapshot,
    hostInstanceId,
  );
  const parsed = parseCampaignAuthority(migrated.authority);
  if (parsed.kind === 'failed') {
    return parsed;
  }
  if (
    typeof migrated.instanceId !== 'string' ||
    migrated.instanceId.length === 0
  ) {
    return { kind: 'failed', reason: UNKNOWN_AUTHORITY_ROLE_REASON };
  }
  return {
    kind: 'ok',
    record: {
      ...migrated,
      instanceId: migrated.instanceId,
      authority: parsed.authority,
    },
  };
}
