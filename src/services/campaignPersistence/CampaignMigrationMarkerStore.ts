/**
 * Durable store for campaign authority cutover markers (task 5.2).
 *
 * One row per campaign in the `campaign_authority_migration` table
 * (migration 9), payload = the JSON `ICampaignCutoverMarker`. Follows the
 * `CampaignPersistenceService` idiom: tagged-union reads so corrupt JSON
 * surfaces as an explicit variant instead of a throw crossing the API
 * boundary, and the shared `mekstation.db` backend — no new engine.
 *
 * A campaign with no row is in implicit `legacy` state (the pre-migration
 * world); writers persist the first marker when migration begins.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D10)
 */

import type { ICampaignCutoverMarker } from '@/lib/campaign/authority/campaignAuthorityMigration';

import { getSQLiteService } from '@/services/persistence/SQLiteService';

export type CampaignMigrationMarkerReadResult =
  | { readonly kind: 'ok'; readonly marker: ICampaignCutoverMarker }
  | { readonly kind: 'not_found' }
  | { readonly kind: 'corrupt'; readonly campaignId: string };

interface IMarkerRow {
  readonly payload: string;
}

export function readCampaignMigrationMarker(
  campaignId: string,
): CampaignMigrationMarkerReadResult {
  const db = getSQLiteService().getDatabase();
  const row = db
    .prepare(
      'SELECT payload FROM campaign_authority_migration WHERE campaign_id = ?',
    )
    .get(campaignId) as IMarkerRow | undefined;
  if (!row) {
    return { kind: 'not_found' };
  }
  try {
    return {
      kind: 'ok',
      marker: JSON.parse(row.payload) as ICampaignCutoverMarker,
    };
  } catch {
    return { kind: 'corrupt', campaignId };
  }
}

/** Upsert the marker — the state machine's legality lives in the caller. */
export function writeCampaignMigrationMarker(
  marker: ICampaignCutoverMarker,
): void {
  const db = getSQLiteService().getDatabase();
  db.prepare(
    `INSERT INTO campaign_authority_migration (campaign_id, payload)
     VALUES (@campaignId, @payload)
     ON CONFLICT(campaign_id) DO UPDATE SET payload = @payload`,
  ).run({ campaignId: marker.campaignId, payload: JSON.stringify(marker) });
}
