import { describe, expect, it, jest } from '@jest/globals';

import type { BotPlayer } from '@/simulation/ai/BotPlayer';
import type {
  IGameSession,
  IGameUnit,
} from '@/types/gameplay/GameSessionInterfaces';

import { GameSide, LockState } from '@/types/gameplay/GameSessionInterfaces';
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

describe('runInteractiveSessionAITurn unit scoping', () => {
  it('locks only the requested opponent activation', () => {
    let session = createMovementSession();
    const botPlayer = {
      evaluateRetreat: jest.fn(() => null),
      playMovementPhase: jest.fn(() => null),
    } as unknown as BotPlayer;
    const context: IInteractiveSessionAIContext = {
      side: GameSide.Opponent,
      getSession: () => session,
      setSession: (next) => {
        session = next;
      },
      appendAndPersistEvent: (event) => {
        session = appendEvent(session, event);
      },
      weaponsByUnit: new Map(),
      movementByUnit: new Map(),
      gunneryByUnit: new Map(),
      pilotingByUnit: new Map(),
      tonnageByUnit: new Map(),
      grid: createHexGrid({ radius: 5 }),
      botPlayer,
    };

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
});
