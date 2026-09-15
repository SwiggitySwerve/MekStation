/**
 * The durable answer to "what does this campaign's cutover marker say?"
 * (design-campaign-authority-and-sync task 5.7; design D10).
 *
 * `ICampaignMarkerIo` is the RULE — adoption and snapshot backfill both
 * take it as a parameter. This is the one place that resolves it against
 * the process's database, so the adopt route, the command pipeline and
 * the operator cutover tools ask the same question of the same row
 * instead of each assembling their own pair, which is how the three
 * would eventually come to disagree about which database the marker is
 * in.
 *
 * An uninitialized service answers `null` rather than throwing, the same
 * way `readDurableStreamRebuild` treats the same database: no
 * initialized service means no `campaign_authority_migration` table,
 * which means the campaign has no marker and is in the implicit `legacy`
 * state. `getSQLiteService()` constructs the service without opening a
 * file, so asking costs nothing.
 *
 * A corrupt row reads as `null` here deliberately. The authority
 * resolver already refuses a campaign whose marker cannot be parsed
 * (`marker-unreadable`), so nothing that consults this io reaches it
 * holding journal authority — and a reader that threw would turn a
 * corrupt row into a crash on a path that has already been refused.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D10)
 */

import {
  readCampaignMigrationMarker,
  writeCampaignMigrationMarker,
} from '@/services/campaignPersistence/CampaignMigrationMarkerStore';
import { getSQLiteService } from '@/services/persistence/SQLiteService';

import type { ICampaignCutoverMarker } from './campaignAuthorityMigration';
import type { ICampaignMarkerIo } from './campaignLegacyAdoption';

/** The process database's cutover marker for one campaign, or null. */
export const durableCampaignMarkerIo: ICampaignMarkerIo = {
  read: (campaignId: string): ICampaignCutoverMarker | null => {
    const service = getSQLiteService();
    if (!service.isInitialized()) return null;
    const stored = readCampaignMigrationMarker(campaignId);
    return stored.kind === 'ok' ? stored.marker : null;
  },
  write: writeCampaignMigrationMarker,
};
