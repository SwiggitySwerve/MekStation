/**
 * Campaign schema migration ladder
 *
 * Per design D4: every saved campaign carries a `schemaVersion`. On read
 * an ordered ladder of steps runs until the snapshot matches
 * `CURRENT_CAMPAIGN_SCHEMA_VERSION`. v1 is the original envelope. v2
 * stamps D2 `instanceId` + `authority` onto records that lack them.
 *
 * @spec openspec/changes/add-campaign-persistence/specs/campaign-persistence/spec.md
 * @spec openspec/changes/add-campaign-persistence/design.md (D4)
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D2)
 */

import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import {
  snapshotCarriesAuthority,
  sourceCampaignAuthority,
} from '@/lib/campaign/authority/campaignAuthority';

/**
 * Schema version every snapshot written by this build carries. Bump
 * this AND append a migration step whenever the envelope shape changes.
 */
export const CURRENT_CAMPAIGN_SCHEMA_VERSION = 2;

/**
 * Stored envelope that may predate D2 fields. Migration fills those
 * fields; callers must not treat this as already-valid current schema.
 */
export type MigratableCampaignSnapshot = Omit<
  SerializedCampaign,
  'instanceId' | 'authority'
> & {
  readonly instanceId?: string;
  readonly authority?: unknown;
};

/**
 * A single rung of the migration ladder. `fromVersion` is the version
 * the step upgrades from; `apply` returns the snapshot one version higher.
 */
interface MigrationStep {
  readonly fromVersion: number;
  readonly apply: (
    snapshot: MigratableCampaignSnapshot,
    hostInstanceId: string,
  ) => MigratableCampaignSnapshot;
}

/**
 * Ordered migration ladder. Each step upgrades fromVersion to fromVersion+1.
 */
const MIGRATION_LADDER: readonly MigrationStep[] = [
  {
    // v1 identity step: stamps schemaVersion to 1 if a legacy snapshot
    // arrived without one (defensive — pre-versioned local saves).
    fromVersion: 0,
    apply: (snapshot) => ({ ...snapshot, schemaVersion: 1 }),
  },
  {
    fromVersion: 1,
    apply: applyAuthorityMetadata,
  },
];

/**
 * Stamp D2 identity onto a v1 envelope.
 *
 * A campaign already living in this server's store is a source instance.
 * That is the only safe interpretation: a replica is created only by an
 * explicit replica flow, never by this backfill. Pre-field records
 * therefore receive `{ role: 'source' }` and this host's stable
 * instanceId. A record that already carries a parsed authority is left
 * untouched aside from the version bump.
 */
function applyAuthorityMetadata(
  snapshot: MigratableCampaignSnapshot,
  hostInstanceId: string,
): MigratableCampaignSnapshot {
  if (snapshotCarriesAuthority(snapshot)) {
    return { ...snapshot, schemaVersion: 2 };
  }
  return {
    ...snapshot,
    schemaVersion: 2,
    instanceId: snapshot.instanceId ?? hostInstanceId,
    authority: sourceCampaignAuthority(),
  };
}

/**
 * Run the migration ladder on a snapshot read from storage. Applies
 * ordered steps until the snapshot's `schemaVersion` equals
 * `CURRENT_CAMPAIGN_SCHEMA_VERSION`.
 *
 * `hostInstanceId` is this hosting server's durable id. It is used only
 * when a pre-D2 record has no instanceId of its own.
 *
 * Idempotent: a snapshot already at the current version is returned
 * unchanged (no step matches). A snapshot at an unknown future version
 * is returned as-is so a forward-compatible read degrades rather than
 * throwing.
 */
export function migrateSerializedCampaign(
  snapshot: MigratableCampaignSnapshot,
  hostInstanceId: string,
): SerializedCampaign {
  let current: MigratableCampaignSnapshot = snapshot;
  // Bounded loop: each successful step strictly increases schemaVersion,
  // and the ladder is finite, so this terminates.
  let guard = 0;
  while (
    current.schemaVersion < CURRENT_CAMPAIGN_SCHEMA_VERSION &&
    guard < MIGRATION_LADDER.length + 1
  ) {
    const step = MIGRATION_LADDER.find(
      (s) => s.fromVersion === current.schemaVersion,
    );
    if (!step) {
      // No step upgrades from this version — stop rather than spin.
      break;
    }
    current = step.apply(current, hostInstanceId);
    guard += 1;
  }
  return current as SerializedCampaign;
}
