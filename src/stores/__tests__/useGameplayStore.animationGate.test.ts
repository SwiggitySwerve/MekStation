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
    setReducedMotion(false);
  });

  afterEach(() => {
    useGameplayStore.getState().reset();
    useAnimationQueue.getState().reset();
    setReducedMotion(false);
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

  it('waits for sequential queued movement animations to fully drain', () => {
    const { calls, interactiveSession, session } = buildInteractiveSession();
    useGameplayStore.setState({ interactiveSession, session });
    useAnimationQueue.getState().enqueue({
      id: 'move-a',
      mapId: 'map-1',
      unitId: 'unit-a',
      kind: 'movement',
      path: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
      ],
    });
    useAnimationQueue.getState().enqueue({
      id: 'move-b',
      mapId: 'map-1',
      unitId: 'unit-b',
      kind: 'movement',
      path: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
      ],
    });

    useGameplayStore.getState().advanceInteractivePhase();

    expect(calls.advancePhase).toBe(0);

    useAnimationQueue.getState().complete('move-a');

    expect(calls.advancePhase).toBe(0);
    expect(useAnimationQueue.getState().active.map((item) => item.id)).toEqual([
      'move-b',
    ]);

    useAnimationQueue.getState().complete('move-b');

    expect(calls.advancePhase).toBe(1);
  });

  it('bypasses the gate when reduced motion is enabled', () => {
    setReducedMotion(true);
    const { calls, interactiveSession, session } = buildInteractiveSession();
    useGameplayStore.setState({ interactiveSession, session });
    useAnimationQueue.getState().enqueue({
      id: 'move-a',
      mapId: 'map-1',
      unitId: 'unit-a',
      kind: 'movement',
      path: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
      ],
    });

    useGameplayStore.getState().advanceInteractivePhase();

    expect(calls.advancePhase).toBe(1);
  });
});

function setReducedMotion(matches: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn((query: string) => {
      return {
        matches: query === '(prefers-reduced-motion: reduce)' ? matches : false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      } as MediaQueryList;
    }),
  });
}
