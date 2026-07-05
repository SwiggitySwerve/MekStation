import { renderHook } from '@testing-library/react';

import type { InteractiveSession } from '@/engine/GameEngine';
import type { IGameSession } from '@/types/gameplay';

import { GamePhase, GameStatus } from '@/types/gameplay';

import {
  ACTIVE_INTERACTIVE_BATTLE_UNLOAD_MESSAGE,
  resolveGameSessionRouteId,
  shouldWarnBeforeInteractiveBattleUnload,
  useInteractiveBattleBeforeUnloadWarning,
} from './GameSessionPage.lifecycle';

function makeSession(status: GameStatus = GameStatus.Active): IGameSession {
  return {
    id: 'sess_active',
    matchId: 'sess_active',
    createdAt: '2026-06-21T00:00:00.000Z',
    updatedAt: '2026-06-21T00:00:00.000Z',
    config: {
      mapRadius: 7,
      turnLimit: 30,
      victoryConditions: ['elimination'],
      optionalRules: [],
    },
    units: [],
    events: [],
    currentState: {
      gameId: 'sess_active',
      status,
      turn: 1,
      phase: GamePhase.Movement,
      activationIndex: 0,
      units: {},
      turnEvents: [],
    },
  };
}

function makeInteractiveSession(): InteractiveSession {
  return {} as InteractiveSession;
}

interface QuietBeforeUnloadCase {
  readonly label: string;
  readonly routeId?: string;
  readonly isSpectatorMode?: boolean;
  readonly status?: GameStatus;
  readonly session?: IGameSession | null;
  readonly interactiveSession?: InteractiveSession | null;
}

const quietBeforeUnloadCases: readonly QuietBeforeUnloadCase[] = [
  { label: 'demo route', routeId: 'demo' },
  { label: 'spectator mode', isSpectatorMode: true },
  { label: 'completed match', status: GameStatus.Completed },
  { label: 'no session', session: null },
  { label: 'no interactive session', interactiveSession: null },
];

describe('interactive battle beforeunload warning', () => {
  let addSpy: jest.SpyInstance;
  let removeSpy: jest.SpyInstance;

  beforeEach(() => {
    addSpy = jest.spyOn(window, 'addEventListener');
    removeSpy = jest.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('registers a warning for active non-demo interactive sessions', () => {
    const { unmount } = renderHook(() =>
      useInteractiveBattleBeforeUnloadWarning(true),
    );
    const beforeUnloadCall = addSpy.mock.calls.find(
      ([type]) => type === 'beforeunload',
    );
    const handler = beforeUnloadCall?.[1] as
      | ((event: BeforeUnloadEvent) => string)
      | undefined;
    expect(handler).toBeDefined();

    const event = {
      preventDefault: jest.fn(),
      returnValue: '',
    } as unknown as BeforeUnloadEvent;
    expect(handler?.(event)).toBe(ACTIVE_INTERACTIVE_BATTLE_UNLOAD_MESSAGE);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.returnValue).toBe(ACTIVE_INTERACTIVE_BATTLE_UNLOAD_MESSAGE);

    unmount();
    expect(removeSpy).toHaveBeenCalledWith('beforeunload', handler);
  });

  it('does not register when the guard predicate is false', () => {
    renderHook(() => useInteractiveBattleBeforeUnloadWarning(false));

    expect(addSpy).not.toHaveBeenCalledWith(
      'beforeunload',
      expect.any(Function),
    );
  });

  it.each(quietBeforeUnloadCases)('stays quiet for $label', (overrides) => {
    const session =
      'session' in overrides
        ? (overrides.session ?? null)
        : makeSession(overrides.status ?? GameStatus.Active);
    const interactiveSession =
      'interactiveSession' in overrides
        ? (overrides.interactiveSession ?? null)
        : makeInteractiveSession();

    expect(
      shouldWarnBeforeInteractiveBattleUnload({
        routeId: overrides.routeId ?? 'sess_active',
        session,
        interactiveSession,
        isSpectatorMode: overrides.isSpectatorMode ?? false,
      }),
    ).toBe(false);
  });
});

describe('game session route id resolution', () => {
  it('uses concrete router query values first', () => {
    expect(
      resolveGameSessionRouteId('sess-active', '/gameplay/games/[id]'),
    ).toBe('sess-active');
  });

  it('falls back to the concrete browser path when production query keeps the placeholder', () => {
    expect(
      resolveGameSessionRouteId('[id]', '/gameplay/games/sess-active'),
    ).toBe('sess-active');
  });

  it('ignores nested game subroutes and missing ids', () => {
    expect(
      resolveGameSessionRouteId('[id]', '/gameplay/games/sess-active/replay'),
    ).toBeNull();
    expect(resolveGameSessionRouteId(undefined, '/gameplay/games')).toBeNull();
  });
});
