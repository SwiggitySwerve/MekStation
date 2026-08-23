/**
 * Per-grant campaign delivery seam (design D4, task 3.2).
 *
 * Membership is minted through CampaignGrantMembershipSource plus the
 * existing AuthorizedViewerResolver. Projection filters by the grant
 * scope set and numbers through the privacy-owned delivery epoch.
 */

export {
  CampaignGrantMembershipSource,
  isCampaignGrantActive,
  membershipRevisionFromGrants,
  MembershipSourceUnavailableError,
  selectActiveCampaignGrant,
} from './CampaignGrantMembershipSource';
export {
  CAMPAIGN_GRANT_DELIVERY_REFUSED_REASON,
  CAMPAIGN_GRANT_PROJECTOR_VERSION,
  DELIVERY_EPOCH_STALE_MESSAGE,
} from './campaignDeliveryTypes';
export type {
  CampaignGrantClock,
  CampaignGrantNullCursorBackfill,
  ICampaignGrantDeliveryItem,
  ICampaignGrantProjectedEvent,
  IDeliveryCursor,
  IDeliveryEpochBaseline,
  IProjectCampaignStreamPage,
  IProjectCampaignStreamRefused,
  IProjectCampaignStreamStaleEpoch,
  ProjectCampaignStreamResult,
} from './campaignDeliveryTypes';
export {
  applyCampaignGrantDelivery,
  campaignGrantDeliveryIdentity,
  emptyCampaignGrantReplicaState,
} from './applyCampaignGrantDelivery';
export type {
  ApplyCampaignGrantDeliveryResult,
  IApplyCampaignGrantDeliveryInput,
  ICampaignGrantReplicaApplyState,
} from './applyCampaignGrantDelivery';
export {
  GRANT_CHANNEL_AUTH_ERROR_CODE,
  GRANT_CHANNEL_INFRA_ERROR_CODE,
  grantSnapshotMismatchFrame,
  grantTokenFailureFrame,
} from './campaignGrantChannelAuth';
export type { ICampaignGrantLiveSource } from './campaignGrantChannelSession';
export { startCampaignGrantChannelSession } from './campaignGrantChannelSession';
export {
  buildScopedCampaignSnapshot,
  projectedHeadDeliverySequence,
  scopedSnapshotFromProjectedPage,
  serveScopedCampaignSnapshot,
  sliceProjectedPageAtSequence,
} from './buildScopedCampaignSnapshot';
export type {
  BuildScopedCampaignSnapshotResult,
  IBuildScopedCampaignSnapshotRequest,
  IBuiltScopedCampaignSnapshot,
  IScopedCampaignSnapshot,
} from './buildScopedCampaignSnapshot';
export {
  CAMPAIGN_GRANT_SNAPSHOT_AUTHOR,
  SNAPSHOT_CUT_INVALID_REASON,
  SNAPSHOT_CUT_PAST_HEAD_REASON,
  SNAPSHOT_GRANT_MISMATCH_REASON,
} from './campaignGrantSnapshotTypes';
export {
  campaignGrantItemToReplayEvent,
  campaignJsonEquals,
  canonicalizeCampaignJson,
  foldCampaignGrantDeliveryItems,
  hydrateCampaignGrantFromSnapshot,
  scopedSnapshotHydrationEvent,
  scopedSnapshotWireEvent,
} from './foldCampaignGrantDelivery';
export {
  ScopedSnapshotEquivalenceError,
  verifyScopedSnapshotEquivalence,
  verifyScopedSnapshotEquivalenceAtEveryCut,
} from './verifyScopedSnapshotEquivalence';
export {
  projectCampaignStreamForGrant,
  type IProjectCampaignStreamDeps,
  type IProjectCampaignStreamRequest,
} from './projectCampaignStreamForGrant';
