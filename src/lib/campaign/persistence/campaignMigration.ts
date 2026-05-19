/**
 * Campaign schema migration ladder
 *
 * Per design D4: every saved campaign carries a `schemaVersion`. On read
 * an ordered ladder of `vN -> vN+1` steps runs until the snapshot matches
 * `CURRENT_CAMPAIGN_SCHEMA_VERSION`. This change ships only the `v1`
 * identity step — the ladder exists from day one so a later format change
 * (e.g. Wave 5 co-op) is an *added* step, not a breaking read.
 *
 * @spec openspec/changes/add-campaign-persistence/specs/campaign-persistence/spec.md
 * @spec openspec/changes/add-campaign-persistence/design.md (D4)
 */

import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

/**
 * The schema version every snapshot written by this build carries. Bump
 * this AND append a migration step whenever `SerializedCampaignBody`
 * changes shape.
 */
export const CURRENT_CAMPAIGN_SCHEMA_VERSION = 1;

/**
 * A single rung of the migration ladder. `fromVersion` is the version the
 * step upgrades *from*; `apply` returns the snapshot one version higher.
 */
interface MigrationStep {
  readonly fromVersion: number;
  readonly apply: (snapshot: SerializedCampaign) => SerializedCampaign;
}

/**
 * Ordered migration ladder. Each step upgrades `fromVersion -> fromVersion + 1`.
 *
 * The `v1` step is the identity migration — `v1` is the first version, so
 * there is nothing to upgrade *to v1 from*. It exists as a placeholder so
 * the ladder is non-empty and the runner's contract is exercised; a future
 * `v1 -> v2` step is appended here.
 */
const MIGRATION_LADDER: readonly MigrationStep[] = [
  {
    // v1 identity step: stamps schemaVersion to 1 if a legacy snapshot
    // arrived without one (defensive — pre-versioned local saves).
    fromVersion: 0,
    apply: (snapshot) => ({ ...snapshot, schemaVersion: 1 }),
  },
];

/**
 * Run the migration ladder on a snapshot read from storage. Applies
 * ordered `vN -> vN+1` steps until the snapshot's `schemaVersion` equals
 * `CURRENT_CAMPAIGN_SCHEMA_VERSION`.
 *
 * Idempotent: a snapshot already at the current version is returned
 * unchanged (no step matches). Total: a snapshot at an unknown *future*
 * version (no applicable step) is returned as-is so a forward-compatible
 * read degrades gracefully rather than throwing.
 */
export function migrateSerializedCampaign(
  snapshot: SerializedCampaign,
): SerializedCampaign {
  let current = snapshot;
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
    current = step.apply(current);
    guard += 1;
  }
  return current;
}
