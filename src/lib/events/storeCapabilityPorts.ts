/**
 * Optional store ports shared by match and campaign boundaries
 * (seam 2.2-PREFIX).
 *
 * Branch questions are keyed by IEventHistoryStreamRef so one port
 * covers both stream kinds. Participant and cursor keys are
 * campaign / session / grant — never matchId. Both store interfaces
 * carry these as a facade so callers can ask the same questions
 * without the durable/journal compose (that is the next seam).
 */

import type {
  EventHistoryBranchStatus,
  IEventHistoryBranch,
  IEventHistoryEffectiveHead,
  IEventHistoryStreamRef,
} from '@/lib/events/journal/EventHistoryBranchContract';
import type {
  BindParticipantResult,
  CampaignSeat,
  ICampaignSessionMembership,
} from '@/services/campaignPersistence/CampaignSessionParticipantStore';
import type {
  IParticipantAckRequest,
  IParticipantDeliveryCursor,
  ParticipantAckResult,
} from '@/lib/campaign/delivery/participantDeliveryCursor';

export type {
  BindParticipantResult,
  CampaignSeat,
  ICampaignSessionMembership,
  IParticipantAckRequest,
  IParticipantDeliveryCursor,
  ParticipantAckResult,
};

/** History-branch surface mirrored from SQLiteEventHistoryBranchStore. */
export interface IEventHistoryBranchPort {
  readBranch(
    stream: IEventHistoryStreamRef,
    branchId: string,
  ): IEventHistoryBranch | null;
  requireBranch(
    stream: IEventHistoryStreamRef,
    branchId: string,
  ): IEventHistoryBranch;
  readEffectiveHead(
    stream: IEventHistoryStreamRef,
  ): IEventHistoryEffectiveHead | null;
  requireEffectiveHead(
    stream: IEventHistoryStreamRef,
  ): IEventHistoryEffectiveHead;
  createBranch(branch: IEventHistoryBranch): void;
  transitionBranchStatus(
    stream: IEventHistoryStreamRef,
    branchId: string,
    to: EventHistoryBranchStatus,
  ): void;
}

/** Session membership surface mirrored from CampaignSessionParticipantStore. */
export interface ICampaignSessionParticipantPort {
  bindCampaignSessionParticipant(input: {
    readonly campaignId: string;
    readonly sessionId: string;
    readonly participantId: string;
    readonly seat: CampaignSeat;
    readonly boundAt: string;
  }): BindParticipantResult;
  activeCampaignSessionMembership(
    campaignId: string,
    sessionId: string,
    participantId: string,
  ): ICampaignSessionMembership | null;
  isActiveCampaignGm(campaignId: string, participantId: string): boolean;
  campaignHasAnyActiveSeat(campaignId: string): boolean;
  isActiveCampaignSeat(campaignId: string, participantId: string): boolean;
  listActiveCampaignSessionParticipants(
    campaignId: string,
    sessionId: string,
  ): readonly ICampaignSessionMembership[];
  revokeCampaignSessionParticipant(input: {
    readonly campaignId: string;
    readonly sessionId: string;
    readonly participantId: string;
    readonly revokedAt: string;
  }): boolean;
  /** Raw revoked_at IS NOT NULL check from campaignSessionMembershipPort. */
  isRevokedCampaignSessionParticipant(
    campaignId: string,
    sessionId: string,
    participantId: string,
  ): boolean;
}

/**
 * Grant + viewer facts supplied ON the ack call.
 *
 * The port must not load a grant store or viewer resolver itself: a
 * revoked grant has to stop the cursor at this call, and the caller
 * already has those answers.
 */
export interface IParticipantAckAuthorization {
  readonly grant: {
    readonly grantId: string;
    readonly campaignId: string;
    readonly participantId: string;
    readonly active: boolean;
  } | null;
  readonly viewerAuthorized: boolean;
  readonly currentEpochId: string;
  readonly highestAssigned: number;
}

/** Per-grant delivery cursor mirrored from participantDeliveryCursor. */
export interface IParticipantDeliveryCursorPort {
  readParticipantDeliveryCursor(key: {
    readonly campaignId: string;
    readonly grantId: string;
    readonly participantId: string;
  }): IParticipantDeliveryCursor | null;
  recordParticipantAcknowledgement(
    request: IParticipantAckRequest,
    authorization: IParticipantAckAuthorization,
    nowIso: string,
  ): Promise<ParticipantAckResult>;
}

/**
 * Structural capability guard, matching hasPublicationOutbox: it checks
 * the methods EXIST and nothing else.
 */
export function hasHistoryBranchStore<T extends object>(
  store: T,
): store is T & IEventHistoryBranchPort {
  const candidate = store as Partial<IEventHistoryBranchPort>;
  return (
    typeof candidate.readBranch === 'function' &&
    typeof candidate.requireBranch === 'function' &&
    typeof candidate.readEffectiveHead === 'function' &&
    typeof candidate.requireEffectiveHead === 'function' &&
    typeof candidate.createBranch === 'function' &&
    typeof candidate.transitionBranchStatus === 'function'
  );
}

export function hasParticipantStore<T extends object>(
  store: T,
): store is T & ICampaignSessionParticipantPort {
  const candidate = store as Partial<ICampaignSessionParticipantPort>;
  return (
    typeof candidate.bindCampaignSessionParticipant === 'function' &&
    typeof candidate.activeCampaignSessionMembership === 'function' &&
    typeof candidate.isActiveCampaignGm === 'function' &&
    typeof candidate.campaignHasAnyActiveSeat === 'function' &&
    typeof candidate.isActiveCampaignSeat === 'function' &&
    typeof candidate.listActiveCampaignSessionParticipants === 'function' &&
    typeof candidate.revokeCampaignSessionParticipant === 'function' &&
    typeof candidate.isRevokedCampaignSessionParticipant === 'function'
  );
}

export function hasDeliveryCursorStore<T extends object>(
  store: T,
): store is T & IParticipantDeliveryCursorPort {
  const candidate = store as Partial<IParticipantDeliveryCursorPort>;
  return (
    typeof candidate.readParticipantDeliveryCursor === 'function' &&
    typeof candidate.recordParticipantAcknowledgement === 'function'
  );
}
