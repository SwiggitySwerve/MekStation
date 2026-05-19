/**
 * Campaign persistence module barrel
 *
 * Serialization, schema migration, and envelope helpers for server-side
 * campaign persistence.
 *
 * @spec openspec/changes/add-campaign-persistence/specs/campaign-persistence/spec.md
 */

export {
  CAMPAIGN_DATE_FIELDS,
  CAMPAIGN_MAP_FIELDS,
  type CampaignDateField,
  type CampaignDateKeys,
  type CampaignMapField,
  type CampaignMapKeys,
  type KeysOfType,
} from './campaignFieldMap';
export { buildSerializedCampaign, toCampaignSummary } from './campaignEnvelope';
export {
  CURRENT_CAMPAIGN_SCHEMA_VERSION,
  migrateSerializedCampaign,
} from './campaignMigration';
export { getDeviceId } from './deviceId';
export {
  deserializeCampaignBody,
  serializeCampaign,
} from './serializeCampaign';
