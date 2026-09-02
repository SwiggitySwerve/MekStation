/**
 * Production ports for the campaign creation authority checkpoint.
 *
 * Kept in its own module, and returned as `null` when SQLite has not
 * been initialized, for the same reason the campaign membership and
 * force-claim ports are separate modules: a default that reached for
 * SQLite would drag a database into every test that creates a match,
 * and those tests have none. Absence stays the structural flag - a
 * caller without ports behaves exactly as it did before the checkpoint
 * existed.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/tasks.md (10.1)
 */

import { readCampaignMigrationMarker } from '@/services/campaignPersistence/CampaignMigrationMarkerStore';
import { readCampaign } from '@/services/campaignPersistence/CampaignPersistenceService';
import { claimCampaignSessionForce } from '@/services/campaignPersistence/CampaignSessionForceClaimStore';
import { bindCampaignSessionParticipant } from '@/services/campaignPersistence/CampaignSessionParticipantStore';
import { getSQLiteService } from '@/services/persistence/SQLiteService';
import { getUnitRepository } from '@/services/units/UnitRepository';

import type { ICampaignCreationCheckpointPorts } from './campaignCreationCheckpoint';

/**
 * The durable ports, or `null` when there is no database to commit to.
 *
 * A corrupt marker row reads as "no genesis branch" rather than as a
 * present one: the checkpoint's job is to refuse when the branch is not
 * provably committed, and an unparseable marker proves nothing.
 */
export function campaignCreationCheckpointPorts(): ICampaignCreationCheckpointPorts | null {
  if (!getSQLiteService().isInitialized()) return null;
  return {
    readCampaign,
    readGenesisMarker: (campaignId) => {
      const read = readCampaignMigrationMarker(campaignId);
      return read.kind === 'ok' ? read.marker : null;
    },
    bindParticipant: bindCampaignSessionParticipant,
    claimForce: claimCampaignSessionForce,
    resolveCustomUnit: (unitRef) => getUnitRepository().getById(unitRef),
  };
}
