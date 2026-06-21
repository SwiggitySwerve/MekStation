/**
 * Co-op campaign components — barrel (CO2).
 *
 * @spec openspec/changes/add-coop-campaign-play/specs/coop-campaign-sync/spec.md
 */

export { GuestProposalSurface } from './GuestProposalSurface';
export type {
  GuestProposalSurfaceProps,
  IGuestActionDescriptor,
} from './GuestProposalSurface';
export { HostGmReviewSurface } from './HostGmReviewSurface';
export type { HostGmReviewSurfaceProps } from './HostGmReviewSurface';
export { CoopParticipationPicker } from './CoopParticipationPicker';
export type { CoopParticipationPickerProps } from './CoopParticipationPicker';
export { useGuestProposals } from './useGuestProposals';
export type {
  IGuestProposalsApi,
  ITrackedProposal,
  ProposalSubmitTransport,
} from './useGuestProposals';
// Wave 6.1 — page-level coordinator that decides whether to mount the
// host review surface, the guest proposal overlay, or nothing based on
// `campaign.coopSession`. Mounted from every campaign-detail sub-route.
export { CampaignCoopRouteSurface } from './CampaignCoopRouteSurface';
export type {
  CampaignCoopRouteId,
  CampaignCoopRouteSurfaceProps,
} from './CampaignCoopRouteSurface';
export { CampaignCoopRouteSurfaceConnected } from './CampaignCoopRouteSurfaceConnected';
export type { CampaignCoopRouteSurfaceConnectedProps } from './CampaignCoopRouteSurfaceConnected';
