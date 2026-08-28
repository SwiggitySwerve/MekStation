/**
 * Durable membership source over campaign grants (design D4, task 3.2).
 *
 * Precedent: MatchSeatMembershipSource. Membership for a campaign
 * session derives ONLY from durable grant rows: an ACTIVE grant whose
 * participantId is the principal and whose campaignId is the session.
 * Revoked, expired, or absent grants are no membership. Client-supplied
 * role or scope claims have no path in.
 *
 * MEMBERSHIP EPOCH: derived from the durable grant set for the
 * campaign (canonical scopes, revocation, and whether the injected
 * clock has passed expiresAt). Any issue, revoke, scope-set change, or
 * expiry flips the epoch without a separate counter column, so the
 * delivery 8-tuple cannot silently continue an old per-grant sequence.
 * Infrastructure failures raise MembershipSourceUnavailableError;
 * they are never a revocation.
 *
 * IMembershipRecord is not widened. Grant scopes ride separately into
 * the projection filter.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D4)
 */

import { sha256 } from 'js-sha256';

import type {
  IMembershipRecord,
  IMembershipSource,
  ViewerRole,
} from '@/lib/multiplayer/server/authorization/AuthorizedViewer';

import { MembershipSourceUnavailableError } from '@/lib/multiplayer/server/authorization/MatchSeatMembershipSource';

import type {
  ICampaignGrant,
  ICampaignGrantStore,
} from '../grants/ICampaignGrantStore';
import type { CampaignGrantClock } from './campaignDeliveryTypes';

import { serializeGrantScopes } from '../grants/campaignGrantGuards';

export { MembershipSourceUnavailableError };

/**
 * True when the grant is un-revoked and the injected clock is still
 * strictly before expiresAt. Matches token verification (expiresAt
 * equal to now is expired). Unparseable timestamps fail closed as
 * inactive rather than minting membership from a corrupt clock.
 */
export function isCampaignGrantActive(
  grant: ICampaignGrant,
  nowIso: string,
): boolean {
  if (grant.revokedAt !== null) return false;
  const nowMs = Date.parse(nowIso);
  const expiresMs = Date.parse(grant.expiresAt);
  if (!Number.isFinite(nowMs) || !Number.isFinite(expiresMs)) return false;
  return expiresMs > nowMs;
}

/**
 * Oldest-issued active grant for this principal. listGrants already
 * orders by issuedAt then grantId; the first active match is stable
 * across restarts. Multiple active grants are not the product model;
 * this pick stays deterministic if they exist.
 */
export function selectActiveCampaignGrant(
  grants: readonly ICampaignGrant[],
  principalId: string,
  nowIso: string,
): ICampaignGrant | null {
  for (const grant of grants) {
    if (
      grant.participantId === principalId &&
      isCampaignGrantActive(grant, nowIso)
    ) {
      return grant;
    }
  }
  return null;
}

/**
 * Canonical fingerprint of one grant as it participates in the session
 * epoch. grantId keeps two otherwise-identical rows distinct. expired
 * is derived from the injected clock so crossing expiresAt produces a
 * new epoch and drops the resolver cache, the same way a revocation
 * does, without treating expiry as a store write.
 */
function grantFingerprint(
  grant: ICampaignGrant,
  nowIso: string,
): {
  readonly grantId: string;
  readonly participantId: string;
  readonly scopes: string;
  readonly revokedAt: string | null;
  readonly expired: boolean;
} {
  return {
    grantId: grant.grantId,
    participantId: grant.participantId,
    scopes: serializeGrantScopes(grant.scopes),
    revokedAt: grant.revokedAt,
    expired: grant.revokedAt === null && !isCampaignGrantActive(grant, nowIso),
  };
}

/**
 * Session membership epoch from the grant set. 12 hex chars stay inside
 * the safe-integer range while remaining collision-resistant for change
 * detection, matching MatchSeatMembershipSource.
 */
export function membershipRevisionFromGrants(
  grants: readonly ICampaignGrant[],
  nowIso: string,
): number {
  const material = grants
    .map(function (grant) {
      return grantFingerprint(grant, nowIso);
    })
    .sort(function (left, right) {
      if (left.grantId < right.grantId) return -1;
      if (left.grantId > right.grantId) return 1;
      return 0;
    });
  return parseInt(sha256(JSON.stringify(material)).slice(0, 12), 16);
}

/** GM grants that include `gm` mint the gm viewer role; everyone else is player. */
function viewerRoleForGrant(grant: ICampaignGrant): ViewerRole {
  return grant.scopes.includes('gm') ? 'gm' : 'player';
}

export class CampaignGrantMembershipSource implements IMembershipSource {
  /**
   * Binds the durable grant store and an injected clock. The clock MUST
   * return a nonempty ISO-8601 string; this class never reads the
   * system clock.
   */
  public constructor(
    private readonly store: ICampaignGrantStore,
    private readonly clock: CampaignGrantClock,
  ) {}

  /**
   * Lists grants for the campaign, mapping store failures to the typed
   * unavailable error so a thrown driver error cannot read as
   * "no membership".
   */
  private grantsFor(campaignSessionId: string): readonly ICampaignGrant[] {
    try {
      return this.store.listGrants(campaignSessionId);
    } catch (error) {
      if (error instanceof MembershipSourceUnavailableError) throw error;
      throw new MembershipSourceUnavailableError(
        `Membership read failed for ${campaignSessionId}`,
        error,
      );
    }
  }

  /**
   * Active grant for this principal in this campaign, or null. A
   * revoked, expired, or absent grant is no membership.
   */
  public async lookupMembership(
    principalId: string,
    campaignSessionId: string,
  ): Promise<IMembershipRecord | null> {
    const grants = this.grantsFor(campaignSessionId);
    const nowIso = this.clock();
    const grant = selectActiveCampaignGrant(grants, principalId, nowIso);
    if (grant === null) return null;
    const epoch = membershipRevisionFromGrants(grants, nowIso);
    return {
      principalId,
      principalKind: 'human',
      campaignId: grant.campaignId,
      campaignSessionId,
      matchId: null,
      participantId: grant.participantId,
      role: viewerRoleForGrant(grant),
      ownedForceIds: [],
      membershipRevision: epoch,
      active: true,
    };
  }

  /**
   * Session epoch from the full grant set (including revoked rows).
   * An empty set still hashes: issuing the first grant must change
   * the epoch rather than continue a sentinel.
   */
  public async currentMembershipRevision(
    campaignSessionId: string,
  ): Promise<number> {
    const grants = this.grantsFor(campaignSessionId);
    return membershipRevisionFromGrants(grants, this.clock());
  }
}
