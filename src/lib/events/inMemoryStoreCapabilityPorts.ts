/**
 * In-memory participant and cursor ports on the history-branch sibling.
 * Seat counts live inside bind; revoke is a timestamp; acks never
 * persist past the highestAssigned supplied on the call.
 */

import type {
  IParticipantAckRequest,
  IParticipantDeliveryCursor,
  ParticipantAckResult,
} from '@/lib/campaign/delivery/participantDeliveryCursor';
import type {
  BindParticipantResult,
  CampaignSeat,
  ICampaignSessionMembership,
} from '@/services/campaignPersistence/CampaignSessionParticipantStore';

import {
  PRODUCTION_BRANCH_CREATION_SEAM,
  type IBranchCreationSeam,
} from '@/lib/events/journal/EventHistoryBranchContract';

import type {
  ICampaignSessionParticipantPort,
  IParticipantAckAuthorization,
  IParticipantDeliveryCursorPort,
} from './storeCapabilityPorts';

import { InMemoryHistoryBranchPort } from './inMemoryHistoryBranchPort';

/** Must stay equal to CampaignSessionParticipantStore.TACTICAL_SEAT_LIMIT. */
const TACTICAL_SEAT_LIMIT = 2;
function membershipKey(
  campaignId: string,
  sessionId: string,
  participantId: string,
): string {
  return `${campaignId}/${sessionId}/${participantId}`;
}

function cursorKey(
  campaignId: string,
  grantId: string,
  participantId: string,
): string {
  return `${campaignId}/${grantId}/${participantId}`;
}

function notAuthorized(): ParticipantAckResult {
  return Object.freeze({
    kind: 'not-authorized' as const,
    reason: 'not-authorized' as const,
  });
}

export class InMemoryStoreCapabilityPorts
  extends InMemoryHistoryBranchPort
  implements ICampaignSessionParticipantPort, IParticipantDeliveryCursorPort
{
  private readonly memberships = new Map<string, ICampaignSessionMembership>();
  private readonly cursors = new Map<string, IParticipantDeliveryCursor>();

  public constructor(
    seam: IBranchCreationSeam = PRODUCTION_BRANCH_CREATION_SEAM,
  ) {
    super(seam);
  }

  public clearPorts(): void {
    this.clearBranches();
    this.memberships.clear();
    this.cursors.clear();
  }

  public bindCampaignSessionParticipant(input: {
    readonly campaignId: string;
    readonly sessionId: string;
    readonly participantId: string;
    readonly seat: CampaignSeat;
    readonly boundAt: string;
  }): BindParticipantResult {
    const key = membershipKey(
      input.campaignId,
      input.sessionId,
      input.participantId,
    );
    const existing = this.memberships.get(key);
    if (existing) {
      if (existing.revokedAt !== null) return { kind: 'revoked' };
      return { kind: 'already-bound', membership: existing };
    }
    if (
      input.seat === 'player' &&
      this.countActiveSeats(input.campaignId, input.sessionId, 'player') >=
        TACTICAL_SEAT_LIMIT
    ) {
      return { kind: 'tactical-seats-full', limit: TACTICAL_SEAT_LIMIT };
    }
    if (
      input.seat === 'gm' &&
      this.countActiveSeats(input.campaignId, input.sessionId, 'gm') > 0
    ) {
      return { kind: 'gm-seat-taken' };
    }
    const membership: ICampaignSessionMembership = {
      ...input,
      revokedAt: null,
    };
    this.memberships.set(key, membership);
    return { kind: 'bound', membership };
  }

  public activeCampaignSessionMembership(
    campaignId: string,
    sessionId: string,
    participantId: string,
  ): ICampaignSessionMembership | null {
    const row = this.memberships.get(
      membershipKey(campaignId, sessionId, participantId),
    );
    if (row === undefined || row.revokedAt !== null) return null;
    return row;
  }

  public isActiveCampaignGm(
    campaignId: string,
    participantId: string,
  ): boolean {
    return this.hasActive(campaignId, participantId, 'gm');
  }

  public campaignHasAnyActiveSeat(campaignId: string): boolean {
    for (const row of Array.from(this.memberships.values())) {
      if (row.campaignId === campaignId && row.revokedAt === null) return true;
    }
    return false;
  }

  public isActiveCampaignSeat(
    campaignId: string,
    participantId: string,
  ): boolean {
    return this.hasActive(campaignId, participantId, null);
  }

  public listActiveCampaignSessionParticipants(
    campaignId: string,
    sessionId: string,
  ): readonly ICampaignSessionMembership[] {
    return Array.from(this.memberships.values())
      .filter(
        (row) =>
          row.campaignId === campaignId &&
          row.sessionId === sessionId &&
          row.revokedAt === null,
      )
      .sort((left, right) => {
        const seat = left.seat.localeCompare(right.seat);
        if (seat !== 0) return seat;
        const bound = left.boundAt.localeCompare(right.boundAt);
        if (bound !== 0) return bound;
        return left.participantId.localeCompare(right.participantId);
      });
  }

  public revokeCampaignSessionParticipant(input: {
    readonly campaignId: string;
    readonly sessionId: string;
    readonly participantId: string;
    readonly revokedAt: string;
  }): boolean {
    const key = membershipKey(
      input.campaignId,
      input.sessionId,
      input.participantId,
    );
    const row = this.memberships.get(key);
    if (row === undefined || row.revokedAt !== null) return false;
    this.memberships.set(key, { ...row, revokedAt: input.revokedAt });
    return true;
  }

  public isRevokedCampaignSessionParticipant(
    campaignId: string,
    sessionId: string,
    participantId: string,
  ): boolean {
    const row = this.memberships.get(
      membershipKey(campaignId, sessionId, participantId),
    );
    return row !== undefined && row.revokedAt !== null;
  }

  public readParticipantDeliveryCursor(key: {
    readonly campaignId: string;
    readonly grantId: string;
    readonly participantId: string;
  }): IParticipantDeliveryCursor | null {
    return (
      this.cursors.get(
        cursorKey(key.campaignId, key.grantId, key.participantId),
      ) ?? null
    );
  }

  public async recordParticipantAcknowledgement(
    request: IParticipantAckRequest,
    authorization: IParticipantAckAuthorization,
    nowIso: string,
  ): Promise<ParticipantAckResult> {
    void nowIso;
    if (
      !Number.isInteger(request.ackedSequence) ||
      request.ackedSequence < 0 ||
      request.deliveryEpochId.trim() === ''
    ) {
      return notAuthorized();
    }
    const grant = authorization.grant;
    if (
      grant === null ||
      request.principal.principalId !== grant.participantId ||
      request.grantId !== grant.grantId ||
      !grant.active
    ) {
      return notAuthorized();
    }
    if (!authorization.viewerAuthorized) return notAuthorized();
    if (authorization.currentEpochId !== request.deliveryEpochId) {
      return {
        kind: 'foreign-epoch',
        currentEpochId: authorization.currentEpochId,
      };
    }
    const stored = this.readParticipantDeliveryCursor({
      campaignId: grant.campaignId,
      grantId: grant.grantId,
      participantId: grant.participantId,
    });
    if (
      stored !== null &&
      stored.deliveryEpochId === request.deliveryEpochId &&
      request.ackedSequence <= stored.ackedSequence
    ) {
      return { kind: 'stale', cursor: stored };
    }
    if (request.ackedSequence > authorization.highestAssigned) {
      return { kind: 'gap', highestAssigned: authorization.highestAssigned };
    }
    const cursor: IParticipantDeliveryCursor = {
      campaignId: grant.campaignId,
      grantId: grant.grantId,
      participantId: grant.participantId,
      deliveryEpochId: request.deliveryEpochId,
      ackedSequence: request.ackedSequence,
    };
    this.cursors.set(
      cursorKey(cursor.campaignId, cursor.grantId, cursor.participantId),
      cursor,
    );
    return { kind: 'applied', cursor };
  }

  private countActiveSeats(
    campaignId: string,
    sessionId: string,
    seat: CampaignSeat,
  ): number {
    let count = 0;
    for (const row of Array.from(this.memberships.values())) {
      if (
        row.campaignId === campaignId &&
        row.sessionId === sessionId &&
        row.seat === seat &&
        row.revokedAt === null
      ) {
        count += 1;
      }
    }
    return count;
  }

  private hasActive(
    campaignId: string,
    participantId: string,
    seat: CampaignSeat | null,
  ): boolean {
    for (const row of Array.from(this.memberships.values())) {
      if (
        row.campaignId === campaignId &&
        row.participantId === participantId &&
        row.revokedAt === null &&
        (seat === null || row.seat === seat)
      ) {
        return true;
      }
    }
    return false;
  }
}
