import type { InteractiveSession } from '@/engine/GameEngine';

import { useAnimationQueue } from '@/stores/useAnimationQueue';
import { useGameplayStore } from '@/stores/useGameplayStore';
import {
  GamePhase,
  GameSide,
  GameStatus,
  Facing,
  LockState,
  MovementType,
  type IGameSession,
} from '@/types/gameplay';

function buildInteractiveSession(): {
  readonly calls: { advancePhase: number };
  readonly interactiveSession: InteractiveSession;
  readonly session: IGameSession;
} {
  const calls = { advancePhase: 0 };
  const session: IGameSession = {
    id: 'game-1',
    createdAt: '',
    updatedAt: '',
    config: {
      mapRadius: 5,
      turnLimit: 0,
      victoryConditions: [],
      optionalRules: [],
    },
    units: [
      {
        id: 'unit-a',
        name: 'Unit A',
        side: GameSide.Player,
        unitRef: 'unit-a',
        pilotRef: 'pilot-a',
        gunnery: 4,
        piloting: 5,
      },
    ],
    events: [],
    currentState: {
      gameId: 'game-1',
      status: GameStatus.Active,
      turn: 1,
      phase: GamePhase.Movement,
      activationIndex: 0,
      units: {
        'unit-a': {
          id: 'unit-a',
          side: GameSide.Player,
          position: { q: 0, r: 0 },
          facing: Facing.North,
          heat: 0,
          movementThisTurn: MovementType.Stationary,
          hexesMovedThisTurn: 0,
          armor: {},
          structure: {},
          destroyedLocations: [],
          destroyedEquipment: [],
          ammo: {},
          pilotWounds: 0,
          pilotConscious: true,
          destroyed: false,
          lockState: LockState.Planning,
        },
      },
      turnEvents: [],
    },
  };
  const interactiveSession = {
    advancePhase: () => {
      calls.advancePhase += 1;
    },
    getSession: () => session,
    getState: () => session.currentState,
    isGameOver: () => false,
  } as unknown as InteractiveSession;

  return { calls, interactiveSession, session };
}

describe('useGameplayStore animation gate', () => {
  beforeEach(() => {
    useGameplayStore.getState().reset();
    useAnimationQueue.getState().reset();
  });

  afterEach(() => {
    useGameplayStore.getState().reset();
    useAnimationQueue.getState().reset();
  });

  it('defers phase advancement until the animation queue drains', () => {
    const { calls, interactiveSession, session } = buildInteractiveSession();
    useGameplayStore.setState({ interactiveSession, session });
    useAnimationQueue.getState().enqueue({
      id: 'move-a',
      mapId: 'map-1',
      unitId: 'unit-a',
      path: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
      ],
    });

    useGameplayStore.getState().advanceInteractivePhase();

    expect(calls.advancePhase).toBe(0);

    useAnimationQueue.getState().complete('move-a');

    expect(calls.advancePhase).toBe(1);
  });
});
