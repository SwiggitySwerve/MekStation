/**
 * MatchSeatMembershipSource: campaign GM role vs tactical player role.
 *
 * Predicted red before the product edit: the GM row (role stayed
 * `player`). Controls (tactical owner, co-op with no gm row) already
 * read `player`.
 */

import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';
import { defaultSeats, emptySpectatorSeat } from '@/types/multiplayer/Lobby';

import type { IMatchMeta } from '../../IMatchStore';

import { InMemoryMatchStore } from '../../InMemoryMatchStore';
import { MatchSeatMembershipSource } from '../MatchSeatMembershipSource';

const MATCH_ID = 'match-seat-role';
const CAMPAIGN_ID = 'camp-seat-role';
const HOST_ID = 'pid_host';
const PLAYER_ID = 'pid_player';

/**
 * Occupied 1v1 seats used by the tactical control.
 * WHY: ownedForceIds must stay the human slot, not a spectator.
 */
function tacticalSeats() {
  return defaultSeats('1v1').map((seat) => {
    if (seat.slotId === 'alpha-1') {
      return {
        ...seat,
        occupant: { playerId: PLAYER_ID, displayName: 'Player' },
      };
    }
    return seat;
  });
}

/**
 * Co-op seats: GM on spectator-1, both human seats empty.
 * WHY: this is the post-fix lobby the membership role must read.
 */
function coopSpectatorSeats() {
  return [
    ...defaultSeats('1v1'),
    {
      ...emptySpectatorSeat(1),
      occupant: { playerId: HOST_ID, displayName: 'GM' },
    },
  ];
}

/**
 * Build match meta for membership lookups.
 * WHAT: lobby 1v1, optional coop campaign, optional custom seats.
 * WHY: the three rows share one factory so only the gm-row signal differs.
 */
function meta(options: {
  readonly coop: boolean;
  readonly seats: IMatchMeta['seats'];
  readonly occupantIds: readonly string[];
}): IMatchMeta {
  const now = '2026-09-03T00:00:00.000Z';
  return {
    matchId: MATCH_ID,
    hostPlayerId: HOST_ID,
    playerIds: Array.from(options.occupantIds),
    sideAssignments: Array.from(options.occupantIds).map((playerId, idx) => ({
      playerId,
      side: idx === 0 ? 'player' : 'opponent',
    })),
    status: 'lobby',
    createdAt: now,
    updatedAt: now,
    config: { mapRadius: 4, turnLimit: 5 },
    layout: '1v1',
    seats: options.seats,
    ...(options.coop
      ? {
          coopCampaign: {
            campaignId: CAMPAIGN_ID,
            state: createEmptyCampaignState(CAMPAIGN_ID),
          },
        }
      : {}),
  };
}

describe('MatchSeatMembershipSource campaign GM role', () => {
  it('reads role gm with no owned forces for the durable campaign GM', async () => {
    const store = new InMemoryMatchStore({ quiet: true });
    await store.createMatch(
      meta({
        coop: true,
        seats: coopSpectatorSeats(),
        occupantIds: [HOST_ID],
      }),
    );
    store.bindCampaignSessionParticipant({
      campaignId: CAMPAIGN_ID,
      sessionId: MATCH_ID,
      participantId: HOST_ID,
      seat: 'gm',
      boundAt: '2026-09-03T00:00:00.000Z',
    });

    const row = await new MatchSeatMembershipSource(store).lookupMembership(
      HOST_ID,
      MATCH_ID,
    );
    expect(row?.role).toBe('gm');
    expect(row?.ownedForceIds).toEqual([]);
    expect(row?.participantId).toBe('spectator-1');
  });

  it('reads role player with the human slot forces for a tactical occupant', async () => {
    const store = new InMemoryMatchStore({ quiet: true });
    await store.createMatch(
      meta({
        coop: false,
        seats: tacticalSeats(),
        occupantIds: [PLAYER_ID],
      }),
    );

    const row = await new MatchSeatMembershipSource(store).lookupMembership(
      PLAYER_ID,
      MATCH_ID,
    );
    expect(row?.role).toBe('player');
    expect(row?.ownedForceIds).toEqual(['alpha-1']);
  });

  it('reads role player when the durable row seats this principal as a player', async () => {
    // A participant row is membership, not GM identity: only the gm seat
    // confers the gm role, so a seated player with a row stays a player.
    const store = new InMemoryMatchStore({ quiet: true });
    await store.createMatch(
      meta({
        coop: true,
        seats: coopSpectatorSeats(),
        occupantIds: [HOST_ID],
      }),
    );
    store.bindCampaignSessionParticipant({
      campaignId: CAMPAIGN_ID,
      sessionId: MATCH_ID,
      participantId: HOST_ID,
      seat: 'player',
      boundAt: '2026-09-03T00:00:00.000Z',
    });

    const row = await new MatchSeatMembershipSource(store).lookupMembership(
      HOST_ID,
      MATCH_ID,
    );
    expect(row?.role).toBe('player');
  });

  it('reads role player on a co-op match when no gm row exists', async () => {
    const store = new InMemoryMatchStore({ quiet: true });
    await store.createMatch(
      meta({
        coop: true,
        seats: coopSpectatorSeats(),
        occupantIds: [HOST_ID],
      }),
    );

    const row = await new MatchSeatMembershipSource(store).lookupMembership(
      HOST_ID,
      MATCH_ID,
    );
    expect(row?.role).toBe('player');
    expect(row?.ownedForceIds).toEqual([]);
  });
});
