import {
  GameSide,
  type IGameConfig,
  type IGameCreatedPayload,
  type IGameUnit,
  type IRepresentedMinefieldState,
} from '@/types/gameplay';

import { createGameSession } from '../gameSession';
import { buildFromSkirmishConfig } from '../preBattleSessionBuilder';

function createConfig(): IGameConfig {
  return {
    mapRadius: 8,
    turnLimit: 12,
    victoryConditions: ['destroy_all'],
    optionalRules: [],
  };
}

function createUnits(): readonly IGameUnit[] {
  return [
    {
      id: 'player-1',
      name: 'Player Mech',
      side: GameSide.Player,
      unitRef: 'player-mech',
      pilotRef: 'player-pilot',
      gunnery: 4,
      piloting: 5,
    },
    {
      id: 'opponent-1',
      name: 'Opponent Mech',
      side: GameSide.Opponent,
      unitRef: 'opponent-mech',
      pilotRef: 'opponent-pilot',
      gunnery: 4,
      piloting: 5,
    },
  ];
}

describe('game session represented minefield authoring', () => {
  const authoredMinefields: Readonly<
    Record<string, IRepresentedMinefieldState>
  > = {
    '1,0': {
      type: 'conventional',
      damagePerLeg: 7,
      source: 'scenario',
    },
  };

  it('seeds explicit coordinate minefields through GameCreated state', () => {
    const session = createGameSession(createConfig(), createUnits(), {
      minefields: authoredMinefields,
    });

    expect(
      (session.events[0].payload as IGameCreatedPayload).minefields,
    ).toEqual(authoredMinefields);
    expect(session.currentState.minefields).toEqual(authoredMinefields);
  });

  it('lets prebattle skirmish config pass explicit minefield coordinates into combat', () => {
    const session = buildFromSkirmishConfig({
      encounterId: 'minefield-skirmish',
      mapRadius: 8,
      terrainPreset: 'clear',
      player: {
        units: [
          {
            unitId: 'player-mech',
            designation: 'Player Mech',
            tonnage: 50,
            bv: 1000,
            pilot: {
              pilotId: 'player-pilot',
              callsign: 'Alpha',
              gunnery: 4,
              piloting: 5,
            },
          },
        ],
      },
      opponent: {
        units: [
          {
            unitId: 'opponent-mech',
            designation: 'Opponent Mech',
            tonnage: 50,
            bv: 1000,
            pilot: {
              pilotId: 'opponent-pilot',
              callsign: 'Beta',
              gunnery: 4,
              piloting: 5,
            },
          },
        ],
      },
      minefields: authoredMinefields,
    });

    expect(session.currentState.minefields).toEqual(authoredMinefields);
  });
});
