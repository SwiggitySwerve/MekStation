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
