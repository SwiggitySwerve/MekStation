import {
  GameEventType,
  GamePhase,
  GameSide,
  GameStatus,
  LockState,
  type IGameConfig,
  type IGameSession,
  type IGameUnit,
  type IMovementEnhancementActivatedPayload,
} from '@/types/gameplay';

import {
  activateMovementEnhancement,
  createGameSession,
  rollInitiative,
  startGame,
} from '../gameSession';

function makeConfig(): IGameConfig {
  return {
    mapRadius: 5,
    turnLimit: 30,
    victoryConditions: ['elimination'],
    optionalRules: [],
  };
}

function makeUnits(): readonly IGameUnit[] {
  return [
    {
      id: 'player-1',
      name: 'Atlas',
      side: GameSide.Player,
      unitRef: 'atlas-as7-d',
      pilotRef: 'pilot-a',
      gunnery: 4,
      piloting: 5,
      hasMASC: true,
      hasSupercharger: true,
    },
    {
      id: 'opponent-1',
      name: 'Marauder',
      side: GameSide.Opponent,
      unitRef: 'marauder-mad-3r',
      pilotRef: 'pilot-b',
      gunnery: 4,
      piloting: 5,
    },
  ];
}

function makeMovementSession(): IGameSession {
  let session = createGameSession(makeConfig(), makeUnits());
  session = startGame(session, GameSide.Player);
  session = rollInitiative(session, GameSide.Player, () => 6);
  return {
    ...session,
    currentState: {
      ...session.currentState,
      status: GameStatus.Active,
      phase: GamePhase.Movement,
      units: {
        ...session.currentState.units,
        'player-1': {
          ...session.currentState.units['player-1'],
          lockState: LockState.Pending,
        },
      },
    },
  };
}

describe('activateMovementEnhancement', () => {
  it('emits a replayable MASC activation event without consuming movement', () => {
    const session = makeMovementSession();

    const next = activateMovementEnhancement(session, 'player-1', 'MASC');

    const event = next.events.find(
      (entry) => entry.type === GameEventType.MovementEnhancementActivated,
    );
    expect(event?.payload as IMovementEnhancementActivatedPayload).toEqual({
      unitId: 'player-1',
      enhancement: 'MASC',
    });
    expect(next.currentState.units['player-1'].activeMASC).toBe(true);
    expect(next.currentState.units['player-1'].lockState).toBe(
      LockState.Pending,
    );
    expect(next.currentState.activationIndex).toBe(
      session.currentState.activationIndex,
    );
  });

  it('emits a replayable Supercharger activation event', () => {
    const session = makeMovementSession();

    const next = activateMovementEnhancement(
      session,
      'player-1',
      'Supercharger',
    );

    expect(next.currentState.units['player-1'].activeSupercharger).toBe(true);
    expect(next.events.at(-1)?.payload).toMatchObject({
      unitId: 'player-1',
      enhancement: 'Supercharger',
    });
  });

  it('does not activate missing or already-active boosters', () => {
    const session = makeMovementSession();
    const withoutMasc = {
      ...session,
      currentState: {
        ...session.currentState,
        units: {
          ...session.currentState.units,
          'player-1': {
            ...session.currentState.units['player-1'],
            hasMASC: false,
          },
        },
      },
    };

    expect(activateMovementEnhancement(withoutMasc, 'player-1', 'MASC')).toBe(
      withoutMasc,
    );

    const activated = activateMovementEnhancement(session, 'player-1', 'MASC');
    expect(activateMovementEnhancement(activated, 'player-1', 'MASC')).toBe(
      activated,
    );
  });
});
