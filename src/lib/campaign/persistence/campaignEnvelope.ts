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
  CampaignAuthority,
  ICampaignSummary,
  SerializedCampaign,
  SerializedCampaignRosterState,
} from '@/types/campaign/SerializedCampaign';

import { sourceCampaignAuthority } from '@/lib/campaign/authority/campaignAuthority';

import { CURRENT_CAMPAIGN_SCHEMA_VERSION } from './campaignMigration';
import { serializeCampaign } from './serializeCampaign';

/**
 * Build a `SerializedCampaign` envelope around a live campaign.
 *
 * `identity` is optional. When omitted, the client proposes
 * `{ role: 'source' }` and uses `originDeviceId` as instanceId. The
 * server overwrites instanceId with its host singleton on persist.
 */
export function buildSerializedCampaign(
  campaign: ICampaign,
  originDeviceId: string,
  version: number,
  rosterProjection?: SerializedCampaignRosterState,
  identity?: {
    readonly instanceId: string;
    readonly authority?: CampaignAuthority;
  },
): SerializedCampaign {
  const body = serializeCampaign(campaign);
  return {
    schemaVersion: CURRENT_CAMPAIGN_SCHEMA_VERSION,
    campaignId: campaign.id,
    savedAt: new Date().toISOString(),
    originDeviceId,
    version,
    instanceId: identity?.instanceId ?? originDeviceId,
    authority: identity?.authority ?? sourceCampaignAuthority(),
    body: rosterProjection ? { ...body, rosterProjection } : body,
  };
}

/**
 * Project a stored envelope to the list summary (design D7). Includes
 * stored authority so list UI can state source vs replica without
 * inferring from connection state.
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
    instanceId: envelope.instanceId,
    authority: envelope.authority,
  };
}
