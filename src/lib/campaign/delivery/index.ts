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
  projectCampaignStreamForGrant,
  type IProjectCampaignStreamDeps,
  type IProjectCampaignStreamRequest,
} from './projectCampaignStreamForGrant';
