/**
 * The durable answer to "has this campaign artifact been invalidated?"
 * (umbrella 16.4-c).
 *
 * `consultCampaignArtifactUse` is the RULE and takes its two stores as
 * parameters. This is the one place that resolves those stores from the
 * process's database, so the command pipeline and the ReconcileBattle
 * binder ask the same question of the same rows instead of each
 * assembling their own pair.
 *
 * An uninitialized service answers null (usable) rather than throwing:
 * `getSQLiteService()` constructs the service without opening a file,
 * and an in-memory journal in tests has no manifest table. No
 * initialized service means no sealed list, which means nothing is
 * stale. Asking costs nothing.
 */

import type { IEventHistoryStreamRef } from '@/lib/events/journal/EventHistoryBranchContract';

import { SQLiteEventHistoryArtifactManifestStore } from '@/lib/events/journal/EventHistoryArtifactManifest';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { getSQLiteService } from '@/services/persistence/SQLiteService';

import type {
  ICampaignArtifactIdentity,
  InvalidatedCampaignArtifactRefusal,
} from './GmCampaignArtifactUseGuard';

import { consultCampaignArtifactUse } from './GmCampaignArtifactUseGuard';

/**
 * Same signature as the durable reader, which is the default.
 * A refusal names the effective branch and the source revision.
 */
export type CampaignArtifactUseReader = (
  stream: IEventHistoryStreamRef,
  artifact: ICampaignArtifactIdentity,
) => InvalidatedCampaignArtifactRefusal | null;

/**
 * The live later-use refusal on this stream, or null (usable).
 *
 * Keyed on the stream plus kind+id. A process-wide gate would stop
 * every campaign the moment one GM sealed one contract.
 */
export function readDurableCampaignArtifactUse(
  stream: IEventHistoryStreamRef,
  artifact: ICampaignArtifactIdentity,
): InvalidatedCampaignArtifactRefusal | null {
  const service = getSQLiteService();
  if (!service.isInitialized()) return null;
  const db = service.getDatabase();
  const branches = new SQLiteEventHistoryBranchStore(db);
  const manifests = new SQLiteEventHistoryArtifactManifestStore(db);
  return consultCampaignArtifactUse(
    {
      readEffectiveHead: (ref) => branches.readEffectiveHead(ref),
      readArtifactManifest: (ref, candidateBranchId) =>
        manifests.readArtifactManifest(ref, candidateBranchId),
    },
    stream,
    artifact,
  );
}
