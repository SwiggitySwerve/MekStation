import { describe, expect, it, jest } from '@jest/globals';

import type { BotPlayer } from '@/simulation/ai/BotPlayer';
import type {
  IGameSession,
  IGameUnit,
} from '@/types/gameplay/GameSessionInterfaces';

import { GameEventType } from '@/types/gameplay';
import {
  GamePhase,
  GameSide,
  LockState,
} from '@/types/gameplay/GameSessionInterfaces';
import { MovementType } from '@/types/gameplay/HexGridInterfaces';
import {
  createPhaseChangedEvent,
  createUnitDestroyedEvent,
} from '@/utils/gameplay/gameEvents';
import {
  advancePhase,
  appendEvent,
  canAdvancePhase,
  createGameSession,
  declareMovement,
  hydrateGameSessionFromEvents,
  lockPhysicalAttack,
  rollInitiative,
  startGame,
} from '@/utils/gameplay/gameSessionCore';
import { declarePhysicalAttack } from '@/utils/gameplay/gameSessionPhysical';
import { createHexGrid } from '@/utils/gameplay/hexGrid';
import { declarePlayerWithdrawal } from '@/utils/gameplay/morale';

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
      abilities: ['melee_master'],
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

function createPhysicalSession(): IGameSession {
  let session = createMovementSession();
  const opponent = session.currentState.units['opponent-1'];
  session = declareMovement(
    session,
    opponent.id,
    opponent.position,
    { q: -2, r: 4 },
    opponent.facing,
    MovementType.Run,
    1,
    1,
  );
  session = appendEvent(
    session,
    createPhaseChangedEvent(
      session.id,
      session.events.length,
      session.currentState.turn,
      session.currentState.phase,
      GamePhase.PhysicalAttack,
    ),
  );
  return session;
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
  it.each(['ordinary', 'withdrawing', 'inactive queue head'] as const)(
    'completes a no-action physical activation (%s)',
    (mode) => {
      let session = createPhysicalSession();
      if (mode === 'withdrawing') {
        session = declarePlayerWithdrawal(session, 'opponent-1', 'south');
      }
      if (mode === 'inactive queue head') {
        session = appendEvent(
          session,
          createUnitDestroyedEvent(
            session.id,
            session.events.length,
            session.currentState.turn,
            GamePhase.PhysicalAttack,
            'opponent-1',
            'damage',
          ),
        );
      }
      const selectedUnitId =
        mode === 'inactive queue head' ? 'opponent-2' : 'opponent-1';
      const playPhysicalAttackPhase = jest.fn(() => null);
      const context = createAIContext(
        () => session,
        (next) => (session = next),
        { playPhysicalAttackPhase } as unknown as BotPlayer,
      );
      runInteractiveSessionAITurn(context, selectedUnitId);
      const state = session.currentState;
      expect(state.activationIndex).toBe(1);
      expect(playPhysicalAttackPhase).toHaveBeenCalledTimes(
        mode === 'withdrawing' ? 0 : 1,
      );
      if (mode === 'inactive queue head') {
        session = lockPhysicalAttack(session, 'player-1');
        expect(canAdvancePhase(session)).toBe(true);
      }
    },
  );

  it('recovers a Melee Master declaration, finishes, and ignores repeats', () => {
    let session = createPhysicalSession();
    session = declarePhysicalAttack(
      session,
      'opponent-1',
      'player-1',
      'punch',
      { attackerTonnage: 65, pilotingSkill: 5 },
    );
    session = hydrateGameSessionFromEvents(session.id, session.events);
    const playPhysicalAttackPhase = jest.fn(() => ({
      type: GameEventType.PhysicalAttackDeclared,
      payload: {
        attackerId: 'opponent-1',
        targetId: 'player-1',
        attackType: 'punch' as const,
      },
    }));
    const context = createAIContext(
      () => session,
      (next) => (session = next),
      { playPhysicalAttackPhase } as unknown as BotPlayer,
    );
    const eventsBefore = session.events.length;
    runInteractiveSessionAITurn(context, 'opponent-1');
    runInteractiveSessionAITurn(context, 'opponent-1');
    expect(playPhysicalAttackPhase).toHaveBeenCalledTimes(1);
    const emittedTypes = session.events
      .slice(eventsBefore)
      .map((event) => event.type);
    expect(emittedTypes).toEqual([
      GameEventType.PhysicalAttackDeclared,
      GameEventType.PhysicalAttackLocked,
    ]);
  });
});
