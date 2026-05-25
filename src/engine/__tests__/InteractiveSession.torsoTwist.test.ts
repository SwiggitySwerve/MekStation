import { describe, expect, it } from '@jest/globals';

import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  GameStatus,
  type IGameUnit,
} from '@/types/gameplay';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { createGameSession, startGame } from '@/utils/gameplay/gameSession';

import { InteractiveSession } from '../InteractiveSession';

function makeUnits(): readonly IGameUnit[] {
  return [
    {
      id: 'unit-player',
      name: 'Atlas',
      side: GameSide.Player,
      unitRef: 'atlas-as7-d',
      pilotRef: 'pilot-player',
      gunnery: 4,
      piloting: 5,
      unitType: UnitType.BATTLEMECH,
    },
  ];
}

function makeInteractiveSession(): InteractiveSession {
  const session = startGame(
    createGameSession(
      {
        mapRadius: 5,
        turnLimit: 30,
        victoryConditions: ['elimination'],
        optionalRules: [],
      },
      makeUnits(),
    ),
    GameSide.Player,
  );
  return InteractiveSession.fromSession({
    ...session,
    currentState: {
      ...session.currentState,
      status: GameStatus.Active,
      phase: GamePhase.WeaponAttack,
      units: {
        ...session.currentState.units,
        'unit-player': {
          ...session.currentState.units['unit-player'],
          facing: Facing.North,
          secondaryFacing: Facing.North,
        },
      },
    },
  });
}

describe('InteractiveSession.torsoTwist', () => {
  it('emits a replayable FacingChanged event through the interactive engine', () => {
    const session = makeInteractiveSession();

    session.torsoTwist('unit-player', Facing.Northeast);

    const event = session
      .getSession()
      .events.find((entry) => entry.type === GameEventType.FacingChanged);
    expect(event?.payload).toMatchObject({
      unitId: 'unit-player',
      secondaryFacing: Facing.Northeast,
    });
    expect(session.getState().units['unit-player'].secondaryFacing).toBe(
      Facing.Northeast,
    );
  });
});
