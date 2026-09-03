/**
 * Durable membership source over the match store's lobby seats
 * (authority-audit PR 2).
 *
 * Membership for a match session derives ONLY from durable state: a
 * HUMAN- or SPECTATOR-kind seat whose occupant is the principal, or -
 * for pre-lobby matches persisted before seats existed - the durable
 * `playerIds` roster. Client-supplied role/ownership claims have no
 * path in; AI seats never produce membership (no principal occupies
 * them as a human).
 *
 * Role is `gm` only when the durable campaign_session_participant
 * row for this principal is seat `gm` (the same row box 9.3 reads).
 * Spectator occupancy is membership, not GM identity; a watcher and a
 * tactical player both stay `player` unless that row exists.
 *
 * MEMBERSHIP EPOCH (the IMembershipSource invariant): the session
 * epoch is derived deterministically from the durable membership-
 * relevant state itself (canonical hash of the seat occupancy or the
 * roster), so ANY seat change - join, leave, swap, revocation -
 * changes the epoch without needing a separate counter column, and an
 * unchanged lobby keeps a stable epoch across restarts.
 *
 * @spec openspec/changes/add-authority-audit-and-privacy-proof/specs/authority-history/spec.md
 */

import { sha256 } from 'js-sha256';

import {
  hasParticipantStore,
  isParticipantStoreReady,
} from '@/lib/events/storeCapabilityPorts';
import type { IMatchSeat } from '@/types/multiplayer/Lobby';

import type {
  IMembershipRecord,
  IMembershipSource,
  ViewerRole,
} from './AuthorizedViewer';

import {
  MatchNotFoundError,
  type IMatchMeta,
  type IMatchStore,
} from '../IMatchStore';

/**
 * Infrastructure failure reading membership - DISTINCT from "no such
 * membership". Admission fails closed on it; revalidation of already
 * attached members deliberately does NOT treat it as revocation.
 */
export class MembershipSourceUnavailableError extends Error {
  public readonly name = 'MembershipSourceUnavailableError';
  public constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
  }
}

const MEMBER_SEAT_KINDS: ReadonlySet<string> = new Set(['human', 'spectator']);

function membershipEpoch(meta: IMatchMeta): number {
  const seats = meta.seats ?? null;
  // Status participates: lobby-phase invitee membership ends when the
  // match starts, so the epoch must change on that transition too.
  const material =
    seats === null
      ? { status: meta.status, roster: [...meta.playerIds].sort() }
      : {
          status: meta.status,
          seats: seats
            .map((seat) => ({
              slotId: seat.slotId,
              kind: seat.kind,
              occupant: seat.occupant?.playerId ?? null,
            }))
            .sort((left, right) => left.slotId.localeCompare(right.slotId)),
        };
  // 12 hex chars stay inside the safe-integer range while remaining
  // collision-resistant for change detection.
  return parseInt(sha256(JSON.stringify(material)).slice(0, 12), 16);
}

function ownedSeats(
  seats: readonly IMatchSeat[],
  principalId: string,
): readonly IMatchSeat[] {
  return seats.filter(
    (seat) =>
      seat.occupant?.playerId === principalId &&
      MEMBER_SEAT_KINDS.has(seat.kind),
  );
}

/**
 * Viewer role for a seated or rostered member.
 * WHAT: `gm` only when the durable campaign participant row is seat `gm`.
 * WHY: that row is GM identity (creation checkpoint / 9.3 probe). Missing
 * port, unreadied store, no coop campaign, or no gm row stay `player`
 * so tactical matches stay unchanged.
 */
function deriveMembershipRole(
  store: IMatchStore,
  meta: IMatchMeta,
  principalId: string,
): ViewerRole {
  const campaignId = meta.coopCampaign?.campaignId;
  if (campaignId === undefined) return 'player';
  if (!hasParticipantStore(store) || !isParticipantStoreReady(store)) {
    return 'player';
  }
  const membership = store.activeCampaignSessionMembership(
    campaignId,
    meta.matchId,
    principalId,
  );
  if (membership !== null && membership.seat === 'gm') {
    return 'gm';
  }
  return 'player';
}

export class MatchSeatMembershipSource implements IMembershipSource {
  public constructor(private readonly store: IMatchStore) {}

  private async metaFor(matchId: string): Promise<IMatchMeta | null> {
    try {
      return await this.store.getMatchMeta(matchId);
    } catch (error) {
      // Unknown match is "no membership"; anything else is an
      // infrastructure failure and MUST NOT read as revocation.
      if (error instanceof MatchNotFoundError) return null;
      throw new MembershipSourceUnavailableError(
        `Membership read failed for ${matchId}`,
        error,
      );
    }
  }

  public async lookupMembership(
    principalId: string,
    campaignSessionId: string,
  ): Promise<IMembershipRecord | null> {
    const meta = await this.metaFor(campaignSessionId);
    if (meta === null) return null;
    const epoch = membershipEpoch(meta);
    const seats = meta.seats ?? null;

    if (seats === null) {
      // Pre-lobby durable roster (Wave-1 matches).
      if (!meta.playerIds.includes(principalId)) return null;
      const role = deriveMembershipRole(this.store, meta, principalId);
      return {
        principalId,
        principalKind: 'human',
        campaignId: meta.coopCampaign?.campaignId ?? meta.matchId,
        campaignSessionId: meta.matchId,
        matchId: meta.matchId,
        participantId: principalId,
        role,
        ownedForceIds: [],
        membershipRevision: epoch,
        active: true,
      };
    }

    const owned = ownedSeats(seats, principalId);
    if (owned.length === 0) {
      // LOBBY-PHASE INVITEE MEMBERSHIP: room-code joiners connect the
      // socket BEFORE occupying a seat (the lobby client waits for
      // LobbyUpdated, then sends OccupySeat), so seat occupancy cannot
      // be the admission requirement while the match is joinable. A
      // verified principal is a lobby invitee - member with NO owned
      // forces - while the match is in lobby status and a joinable
      // human seat remains open (or they are on the durable roster).
      // The moment the match starts, occupancy IS membership.
      const openHumanSeat = seats.some(
        (seat) => seat.kind === 'human' && seat.occupant === null,
      );
      const onRoster = meta.playerIds.includes(principalId);
      if (meta.status === 'lobby' && (openHumanSeat || onRoster)) {
        const role = deriveMembershipRole(this.store, meta, principalId);
        return {
          principalId,
          principalKind: 'human',
          campaignId: meta.coopCampaign?.campaignId ?? meta.matchId,
          campaignSessionId: meta.matchId,
          matchId: meta.matchId,
          participantId: principalId,
          role,
          ownedForceIds: [],
          membershipRevision: epoch,
          active: true,
        };
      }
      return null;
    }
    const playingSlotIds = owned
      .filter((seat) => seat.kind === 'human')
      .map((seat) => seat.slotId);
    const primary = owned[0];
    if (primary === undefined) return null;
    const role = deriveMembershipRole(this.store, meta, principalId);
    return {
      principalId,
      principalKind: 'human',
      campaignId: meta.coopCampaign?.campaignId ?? meta.matchId,
      campaignSessionId: meta.matchId,
      matchId: meta.matchId,
      participantId: primary.slotId,
      role,
      ownedForceIds: role === 'gm' ? [] : playingSlotIds,
      membershipRevision: epoch,
      active: true,
    };
  }

  public async currentMembershipRevision(
    campaignSessionId: string,
  ): Promise<number> {
    const meta = await this.metaFor(campaignSessionId);
    if (meta === null) return -1;
    return membershipEpoch(meta);
  }
}
