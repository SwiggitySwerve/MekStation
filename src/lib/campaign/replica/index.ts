/**
 * Consuming-device replica durable store (design D6, task 2.3).
 *
 * STRUCTURAL LAW: this facade writes only campaign-replica streams.
 * Source campaign appends and grant-store mutation live elsewhere.
 */

export { SQLiteCampaignReplicaStore } from './SQLiteCampaignReplicaStore';
export {
  CAMPAIGN_REPLICA_STREAM_TYPE,
  campaignReplicaStreamId,
  REPLICA_INVALID_INTENT_REASON,
  REPLICA_OFFLINE_REFUSAL_REASON,
} from './campaignReplicaTypes';
export type {
  CampaignReplicaChainVerifyResult,
  CampaignReplicaClock,
  CampaignReplicaConnectionStatus,
  CampaignReplicaIngestFault,
  CampaignReplicaIngestResult,
  CampaignReplicaMutationResult,
  ICampaignReplicaEnvelope,
  ICampaignReplicaMutationIntent,
  ICampaignReplicaReadResult,
  IDeliveryCursor,
} from './campaignReplicaTypes';
export { evaluateReplicaMutationIntent } from './campaignReplicaOffline';
export { planCampaignReplicaIngest } from './planCampaignReplicaIngest';
export { verifyCampaignReplicaStoredChain } from './verifyCampaignReplicaChain';
export {
  canonicalReplicaDeliveryIdentity,
  parseCampaignReplicaEnvelope,
  replicaEnvelopeToDeliveryItem,
} from './campaignReplicaEnvelope';
