import { describe, expect, it, jest } from '@jest/globals';

import type { BotPlayer } from '@/simulation/ai/BotPlayer';
import type {
  IGameSession,
  IGameUnit,
} from '@/types/gameplay/GameSessionInterfaces';

import {
  GamePhase,
  GameSide,
  LockState,
} from '@/types/gameplay/GameSessionInterfaces';
import {
  advancePhase,
  appendEvent,
  createGameSession,
  rollInitiative,
  startGame,
} from '@/utils/gameplay/gameSession';
import { createHexGrid } from '@/utils/gameplay/hexGrid';

import {
  runInteractiveSessionAITurn,
  type IInteractiveSessionAIContext,
} from '../InteractiveSession.ai';

function createMovementSession(): IGameSession {
  const units: readonly IGameUnit[] = [
    {
      id: 'player-1',
      side: GameSide.Player,
      name: 'Locust',
      unitRef: 'p1',
      pilotRef: 'pilot-p1',
      gunnery: 4,
      piloting: 5,
    },
    {
      id: 'opponent-1',
      side: GameSide.Opponent,
      name: 'Wasp',
      unitRef: 'o1',
      pilotRef: 'pilot-o1',
      gunnery: 4,
      piloting: 5,
    },
    {
      id: 'opponent-2',
      side: GameSide.Opponent,
      name: 'Stinger',
      unitRef: 'o2',
      pilotRef: 'pilot-o2',
      gunnery: 4,
      piloting: 5,
    },
  ];
  let session = createGameSession(
    {
      mapRadius: 5,
      turnLimit: 30,
      victoryConditions: ['elimination'],
      optionalRules: [],
    },
    units,
  );
  session = startGame(session, GameSide.Player);
  session = rollInitiative(session, GameSide.Opponent, () => 6);
  return advancePhase(session);
}

function createAIContext(
  getSession: () => IGameSession,
  setSession: (session: IGameSession) => void,
  botPlayer: BotPlayer,
): IInteractiveSessionAIContext {
  return {
    side: GameSide.Opponent,
    getSession,
    setSession,
    appendAndPersistEvent: (event) => {
      setSession(appendEvent(getSession(), event));
    },
    weaponsByUnit: new Map(),
    movementByUnit: new Map(),
    gunneryByUnit: new Map(),
    pilotingByUnit: new Map(),
    tonnageByUnit: new Map(),
    grid: createHexGrid({ radius: 5 }),
    botPlayer,
  };
}

describe('runInteractiveSessionAITurn unit scoping', () => {
  it('locks the requested opponent when recovered state side is missing', () => {
    let session = createMovementSession();
    Reflect.deleteProperty(session.currentState.units['opponent-1'], 'side');
    const botPlayer = {
      evaluateRetreat: jest.fn(() => null),
      playMovementPhase: jest.fn(() => null),
    } as unknown as BotPlayer;
    const context = createAIContext(
      () => session,
      (next) => {
        session = next;
      },
      botPlayer,
    );

    runInteractiveSessionAITurn(context, 'opponent-1');

    expect(session.currentState.units['opponent-1'].lockState).toBe(
      LockState.Locked,
    );
    expect(session.currentState.units['opponent-2'].lockState).toBe(
      LockState.Pending,
    );
    expect(session.currentState.units['player-1'].lockState).toBe(
      LockState.Pending,
    );
    expect(session.currentState.activationIndex).toBe(1);
  });

  it('excludes recovered same-side and unassigned units from targets', () => {
    let session = createMovementSession();
    session = {
      ...session,
      currentState: {
        ...session.currentState,
        phase: GamePhase.WeaponAttack,
      },
    };
    Reflect.deleteProperty(session.currentState.units['opponent-1'], 'side');
    Reflect.deleteProperty(session.currentState.units['opponent-2'], 'side');
    Reflect.deleteProperty(session.units[2], 'side');
    const playAttackPhase = jest.fn(() => null);
    const context = createAIContext(
      () => session,
      (next) => {
        session = next;
      },
      {
        evaluateRetreat: jest.fn(() => null),
        playAttackPhase,
      } as unknown as BotPlayer,
    );

    runInteractiveSessionAITurn(context, 'opponent-1');

    expect(playAttackPhase).toHaveBeenCalledWith(expect.anything(), [
      expect.objectContaining({ unitId: 'player-1' }),
    ]);
  });
});
