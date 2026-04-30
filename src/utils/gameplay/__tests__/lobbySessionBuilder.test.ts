import type { ILobbyState, ILoadout } from '@/types/gameplay';

import { GameEventType, GameSide } from '@/types/gameplay';

import { buildGameSessionFromLobbyState } from '../gameSession';

function makeLoadout(side: string): ILoadout {
  return {
    units: [
      {
        unitId: `${side}-unit`,
        designation: `${side} BattleMech`,
        tonnage: 55,
        bv: 1200,
      },
    ],
    pilots: [
      {
        pilotId: `${side}-pilot`,
        unitId: `${side}-unit`,
        callsign: `${side} Pilot`,
        gunnery: 4,
        piloting: 5,
      },
    ],
  };
}

describe('buildGameSessionFromLobbyState', () => {
  it('creates a session from host and guest loadouts with side owners', () => {
    const lobby: ILobbyState = {
      mode: '1v1',
      hostPeerId: 'host-peer',
      guestPeerId: 'guest-peer',
      hostLoadout: makeLoadout('host'),
      guestLoadout: makeLoadout('guest'),
      mapConfig: { radius: 12, terrainPreset: 'woods', turnLimit: 15 },
      hostReady: true,
      guestReady: true,
      matchId: 'match-1',
    };

    const session = buildGameSessionFromLobbyState(lobby, 'match-1');

    expect(session.id).toBe('match-1');
    expect(session.hostPeerId).toBe('host-peer');
    expect(session.guestPeerId).toBe('guest-peer');
    expect(session.sideOwners).toEqual({
      [GameSide.Player]: 'host-peer',
      [GameSide.Opponent]: 'guest-peer',
    });
    expect(session.config.mapRadius).toBe(12);
    expect(session.config.turnLimit).toBe(15);
    expect(session.units.map((unit) => unit.unitRef)).toEqual([
      'host-unit',
      'guest-unit',
    ]);
    expect(session.events[0]?.type).toBe(GameEventType.GameCreated);
    expect(session.events[0]?.payload).toMatchObject({
      units: [
        { unitRef: 'host-unit', side: GameSide.Player },
        { unitRef: 'guest-unit', side: GameSide.Opponent },
      ],
    });
  });
});
