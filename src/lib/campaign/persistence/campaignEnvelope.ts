/**
 * Campaign envelope builder
 *
 * Wraps a serialized campaign body in a `SerializedCampaign` envelope —
 * stamping the schema version, ids, save timestamp, origin device, and
 * the monotonic write `version` used for conflict detection (design D5).
 *
 * @spec openspec/changes/add-campaign-persistence/specs/campaign-persistence/spec.md
 * @spec openspec/changes/add-campaign-persistence/design.md (D2, D5)
 */

import type { ICampaign } from '@/types/campaign/Campaign';
import type {
  ICampaignSummary,
  SerializedCampaign,
  SerializedCampaignRosterState,
} from '@/types/campaign/SerializedCampaign';

import { CURRENT_CAMPAIGN_SCHEMA_VERSION } from './campaignMigration';
import { serializeCampaign } from './serializeCampaign';

/**
 * Build a `SerializedCampaign` envelope around a live campaign.
 *
 * @param campaign - the live campaign to snapshot
 * @param originDeviceId - id of the device producing the snapshot
 * @param version - the monotonic write version to stamp; defaults to the
 *   `baseVersion + 1` the client intends to write. The server is the
 *   authority on the final stored `version`; this is the client's
 *   proposed value.
 */
export function buildSerializedCampaign(
  campaign: ICampaign,
  originDeviceId: string,
  version: number,
  rosterProjection?: SerializedCampaignRosterState,
): SerializedCampaign {
  const body = serializeCampaign(campaign);
  return {
    schemaVersion: CURRENT_CAMPAIGN_SCHEMA_VERSION,
    campaignId: campaign.id,
    savedAt: new Date().toISOString(),
    originDeviceId,
    version,
    body: rosterProjection ? { ...body, rosterProjection } : body,
  };
}

/**
 * Project a stored `SerializedCampaign` down to a lightweight
 * `ICampaignSummary` for the list endpoint (design D7). Never includes
 * the full body.
 */
export function toCampaignSummary(
  envelope: SerializedCampaign,
): ICampaignSummary {
  return {
    id: envelope.body.id,
    name: envelope.body.name,
    factionId: envelope.body.factionId,
    currentDate: envelope.body.currentDate,
    balance: envelope.body.finances.balance,
    updatedAt: envelope.savedAt,
  };
}
