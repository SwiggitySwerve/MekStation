/** Shared fixtures for specs about spectator seats persisted on active matches. */

import { defaultSeats, type IMatchSeat } from '@/types/multiplayer/Lobby';

import type { IMatchMeta } from '../IMatchStore';

import { addSpectatorSeat } from '../lobby/spectatorSeats';

const AT = '2026-01-01T00:00:00.000Z';

/** A full 1v1 roster with both playing seats occupied. */
export function playingSeats(): IMatchSeat[] {
  return defaultSeats('1v1').map((seat, index) => ({
    ...seat,
    occupant: {
      playerId: index === 0 ? 'pid_host' : 'pid_opp',
      displayName: index === 0 ? 'Host' : 'Opp',
    },
    ready: true,
  }));
}

/** The playing seats plus `count` spectators `watch-1` .. `watch-N`. */
export function seatsWithSpectators(count: number): IMatchSeat[] {
  let seats = playingSeats();
  for (let index = 1; index <= count; index += 1) {
    seats = addSpectatorSeat(seats, {
      playerId: `watch-${index}`,
      displayName: `Watch ${index}`,
    });
  }
  return seats;
}

export function matchWithSpectators(
  matchId: string,
  spectators: number,
  status: IMatchMeta['status'] = 'active',
): IMatchMeta {
  return {
    matchId,
    hostPlayerId: 'pid_host',
    playerIds: ['pid_host', 'pid_opp'],
    sideAssignments: [
      { playerId: 'pid_host', side: 'player' },
      { playerId: 'pid_opp', side: 'opponent' },
    ],
    status,
    createdAt: AT,
    updatedAt: AT,
    config: { mapRadius: 6, turnLimit: 10 },
    layout: '1v1',
    seats: seatsWithSpectators(spectators),
  };
}

/** The co-op GM's seat: the host sits in a spectator seat beside the viewers. */
export const GM_PLAYER_ID = 'pid_gm';

/**
 * A co-op campaign shape: `pid_gm` is `hostPlayerId` and holds `spectator-1`,
 * with `viewers` ordinary spectators after it.
 */
export function matchWithGmAndViewers(
  matchId: string,
  viewers: number,
  status: IMatchMeta['status'] = 'active',
): IMatchMeta {
  const base = matchWithSpectators(matchId, 0, status);
  let seats = addSpectatorSeat(playingSeats(), {
    playerId: GM_PLAYER_ID,
    displayName: 'GM',
  });
  for (let index = 1; index <= viewers; index += 1) {
    seats = addSpectatorSeat(seats, {
      playerId: `watch-${index}`,
      displayName: `Watch ${index}`,
    });
  }
  return {
    ...base,
    hostPlayerId: GM_PLAYER_ID,
    playerIds: [GM_PLAYER_ID, ...base.playerIds],
    seats,
  };
}
