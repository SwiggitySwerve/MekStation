import { act, renderHook } from '@testing-library/react';

import type { IGameSession } from '@/types/gameplay';

import { hydrateRecoverableSessionFromMatchLog } from '@/engine/InteractiveSession.persistence';
import { GameSide, GameStatus } from '@/types/gameplay';
import { createQuickGameInstance, QuickGameStep } from '@/types/quickgame';
import {
  createGameSession,
  endGame,
  startGame,
} from '@/utils/gameplay/gameSession';

import { useQuickGameSession } from '../useQuickGameSession';

jest.mock('@/engine/InteractiveSession.persistence', () => ({
  ...jest.requireActual('@/engine/InteractiveSession.persistence'),
  hydrateRecoverableSessionFromMatchLog: jest.fn(),
}));

const recover = jest.mocked(hydrateRecoverableSessionFromMatchLog);

function session(id = 'linked-match'): IGameSession {
  return startGame(
    createGameSession(
      {
        mapRadius: 7,
        turnLimit: 30,
        victoryConditions: ['elimination'],
        optionalRules: [],
      },
      [],
      { id },
    ),
    GameSide.Player,
  );
}

function game(matchId = 'linked-match') {
  const value = createQuickGameInstance();
  value.status = GameStatus.Active;
  value.step = QuickGameStep.Playing;
  value.activeTacticalSession = { id: matchId, mode: 'interactive' };
  return value;
}

function pending<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

describe('useQuickGameSession identity-scoped recovery', () => {
  beforeEach(() => recover.mockReset());

  it('uses only a matching current session without reading storage', () => {
    const current = session();
    const currentGame = game();
    const { result } = renderHook(() =>
      useQuickGameSession(currentGame, current),
    );
    expect(result.current).toMatchObject({
      session: current,
      isLoading: false,
      error: null,
    });
    expect(recover).not.toHaveBeenCalled();
  });

  it('preserves a current auto-resolve result by its recorded creation identity without a tactical link', () => {
    const completed = endGame(
      session('auto-match'),
      GameSide.Player,
      'destruction',
    );
    const recorded = {
      ...game(),
      status: GameStatus.Completed,
      step: QuickGameStep.Results,
      activeTacticalSession: null,
      events: [...completed.events],
    };
    const { result } = renderHook(() =>
      useQuickGameSession(recorded, completed),
    );
    expect(result.current.session).toBe(completed);
    expect(result.current.error).toBeNull();
    expect(recover).not.toHaveBeenCalled();
  });

  it('does not mistake another creation event for a same-ID auto-resolve session', () => {
    const completed = endGame(
      session('auto-match'),
      GameSide.Player,
      'destruction',
    );
    const other = endGame(session('auto-match'), GameSide.Opponent, 'concede');
    const recorded = {
      ...game(),
      status: GameStatus.Completed,
      step: QuickGameStep.Results,
      activeTacticalSession: null,
      events: [...completed.events],
    };
    const { result } = renderHook(() => useQuickGameSession(recorded, other));
    expect(result.current).toMatchObject({ session: null, isLoading: false });
    expect(result.current.error).toMatch(/no recorded tactical battle/i);
    expect(recover).not.toHaveBeenCalled();
  });

  it('recovers the linked session while leaving foreign live data untouched', async () => {
    const deferred = pending<IGameSession>();
    recover.mockReturnValueOnce(deferred.promise);
    const foreign = session('foreign-match');
    const before = JSON.stringify(foreign);
    const currentGame = game();
    const { result } = renderHook(() =>
      useQuickGameSession(currentGame, foreign),
    );
    expect(result.current.isLoading).toBe(true);
    const completed = endGame(session(), GameSide.Opponent, 'concede');
    await act(async () => deferred.resolve(completed));
    expect(result.current).toMatchObject({
      session: completed,
      isLoading: false,
      error: null,
    });
    expect(recover).toHaveBeenCalledWith('linked-match');
    expect(JSON.stringify(foreign)).toBe(before);
  });

  it('ignores a result after restart changes the Quick Game identity', async () => {
    const deferred = pending<IGameSession>();
    recover.mockReturnValueOnce(deferred.promise);
    const { result, rerender } = renderHook(
      ({ currentGame }) => useQuickGameSession(currentGame, null),
      { initialProps: { currentGame: game() } },
    );
    const restarted = createQuickGameInstance();
    rerender({ currentGame: restarted });
    await act(async () =>
      deferred.resolve(endGame(session(), GameSide.Opponent, 'concede')),
    );
    expect(result.current.session).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('ignores the older link response when the next link completes first', async () => {
    const old = pending<IGameSession>();
    const next = pending<IGameSession>();
    recover.mockReturnValueOnce(old.promise).mockReturnValueOnce(next.promise);
    const firstGame = game();
    const { result, rerender } = renderHook(
      ({ currentGame }) => useQuickGameSession(currentGame, null),
      { initialProps: { currentGame: firstGame } },
    );
    rerender({
      currentGame: {
        ...firstGame,
        activeTacticalSession: { id: 'next-match', mode: 'interactive' },
      },
    });
    const nextSession = session('next-match');
    await act(async () => next.resolve(nextSession));
    await act(async () => old.resolve(session()));
    expect(result.current.session).toBe(nextSession);
  });

  it('handles an unmounted pending rejection without publishing an error', async () => {
    const deferred = pending<IGameSession>();
    recover.mockReturnValueOnce(deferred.promise);
    const errors = jest.spyOn(console, 'error').mockImplementation(() => {});
    const currentGame = game();
    const { unmount } = renderHook(() =>
      useQuickGameSession(currentGame, null),
    );
    unmount();
    await act(async () => deferred.reject(new Error('late failure')));
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });

  it('allows an explicit retry after a gated read fails', async () => {
    recover
      .mockRejectedValueOnce(
        new Error('Match log is corrupt and cannot be recovered'),
      )
      .mockResolvedValueOnce(session());
    const currentGame = game();
    const { result } = renderHook(() => useQuickGameSession(currentGame, null));
    await act(async () => {});
    expect(result.current.error).toMatch(/corrupt/);
    act(() => result.current.retry());
    await act(async () => {});
    expect(result.current).toMatchObject({ isLoading: false, error: null });
    expect(result.current.session?.id).toBe('linked-match');
    expect(recover).toHaveBeenCalledTimes(2);
  });

  it('rejects a wrong recovered identity and an active record for completed Results', async () => {
    recover.mockResolvedValueOnce(session('foreign-match'));
    const currentGame = game();
    const { result, rerender } = renderHook(
      ({ current }) => useQuickGameSession(current, null),
      { initialProps: { current: currentGame } },
    );
    await act(async () => {});
    expect(result.current.session).toBeNull();
    expect(result.current.error).toMatch(/identity/);
    recover.mockResolvedValueOnce(session());
    rerender({
      current: {
        ...currentGame,
        status: GameStatus.Completed,
        step: QuickGameStep.Results,
      },
    });
    await act(async () => {});
    expect(result.current.session).toBeNull();
    expect(result.current.error).toMatch(/no completed result/);
  });
});
